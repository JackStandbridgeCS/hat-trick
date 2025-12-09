import { useRef, type FormEvent } from "react";
import "./NameModal.css";

interface NameModalProps {
	onSubmit: (name: string, roomId: string) => void;
	defaultRoomId?: string;
}

// Generate a random room ID
function generateRoomId(): string {
	const adjectives = ["happy", "swift", "bright", "calm", "wild", "cool", "warm", "bold"];
	const nouns = ["panda", "eagle", "river", "cloud", "star", "moon", "wave", "tree"];
	const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
	const noun = nouns[Math.floor(Math.random() * nouns.length)];
	const num = Math.floor(Math.random() * 1000);
	return `${adj}-${noun}-${num}`;
}

export function NameModal({ onSubmit, defaultRoomId }: NameModalProps) {
	const nameInputRef = useRef<HTMLInputElement>(null);
	const roomInputRef = useRef<HTMLInputElement>(null);

	function handleSubmit(event: FormEvent) {
		event.preventDefault();
		const name = nameInputRef.current?.value?.trim();
		let roomId = roomInputRef.current?.value?.trim();

		// Generate a room ID if not provided
		if (!roomId) {
			roomId = generateRoomId();
		}

		if (name) {
			onSubmit(name, roomId);
		}
	}

	return (
		<div className="modal-overlay">
			<div className="modal-backdrop" />
			<div className="modal-container">
				<form onSubmit={handleSubmit} className="modal-form">
					<div className="modal-header">
						<div className="sticky-icon">📝</div>
						<h1 className="modal-title">Welcome to the Board</h1>
						<p className="modal-subtitle">
							Join the collaborative whiteboard and share your ideas
						</p>
					</div>

					<div className="input-group">
						<label htmlFor="name-input" className="input-label">
							Your Name
						</label>
						<input
							ref={nameInputRef}
							id="name-input"
							type="text"
							defaultValue=""
							placeholder="Enter your name..."
							className="name-input"
							autoFocus
							maxLength={30}
						/>
					</div>

					<div className="input-group">
						<label htmlFor="room-input" className="input-label">
							Room ID
						</label>
						<input
							ref={roomInputRef}
							id="room-input"
							type="text"
							defaultValue={defaultRoomId || ""}
							placeholder="Leave blank to create new room..."
							className="name-input room-input"
							maxLength={50}
						/>
						<p className="input-hint">Enter a room ID to join others, or leave blank for a new room</p>
					</div>

					<button type="submit" className="submit-button">
						Join Board
						<span className="button-arrow">→</span>
					</button>
				</form>

				<div className="modal-footer">
					<p>Share your room ID with others to collaborate</p>
				</div>
			</div>
		</div>
	);
}
