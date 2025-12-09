import { joinRoom, type Room } from "trystero/nostr";
import type { Editor, TLRecord } from "tldraw";

const APP_ID = "hats-whiteboard";

// Nostr relays for P2P signaling
// These are public relays that tend to be more accessible on restricted networks
const NOSTR_RELAYS = [
	"wss://relay.damus.io",
	"wss://nos.lol",
	"wss://relay.nostr.band",
	"wss://nostr.wine",
];

interface PeerInfo {
	id: string;
	name: string;
	color: string;
}

interface StoreChanges {
	added: TLRecord[];
	updated: TLRecord[];
	removed: string[];
}

export type PresenceData = {
	oderId: string;
	userName: string;
	color: string;
	cursor: { x: number; y: number } | null;
	chatMessage: string | null;
	currentPageId: string;
};

export interface P2PSync {
	room: Room | null;
	connect: (editor: Editor) => void;
	broadcastPresence: (presence: PresenceData) => void;
	onPresenceUpdate: (
		callback: (presence: PresenceData, peerId: string) => void,
	) => void;
	disconnect: () => void;
	getPeerCount: () => number;
	onPeerJoin: (callback: (peerId: string) => void) => void;
	onPeerLeave: (callback: (peerId: string) => void) => void;
}

// Record types that should be synced between users
const SYNCED_RECORD_TYPES = new Set(["shape", "page", "asset"]);

// Check if a record should be synced
function shouldSyncRecord(record: TLRecord): boolean {
	return SYNCED_RECORD_TYPES.has(record.typeName);
}

export function createP2PSync(roomId: string, _userInfo: PeerInfo): P2PSync {
	// State
	let room: Room | null = null;
	let editor: Editor | null = null;
	let hasReceivedInitialState = false;
	let storeListenerCleanup: (() => void) | null = null;

	// Flag to prevent sync loops
	let isApplyingRemoteChanges = false;

	// Callbacks
	const peerJoinCallbacks: ((peerId: string) => void)[] = [];
	const peerLeaveCallbacks: ((peerId: string) => void)[] = [];
	const presenceCallbacks: ((presence: PresenceData, peerId: string) => void)[] = [];

	// Action senders
	let sendStateRequest: ((data: any, peerId?: string) => void) | null = null;
	let sendUpdate: ((data: any) => void) | null = null;
	let sendPresence: ((data: any) => void) | null = null;

	function setupRoom() {
		if (room) return;

		console.log("[P2P] Joining room:", roomId);
		console.log("[P2P] Using Nostr relays:", NOSTR_RELAYS);

		try {
			room = joinRoom({ appId: APP_ID, relayUrls: NOSTR_RELAYS }, roomId);
		} catch (err) {
			console.error("[P2P] Failed to join room:", err);
			return;
		}

		const [_sendStateRequest, onStateRequest] = room.makeAction<any>("req-state");
		const [_sendFullState, onFullState] = room.makeAction<any>("full-state");
		const [_sendUpdate, onUpdate] = room.makeAction<any>("update");
		const [_sendPresence, onPresence] = room.makeAction<any>("presence");

		sendStateRequest = _sendStateRequest;
		sendUpdate = _sendUpdate;
		sendPresence = _sendPresence;

		// When a peer requests state, send only syncable records (shapes, pages, assets)
		onStateRequest((_, peerId) => {
			console.log("[P2P] Received state request from:", peerId);
			if (editor) {
				const snapshot = editor.store.getStoreSnapshot();

				// Filter to only include syncable records
				const filteredStore: Record<string, TLRecord> = {};
				for (const [id, record] of Object.entries(snapshot.store)) {
					if (shouldSyncRecord(record as TLRecord)) {
						filteredStore[id] = record as TLRecord;
					}
				}

				const filteredSnapshot = {
					store: filteredStore,
					schema: snapshot.schema,
				};

				console.log("[P2P] Sending filtered state, records:", Object.keys(filteredStore).length);
				_sendFullState(JSON.stringify(filteredSnapshot), peerId);
			}
		});

		// When we receive state, apply only the syncable records (preserving local camera/instance)
		onFullState((snapshotStr: string, peerId: string) => {
			console.log("[P2P] Received full state from:", peerId);
			if (editor) {
				try {
					const snapshot = JSON.parse(snapshotStr);
					const records = Object.values(snapshot.store) as TLRecord[];

					console.log("[P2P] Applying", records.length, "records from snapshot");

					isApplyingRemoteChanges = true;

					// Apply records individually using mergeRemoteChanges
					// This preserves local camera, instance, and other local-only records
					editor.store.mergeRemoteChanges(() => {
						for (const record of records) {
							if (shouldSyncRecord(record)) {
								editor!.store.put([record]);
							}
						}
					});

					isApplyingRemoteChanges = false;
					hasReceivedInitialState = true;
					console.log("[P2P] Snapshot applied successfully");
				} catch (err) {
					isApplyingRemoteChanges = false;
					console.error("[P2P] Failed to apply snapshot:", err);
				}
			}
		});

		// Incremental updates from peers
		onUpdate((changesStr: string, peerId: string) => {
			if (!editor) return;

			try {
				const changes = JSON.parse(changesStr) as StoreChanges;

				if (changes.added.length === 0 && changes.updated.length === 0 && changes.removed.length === 0) {
					return;
				}

				console.log("[P2P] Applying from", peerId, "- added:", changes.added.length, "updated:", changes.updated.length, "removed:", changes.removed.length);

				isApplyingRemoteChanges = true;

				editor.store.mergeRemoteChanges(() => {
					for (const record of changes.added) {
						if (shouldSyncRecord(record)) {
							editor!.store.put([record]);
						}
					}
					for (const record of changes.updated) {
						if (shouldSyncRecord(record)) {
							editor!.store.put([record]);
						}
					}
					for (const id of changes.removed) {
						// Only remove if it's a syncable type
						if (id.startsWith("shape:") || id.startsWith("page:") || id.startsWith("asset:")) {
							editor!.store.remove([id as TLRecord["id"]]);
						}
					}
				});

				isApplyingRemoteChanges = false;
			} catch (err) {
				isApplyingRemoteChanges = false;
				console.error("[P2P] Failed to apply update:", err);
			}
		});

		// Presence updates
		onPresence((presenceStr: string, peerId: string) => {
			try {
				const presence = JSON.parse(presenceStr) as PresenceData;
				for (const callback of presenceCallbacks) {
					callback(presence, peerId);
				}
			} catch (err) {
				console.error("[P2P] Failed to parse presence:", err);
			}
		});

		// Handle peer joining
		room.onPeerJoin((peerId) => {
			console.log("[P2P] Peer joined:", peerId);

			if (editor && !hasReceivedInitialState) {
				console.log("[P2P] Requesting state from peer:", peerId);
				_sendStateRequest({}, peerId);
			}

			for (const callback of peerJoinCallbacks) {
				callback(peerId);
			}
		});

		// Handle peer leaving
		room.onPeerLeave((peerId) => {
			console.log("[P2P] Peer left:", peerId);
			for (const callback of peerLeaveCallbacks) {
				callback(peerId);
			}
		});
	}

	return {
		get room() {
			return room;
		},

		connect(e: Editor) {
			editor = e;
			console.log("[P2P] Editor connected");

			setupRoom();

			// Listen for local changes and broadcast them
			storeListenerCleanup = editor.store.listen((entry) => {
				if (isApplyingRemoteChanges) {
					return;
				}

				const addedKeys = Object.keys(entry.changes.added);
				const updatedKeys = Object.keys(entry.changes.updated);
				const removedKeys = Object.keys(entry.changes.removed);

				if (addedKeys.length === 0 && updatedKeys.length === 0 && removedKeys.length === 0) {
					return;
				}

				// Only sync shapes, pages, and assets
				const addedRecords = Object.values(entry.changes.added).filter(shouldSyncRecord);
				const updatedRecords = Object.values(entry.changes.updated)
					.map(([_before, after]) => after)
					.filter(shouldSyncRecord);
				const removedIds = removedKeys.filter(
					(id) => id.startsWith("shape:") || id.startsWith("page:") || id.startsWith("asset:")
				);

				if (addedRecords.length === 0 && updatedRecords.length === 0 && removedIds.length === 0) {
					return;
				}

				const changes: StoreChanges = {
					added: addedRecords,
					updated: updatedRecords,
					removed: removedIds,
				};

				console.log("[P2P] Broadcasting - added:", changes.added.length, "updated:", changes.updated.length, "removed:", changes.removed.length);

				if (sendUpdate) {
					sendUpdate(JSON.stringify(changes));
				}
			}, { source: "user" });

			// Request state from existing peers
			setTimeout(() => {
				if (!room) return;
				const peers = room.getPeers();
				const peerIds = Object.keys(peers);
				console.log("[P2P] Peers after 3s:", peerIds);

				if (peerIds.length > 0 && !hasReceivedInitialState && sendStateRequest) {
					console.log("[P2P] Requesting initial state");
					sendStateRequest({});
				} else if (peerIds.length === 0) {
					console.log("[P2P] No peers yet, waiting...");
					setTimeout(() => {
						if (!room) return;
						const currentPeers = Object.keys(room.getPeers());
						if (!hasReceivedInitialState && currentPeers.length === 0) {
							console.log("[P2P] No peers, starting blank");
							hasReceivedInitialState = true;
						} else if (!hasReceivedInitialState && currentPeers.length > 0 && sendStateRequest) {
							console.log("[P2P] Found peers, requesting state");
							sendStateRequest({});
						}
					}, 4000);
				}
			}, 3000);
		},

		broadcastPresence(presence: PresenceData) {
			if (sendPresence) {
				sendPresence(JSON.stringify(presence));
			}
		},

		onPresenceUpdate(callback: (presence: PresenceData, peerId: string) => void) {
			presenceCallbacks.push(callback);
		},

		disconnect() {
			console.log("[P2P] Disconnecting");
			if (storeListenerCleanup) {
				storeListenerCleanup();
			}
			if (room) {
				room.leave();
				room = null;
			}
		},

		getPeerCount() {
			return room ? Object.keys(room.getPeers()).length : 0;
		},

		onPeerJoin(callback: (peerId: string) => void) {
			peerJoinCallbacks.push(callback);
		},

		onPeerLeave(callback: (peerId: string) => void) {
			peerLeaveCallbacks.push(callback);
		},
	};
}
