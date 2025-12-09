import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { uniqueId } from "tldraw";
import { NameModal } from "../components/NameModal";
import { Whiteboard } from "../components/Whiteboard";

export const Route = createFileRoute("/")({
	component: Index,
});

// Get room ID from URL hash
function getRoomIdFromHash(): string | null {
	const hash = window.location.hash.slice(1); // Remove the #
	return hash || null;
}

// Set room ID in URL hash
function setRoomIdInHash(roomId: string): void {
	window.location.hash = roomId;
}

// Generate a random warm/pastel color for user cursor
function generateUserColor(): string {
	const hue = Math.floor(Math.random() * 360);
	return `hsl(${hue}, 70%, 55%)`;
}

function Index() {
	const [userName, setUserName] = useState<string | null>(null);
	const [roomId, setRoomId] = useState<string | null>(null);
	const [userColor] = useState(() => generateUserColor());
	const userId = useMemo(() => uniqueId(), []);

	// Get room ID from URL if present (for shared links)
	const urlRoomId = getRoomIdFromHash();

	function handleJoin(name: string, room: string) {
		setUserName(name);
		setRoomId(room);
		setRoomIdInHash(room);
	}

	// Show name/room modal if user hasn't joined yet
	if (!userName || !roomId) {
		return <NameModal onSubmit={handleJoin} defaultRoomId={urlRoomId || undefined} />;
	}

	return (
		<Whiteboard
			roomId={roomId}
			userName={userName}
			userColor={userColor}
			userId={userId}
		/>
	);
}

export default Index;
