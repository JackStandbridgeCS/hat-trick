import { useState, useEffect, useCallback, useMemo } from "react";
import { Tldraw, type Editor } from "tldraw";
import { createP2PSync, type P2PSync } from "../lib/p2pSync";
import { useP2PPresence } from "../lib/useP2PPresence";
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
		"connecting" | "connected" | "waiting"
	>("connecting");

	// Create P2P sync instance
	const p2pSync = useMemo<P2PSync | null>(() => {
		if (!roomId) return null;
		return createP2PSync(roomId, { id: userId, name: userName, color: userColor });
	}, [roomId, userId, userName, userColor]);

	// Handle tldraw mount
	const handleMount = useCallback(
		(e: Editor) => {
			setEditor(e);
			if (p2pSync) {
				p2pSync.connect(e);
				setIsConnecting(false);
				setConnectionStatus("connected");
			}
		},
		[p2pSync],
	);

	// Track peer count and connection status
	useEffect(() => {
		if (!p2pSync) return;

		const updatePeerCount = () => {
			const count = p2pSync.getPeerCount();
			setPeerCount(count);
		};

		p2pSync.onPeerJoin((peerId) => {
			console.log("Peer joined:", peerId);
			updatePeerCount();
		});

		p2pSync.onPeerLeave((peerId) => {
			console.log("Peer left:", peerId);
			updatePeerCount();
		});

		const timeout = setTimeout(() => {
			updatePeerCount();
			if (p2pSync.getPeerCount() === 0) {
				setConnectionStatus("waiting");
			}
		}, 3000);

		return () => {
			clearTimeout(timeout);
			p2pSync.disconnect();
		};
	}, [p2pSync]);

	// Sync presence
	useP2PPresence(editor, p2pSync, {
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
						className={`status-dot ${peerCount > 0 ? "connected" : "alone"}`}
					/>
					{peerCount > 0 ? (
						<span>
							{peerCount} other user{peerCount !== 1 ? "s" : ""} connected
						</span>
					) : connectionStatus === "waiting" ? (
						<span>No one else here yet</span>
					) : (
						<span>Searching for peers...</span>
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
							Looking for peers via BitTorrent DHT
						</p>
					</div>
				</div>
			)}
		</div>
	);
}
