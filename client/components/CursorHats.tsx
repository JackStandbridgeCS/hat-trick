import { track, useEditor } from 'tldraw'
import { HATS, HatType } from './Hats'

/**
 * This component renders hats above other users' cursors.
 * It reads presence data from the store and renders hat emojis at cursor positions.
 * This should be used as an InFrontOfTheCanvas component.
 */
export const CursorHats = track(function CursorHats() {
	const editor = useEditor()

	// Get all presence records (other users' cursors)
	const collaborators = editor.getCollaborators()

	if (!collaborators || collaborators.length === 0) {
		return null
	}

	return (
		<div
			style={{
				position: 'absolute',
				inset: 0,
				pointerEvents: 'none',
				overflow: 'visible',
			}}
		>
			{collaborators.map((collaborator) => {
				// Parse the name to extract hat type: "Name|hatType"
				const [, hatType] = (collaborator.userName || '').split('|')
				const hat = (hatType as HatType) in HATS ? (hatType as HatType) : 'tophat'
				const hatData = HATS[hat]

				// Get cursor position
				const cursor = collaborator.cursor
				if (!cursor) return null

				// Convert page coordinates to screen coordinates
				const screenPoint = editor.pageToScreen({ x: cursor.x, y: cursor.y })

				return (
					<div
						key={collaborator.id}
						style={{
							position: 'fixed',
							left: screenPoint.x,
							top: screenPoint.y,
							transform: 'translate(-50%, -100%) translateY(-24px)',
							pointerEvents: 'none',
							fontSize: '28px',
							lineHeight: 1,
							filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
							zIndex: 9999,
						}}
					>
						{hatData?.emoji || '🎩'}
					</div>
				)
			})}
		</div>
	)
})
