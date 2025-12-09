import { supabase } from "./supabase";
import type {
	RealtimeChannel,
	RealtimePresenceState,
} from "@supabase/supabase-js";
import type { Editor, TLRecord, TLStoreSnapshot } from "tldraw";

// Record types that should be synced between users
const SYNCED_RECORD_TYPES = new Set(["shape", "page", "asset"]);

function shouldSyncRecord(record: TLRecord): boolean {
	return SYNCED_RECORD_TYPES.has(record.typeName);
}

interface StoreChanges {
	added: TLRecord[];
	updated: TLRecord[];
	removed: string[];
}

export interface PresenceData {
	oderId: string;
	userName: string;
	color: string;
	cursor: { x: number; y: number } | null;
	currentPageId: string;
}

interface UserInfo {
	id: string;
	name: string;
	color: string;
}

export interface SupabaseSync {
	connect: (editor: Editor) => Promise<void>;
	broadcastPresence: (presence: PresenceData) => void;
	onPresenceUpdate: (
		callback: (presence: PresenceData, oderId: string) => void,
	) => void;
	disconnect: () => void;
	getPeerCount: () => number;
	onPeerJoin: (callback: (oderId: string) => void) => void;
	onPeerLeave: (callback: (oderId: string) => void) => void;
}

export function createSupabaseSync(
	roomId: string,
	userInfo: UserInfo,
): SupabaseSync {
	let channel: RealtimeChannel | null = null;
	let editor: Editor | null = null;
	let storeListenerCleanup: (() => void) | null = null;
	let isApplyingRemoteChanges = false;
	let peerCount = 0;

	// Callbacks
	const peerJoinCallbacks: ((oderId: string) => void)[] = [];
	const peerLeaveCallbacks: ((oderId: string) => void)[] = [];
	const presenceCallbacks: ((
		presence: PresenceData,
		oderId: string,
	) => void)[] = [];

	// Load room state from database
	async function loadRoomState(): Promise<TLStoreSnapshot | null> {
		try {
			const { data, error } = await supabase
				.from("rooms")
				.select("snapshot")
				.eq("id", roomId)
				.single();

			if (error) {
				if (error.code === "PGRST116") {
					// Room doesn't exist yet
					console.log("[Supabase] Room not found, will create on first change");
					return null;
				}
				if (error.code === "42P01" || error.message?.includes("relation") || error.message?.includes("does not exist")) {
					// Table doesn't exist - user hasn't run the schema SQL
					console.warn("[Supabase] The 'rooms' table doesn't exist. Please run server/supabase/schema.sql in your Supabase SQL Editor.");
					return null;
				}
				console.error("[Supabase] Error loading room:", error.message || error);
				return null;
			}

			return data?.snapshot as TLStoreSnapshot | null;
		} catch (err) {
			console.error("[Supabase] Exception loading room:", err);
			return null;
		}
	}

	// Save room state to database
	async function saveRoomState(snapshot: TLStoreSnapshot) {
		const { error } = await supabase.from("rooms").upsert(
			{
				id: roomId,
				snapshot: snapshot,
			},
			{ onConflict: "id" },
		);

		if (error) {
			console.error("[Supabase] Error saving room:", error);
		}
	}

	// Debounced save to avoid too many database writes
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;
	function debouncedSave() {
		if (saveTimeout) {
			clearTimeout(saveTimeout);
		}
		saveTimeout = setTimeout(() => {
			if (editor) {
				const snapshot = editor.store.getStoreSnapshot();
				// Filter to only syncable records
				const filteredStore: Record<string, TLRecord> = {};
				for (const [id, record] of Object.entries(snapshot.store)) {
					if (shouldSyncRecord(record as TLRecord)) {
						filteredStore[id] = record as TLRecord;
					}
				}
				saveRoomState({
					...snapshot,
					store: filteredStore,
				});
			}
		}, 1000); // Save after 1 second of inactivity
	}

	return {
		async connect(e: Editor) {
			editor = e;
			console.log("[Supabase] Connecting to room:", roomId);

			// Load existing room state
			const existingState = await loadRoomState();
			if (existingState && Object.keys(existingState.store || {}).length > 0) {
				console.log(
					"[Supabase] Loading existing state:",
					Object.keys(existingState.store).length,
					"records",
				);
				isApplyingRemoteChanges = true;
				editor.store.mergeRemoteChanges(() => {
					for (const record of Object.values(existingState.store)) {
						if (shouldSyncRecord(record as TLRecord)) {
							editor!.store.put([record as TLRecord]);
						}
					}
				});
				isApplyingRemoteChanges = false;
			}

			// Set up realtime channel for this room
			channel = supabase.channel(`room:${roomId}`, {
				config: {
					broadcast: { self: false }, // Don't receive our own broadcasts
					presence: { key: userInfo.id },
				},
			});

			// Handle broadcast messages (store updates from other users)
			channel.on("broadcast", { event: "store-update" }, (payload) => {
				if (!editor || isApplyingRemoteChanges) return;

				const changes = payload.payload as StoreChanges;
				console.log(
					"[Supabase] Received update - added:",
					changes.added.length,
					"updated:",
					changes.updated.length,
					"removed:",
					changes.removed.length,
				);

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
						if (
							id.startsWith("shape:") ||
							id.startsWith("page:") ||
							id.startsWith("asset:")
						) {
							editor!.store.remove([id as TLRecord["id"]]);
						}
					}
				});
				isApplyingRemoteChanges = false;
			});

			// Handle presence updates (cursors)
			channel.on("presence", { event: "sync" }, () => {
				const state = channel!.presenceState() as RealtimePresenceState<{
					presence: PresenceData;
				}>;
				const newPeerCount = Object.keys(state).length - 1; // Exclude self

				// Notify about peer count changes
				if (newPeerCount > peerCount) {
					for (const key of Object.keys(state)) {
						if (key !== userInfo.id) {
							for (const callback of peerJoinCallbacks) {
								callback(key);
							}
						}
					}
				} else if (newPeerCount < peerCount) {
					for (const callback of peerLeaveCallbacks) {
						callback("unknown"); // We don't track who left in this simple implementation
					}
				}
				peerCount = newPeerCount;

				// Process all presence data
				for (const [key, presences] of Object.entries(state)) {
					if (key !== userInfo.id && presences.length > 0) {
						const presenceData = (presences[0] as { presence: PresenceData })
							.presence;
						for (const callback of presenceCallbacks) {
							callback(presenceData, key);
						}
					}
				}
			});

			// Subscribe to the channel
			await channel.subscribe(async (status) => {
				if (status === "SUBSCRIBED") {
					console.log("[Supabase] Connected to realtime channel");

					// Track our presence
					await channel!.track({
						presence: {
							oderId: userInfo.id,
							userName: userInfo.name,
							color: userInfo.color,
							cursor: null,
							currentPageId: editor?.getCurrentPageId() || "page:page",
						} satisfies PresenceData,
					});
				}
			});

			// Listen for local changes and broadcast them
			storeListenerCleanup = editor.store.listen(
				(entry) => {
					if (isApplyingRemoteChanges || !channel) return;

					const addedKeys = Object.keys(entry.changes.added);
					const updatedKeys = Object.keys(entry.changes.updated);
					const removedKeys = Object.keys(entry.changes.removed);

					if (
						addedKeys.length === 0 &&
						updatedKeys.length === 0 &&
						removedKeys.length === 0
					) {
						return;
					}

					// Filter to only syncable records
					const addedRecords =
						Object.values(entry.changes.added).filter(shouldSyncRecord);
					const updatedRecords = Object.values(entry.changes.updated)
						.map(([_before, after]) => after)
						.filter(shouldSyncRecord);
					const removedIds = removedKeys.filter(
						(id) =>
							id.startsWith("shape:") ||
							id.startsWith("page:") ||
							id.startsWith("asset:"),
					);

					if (
						addedRecords.length === 0 &&
						updatedRecords.length === 0 &&
						removedIds.length === 0
					) {
						return;
					}

					const changes: StoreChanges = {
						added: addedRecords,
						updated: updatedRecords,
						removed: removedIds,
					};

					console.log(
						"[Supabase] Broadcasting - added:",
						changes.added.length,
						"updated:",
						changes.updated.length,
						"removed:",
						changes.removed.length,
					);

					// Broadcast to other users
					channel.send({
						type: "broadcast",
						event: "store-update",
						payload: changes,
					});

					// Also save to database (debounced)
					debouncedSave();
				},
				{ source: "user" },
			);
		},

		broadcastPresence(presence: PresenceData) {
			if (channel) {
				channel.track({ presence });
			}
		},

		onPresenceUpdate(callback: (presence: PresenceData, oderId: string) => void) {
			presenceCallbacks.push(callback);
		},

		disconnect() {
			console.log("[Supabase] Disconnecting");
			if (saveTimeout) {
				clearTimeout(saveTimeout);
			}
			if (storeListenerCleanup) {
				storeListenerCleanup();
			}
			if (channel) {
				supabase.removeChannel(channel);
				channel = null;
			}
		},

		getPeerCount() {
			return peerCount;
		},

		onPeerJoin(callback: (oderId: string) => void) {
			peerJoinCallbacks.push(callback);
		},

		onPeerLeave(callback: (oderId: string) => void) {
			peerLeaveCallbacks.push(callback);
		},
	};
}

