import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Editor } from 'tldraw'
import { HATS, HatType } from './Hats'

interface CursorHatsOverlayProps {
	editor: Editor | null
}

interface HatPosition {
	id: string
	x: number
	y: number
	hat: HatType
	userName: string
}

export function CursorHatsOverlay({ editor }: CursorHatsOverlayProps) {
	const [hatPositions, setHatPositions] = useState<HatPosition[]>([])

	useEffect(() => {
		if (!editor) return

		// Function to update hat positions from collaborator presence
		const updateHatPositions = () => {
			const collaborators = editor.getCollaborators()

			const positions: HatPosition[] = collaborators
				.filter((c) => c.cursor !== null)
				.map((collaborator) => {
					// Parse the name to extract hat type: "Name|hatType"
					const [displayName, hatType] = (collaborator.userName || '').split('|')
					const hat = (hatType as HatType) in HATS ? (hatType as HatType) : 'tophat'

					// Convert page coordinates to screen coordinates
					const screenPoint = editor.pageToScreen({
						x: collaborator.cursor!.x,
						y: collaborator.cursor!.y,
					})

					return {
						id: collaborator.id,
						x: screenPoint.x,
						y: screenPoint.y,
						hat,
						userName: displayName || 'User',
					}
				})

			setHatPositions(positions)
		}

		// Initial update
		updateHatPositions()

		// Subscribe to store changes to update positions
		const unsubscribe = editor.store.listen(updateHatPositions, {
			source: 'all',
			scope: 'presence',
		})

		// Also listen for camera changes
		editor.on('change', updateHatPositions)

		return () => {
			unsubscribe()
		}
	}, [editor])

	if (hatPositions.length === 0) return null

	return createPortal(
		<div
			style={{
				position: 'fixed',
				inset: 0,
				pointerEvents: 'none',
				zIndex: 99998,
			}}
		>
			{hatPositions.map((pos) => {
				const hatData = HATS[pos.hat]
				return (
					<div
						key={pos.id}
						style={{
							position: 'absolute',
							left: pos.x,
							top: pos.y - 52,
							transform: 'translateX(-50%)',
							fontSize: '32px',
							lineHeight: 1,
							filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
							transition: 'left 0.05s linear, top 0.05s linear',
						}}
					>
						{hatData?.emoji || '🎩'}
					</div>
				)
			})}
		</div>,
		document.body
	)
}

