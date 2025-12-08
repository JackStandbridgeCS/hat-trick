import { useEffect, useRef } from "react";
import {
	type Editor,
	InstancePresenceRecordType,
	type TLInstancePresence,
	TLINSTANCE_ID,
} from "tldraw";
import type { P2PSync, PresenceData } from "./p2pSync";

interface UserInfo {
	id: string;
	name: string;
	color: string;
}

export function useP2PPresence(
	editor: Editor | null,
	p2pSync: P2PSync | null,
	userInfo: UserInfo,
) {
	const presenceUpdateCallbackSet = useRef(false);

	useEffect(() => {
		if (!editor || !p2pSync) return;

		// Broadcast our presence periodically (throttled to reduce interference with gestures)
		const interval = setInterval(() => {
			// Don't update presence during camera movements to avoid interfering with gestures
			if (editor.inputs.isPinching || editor.inputs.isPanning) {
				return;
			}

			const instance = editor.store.get(TLINSTANCE_ID);
			if (!instance) return;

			const pointer = editor.inputs.currentScreenPoint;
			const pagePoint = editor.screenToPage(pointer);

			const presenceData: PresenceData = {
				oderId: userInfo.id,
				userName: userInfo.name,
				color: userInfo.color,
				cursor: pagePoint ? { x: pagePoint.x, y: pagePoint.y } : null,
				chatMessage: null,
				currentPageId: instance.currentPageId,
			};

			p2pSync.broadcastPresence(presenceData);
		}, 150); // ~7fps cursor updates, throttled during gestures

		// Set up listener for other users' presence (only once)
		if (!presenceUpdateCallbackSet.current) {
			p2pSync.onPresenceUpdate((presence: PresenceData, peerId: string) => {
				if (!editor) return;

				console.log("[Presence] Received from:", peerId, presence);

				try {
					// Create a presence record for this peer
					const presenceId = InstancePresenceRecordType.createId(peerId);

					// Get the current instance to extract required fields
					const instance = editor.store.get(TLINSTANCE_ID);
					if (!instance) return;

					const existingPresence = editor.store.get(presenceId);

					const presenceRecord: TLInstancePresence = {
						id: presenceId,
						typeName: "instance_presence",
						userId: presence.oderId,
						userName: presence.userName,
						color: presence.color,
						cursor: presence.cursor
							? {
									x: presence.cursor.x,
									y: presence.cursor.y,
									type: "default",
									rotation: 0,
								}
							: existingPresence?.cursor ?? {
									x: 0,
									y: 0,
									type: "default",
									rotation: 0,
								},
						currentPageId:
							presence.currentPageId as TLInstancePresence["currentPageId"],
						chatMessage: presence.chatMessage ?? "",
						brush: null,
						scribbles: [],
						screenBounds: { x: 0, y: 0, w: 1920, h: 1080 },
						followingUserId: null,
						meta: {},
						lastActivityTimestamp: Date.now(),
						camera: { x: 0, y: 0, z: 1 },
						selectedShapeIds: [],
					};

					console.log("[Presence] Creating record for:", peerId);

					editor.store.mergeRemoteChanges(() => {
						editor.store.put([presenceRecord]);
					});
				} catch (error) {
					console.error("[Presence] Error updating peer presence:", error);
				}
			});
			presenceUpdateCallbackSet.current = true;
		}

		return () => {
			clearInterval(interval);
		};
	}, [editor, p2pSync, userInfo]);
}
