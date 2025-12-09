import { Tldraw } from "tldraw";
import { useSyncDemo } from "@tldraw/sync";
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
	// Use tldraw's official sync - handles everything automatically!
	const store = useSyncDemo({
		roomId: roomId,
		userInfo: {
			id: userId,
			name: userName,
			color: userColor,
		},
	});

	return (
		<div style={{ position: "absolute", inset: 0 }}>
			<Tldraw store={store} />

			{/* Status bar */}
			<div className="status-bar">
				<div className="room-info">
					<span className="room-label">Room:</span>
					<span className="room-id">{roomId}</span>
				</div>
				<div className="peer-info">
					<span className="status-dot connected" />
					<span>Connected via tldraw sync</span>
				</div>
			</div>
		</div>
	);
}
