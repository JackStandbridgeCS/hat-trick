import { useRef, type FormEvent } from "react";
import "./NameModal.css";

interface NameModalProps {
	onSubmit: (name: string) => void;
}

export function NameModal({ onSubmit }: NameModalProps) {
	const inputRef = useRef<HTMLInputElement>(null);

	function handleSubmit(event: FormEvent) {
		event.preventDefault();
		const value = inputRef.current?.value?.trim();
		if (value) {
			onSubmit(value);
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
							ref={inputRef}
							id="name-input"
							type="text"
							defaultValue=""
							placeholder="Enter your name..."
							className="name-input"
							autoFocus
							maxLength={30}
						/>
					</div>

					<button type="submit" className="submit-button">
						Join Board
						<span className="button-arrow">→</span>
					</button>
				</form>

				<div className="modal-footer">
					<p>Others will see your cursor with your name</p>
				</div>
			</div>
		</div>
	);
}
