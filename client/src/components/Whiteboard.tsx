import { useState, useEffect, useCallback, useMemo } from "react";
import { Tldraw, type Editor } from "tldraw";
import { createSupabaseSync, type SupabaseSync } from "../lib/supabaseSync";
import { useSupabasePresence } from "../lib/useSupabasePresence";
import "tldraw/tldraw.css";
import "./Whiteboard.css";

interface WhiteboardProps {
	roomId: string;
	userName: string;
	userColor: string;
	userId: string;
}

export function Whiteboard({
	roomId,
	userName,
	userColor,
	userId,
}: WhiteboardProps) {
	const [editor, setEditor] = useState<Editor | null>(null);
	const [isConnecting, setIsConnecting] = useState(true);
	const [peerCount, setPeerCount] = useState(0);
	const [connectionStatus, setConnectionStatus] = useState<
		"connecting" | "connected"
	>("connecting");

	// Create Supabase sync instance
	const supabaseSync = useMemo<SupabaseSync | null>(() => {
		if (!roomId) return null;
		return createSupabaseSync(roomId, { id: userId, name: userName, color: userColor });
	}, [roomId, userId, userName, userColor]);

	// Handle tldraw mount - NOTE: onMount cannot be async!
	const handleMount = useCallback(
		(e: Editor) => {
			setEditor(e);
			if (supabaseSync) {
				// Connect asynchronously but don't await in the callback
				supabaseSync.connect(e).then(() => {
					setIsConnecting(false);
					setConnectionStatus("connected");
				});
			}
		},
		[supabaseSync],
	);

	// Track peer count and connection status
	useEffect(() => {
		if (!supabaseSync) return;

		const updatePeerCount = () => {
			const count = supabaseSync.getPeerCount();
			setPeerCount(count);
		};

		supabaseSync.onPeerJoin((oderId) => {
			console.log("Peer joined:", oderId);
			updatePeerCount();
		});

		supabaseSync.onPeerLeave((oderId) => {
			console.log("Peer left:", oderId);
			updatePeerCount();
		});

		// Check peer count after initial connection
		const timeout = setTimeout(() => {
			updatePeerCount();
		}, 1000);

		return () => {
			clearTimeout(timeout);
			supabaseSync.disconnect();
		};
	}, [supabaseSync]);

	// Sync presence
	useSupabasePresence(editor, supabaseSync, {
		id: userId,
		name: userName,
		color: userColor,
	});

	return (
		<div style={{ position: 'absolute', inset: 0 }}>
			<Tldraw onMount={handleMount} />

			{/* Status bar - positioned independently, small footprint */}
			<div className="status-bar">
				<div className="room-info">
					<span className="room-label">Room:</span>
					<span className="room-id">{roomId}</span>
				</div>
				<div className="peer-info">
					<span
						className={`status-dot ${connectionStatus === "connected" ? (peerCount > 0 ? "connected" : "alone") : ""}`}
					/>
					{connectionStatus === "connected" ? (
						peerCount > 0 ? (
							<span>
								{peerCount} other user{peerCount !== 1 ? "s" : ""} connected
							</span>
						) : (
							<span>No one else here yet</span>
						)
					) : (
						<span>Connecting...</span>
					)}
				</div>
			</div>

			{/* Connecting overlay - only shown during initial connection */}
			{isConnecting && (
				<div className="connecting-overlay">
					<div className="connecting-content">
						<div className="connecting-spinner" />
						<p>Connecting to room...</p>
						<p className="connecting-hint">
							Loading board from Supabase
						</p>
					</div>
				</div>
			)}
		</div>
	);
}
