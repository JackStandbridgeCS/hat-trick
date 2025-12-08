import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { uniqueId } from "tldraw";
import { NameModal } from "../components/NameModal";
import { Whiteboard } from "../components/Whiteboard";

export const Route = createFileRoute("/")({
	component: Index,
});

// Generate a random room ID
function generateRoomId(): string {
	const adjectives = ["happy", "swift", "bright", "calm", "wild", "cool", "warm", "bold"];
	const nouns = ["panda", "eagle", "river", "cloud", "star", "moon", "wave", "tree"];
	const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
	const noun = nouns[Math.floor(Math.random() * nouns.length)];
	const num = Math.floor(Math.random() * 1000);
	return `${adj}-${noun}-${num}`;
}

// Get room ID from URL hash or generate a new one
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

	// Initialize room ID from URL or generate new one
	useEffect(() => {
		let id = getRoomIdFromHash();
		if (!id) {
			id = generateRoomId();
			setRoomIdInHash(id);
		}
		setRoomId(id);

		// Listen for hash changes (e.g., user manually edits URL)
		const handleHashChange = () => {
			const newId = getRoomIdFromHash();
			if (newId && newId !== roomId) {
				// Reload to join new room
				window.location.reload();
			}
		};

		window.addEventListener("hashchange", handleHashChange);
		return () => window.removeEventListener("hashchange", handleHashChange);
	}, [roomId]);

	function handleNameSubmit(name: string) {
		setUserName(name);
	}

	// Show loading until we have room ID
	if (!roomId) {
		return null;
	}

	// Show name modal if user hasn't entered name
	if (!userName) {
		return <NameModal onSubmit={handleNameSubmit} />;
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
