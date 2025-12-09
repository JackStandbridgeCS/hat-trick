import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Editor } from 'tldraw'
import { HATS, HatType } from './Hats'
import { getLocalStorageItem } from '../localStorage'

interface ThrownHat {
	id: string
	x: number
	y: number
	velocityX: number
	velocityY: number
	rotation: number
	rotationSpeed: number
	hatType: HatType
	startTime: number
}

interface DragState {
	startX: number
	startY: number
	currentX: number
	currentY: number
}

interface HatThrowOverlayProps {
	editor: Editor | null
}

export function HatThrowOverlay({ editor }: HatThrowOverlayProps) {
	const [thrownHats, setThrownHats] = useState<ThrownHat[]>([])
	const [dragState, setDragState] = useState<DragState | null>(null)
	const [isShiftHeld, setIsShiftHeld] = useState(false)
	const animationFrameRef = useRef<number | null>(null)

	// Track shift key state
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Shift') setIsShiftHeld(true)
		}
		const handleKeyUp = (e: KeyboardEvent) => {
			if (e.key === 'Shift') {
				setIsShiftHeld(false)
				setDragState(null) // Cancel drag if shift is released
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		window.addEventListener('keyup', handleKeyUp)
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
			window.removeEventListener('keyup', handleKeyUp)
		}
	}, [])

	// Handle pointer events on the tldraw container
	useEffect(() => {
		if (!editor) return

		const container = editor.getContainer()

		const handlePointerDown = (e: PointerEvent) => {
			if (!isShiftHeld) return

			// Prevent tldraw from handling this event
			e.stopPropagation()

			// Convert screen to page coordinates
			const pagePoint = editor.screenToPage({ x: e.clientX, y: e.clientY })

			setDragState({
				startX: pagePoint.x,
				startY: pagePoint.y,
				currentX: pagePoint.x,
				currentY: pagePoint.y,
			})
		}

		const handlePointerMove = (e: PointerEvent) => {
			if (!dragState || !isShiftHeld) return

			const screenX = e.clientX
			const screenY = e.clientY
			const pagePoint = editor.screenToPage({ x: screenX, y: screenY })

			setDragState((prev) =>
				prev
					? {
							...prev,
							currentX: pagePoint.x,
							currentY: pagePoint.y,
						}
					: null
			)
		}

		const handlePointerUp = () => {
			if (!dragState) return

			// Calculate throw vector (opposite direction of drag)
			const dx = dragState.startX - dragState.currentX
			const dy = dragState.startY - dragState.currentY
			const distance = Math.sqrt(dx * dx + dy * dy)

			// Only throw if there's significant drag
			if (distance > 20) {
				const hatType = (getLocalStorageItem('user-hat') as HatType) || 'cowboy'

				const newHat: ThrownHat = {
					id: `thrown-${Date.now()}-${Math.random()}`,
					x: dragState.startX,
					y: dragState.startY,
					velocityX: dx * 0.15,
					velocityY: dy * 0.15,
					rotation: 0,
					rotationSpeed: (Math.random() - 0.5) * 0.3,
					hatType,
					startTime: Date.now(),
				}

				setThrownHats((prev) => [...prev, newHat])
			}

			setDragState(null)
		}

		// Use capture phase to intercept before tldraw
		container.addEventListener('pointerdown', handlePointerDown, { capture: true })
		window.addEventListener('pointermove', handlePointerMove)
		window.addEventListener('pointerup', handlePointerUp)

		return () => {
			container.removeEventListener('pointerdown', handlePointerDown, { capture: true })
			window.removeEventListener('pointermove', handlePointerMove)
			window.removeEventListener('pointerup', handlePointerUp)
		}
	}, [editor, isShiftHeld, dragState])

	// Physics animation loop for thrown hats
	useEffect(() => {
		const animate = () => {
			const now = Date.now()
			const gravity = 0.5
			const friction = 0.99

			setThrownHats((prevHats) => {
				return prevHats
					.map((hat) => ({
						...hat,
						x: hat.x + hat.velocityX,
						y: hat.y + hat.velocityY,
						velocityX: hat.velocityX * friction,
						velocityY: hat.velocityY * friction + gravity,
						rotation: hat.rotation + hat.rotationSpeed,
					}))
					.filter((hat) => {
						// Remove hats that have been around too long or fallen far
						const elapsed = now - hat.startTime
						return elapsed < 10000 && hat.y < 10000
					})
			})

			animationFrameRef.current = requestAnimationFrame(animate)
		}

		animationFrameRef.current = requestAnimationFrame(animate)
		return () => {
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current)
			}
		}
	}, [])

	if (!editor) return null

	return createPortal(
		<div
			style={{
				position: 'fixed',
				inset: 0,
				pointerEvents: 'none',
				zIndex: 99997,
			}}
		>
			{/* Shift held indicator */}
			{isShiftHeld && !dragState && (
				<div
					style={{
						position: 'fixed',
						top: 60,
						left: '50%',
						transform: 'translateX(-50%)',
						background: 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)',
						color: 'white',
						padding: '8px 16px',
						borderRadius: 8,
						fontWeight: 600,
						fontSize: 13,
						display: 'flex',
						alignItems: 'center',
						gap: 8,
						boxShadow: '0 4px 12px rgba(196, 69, 105, 0.4)',
					}}
				>
					<span style={{ fontSize: 20 }}>🎩</span>
					<span>Click & drag to throw a hat!</span>
				</div>
			)}

			{/* Power/Direction Arrow */}
			{dragState && <PowerArrow editor={editor} dragState={dragState} />}

			{/* Thrown Hats */}
			{thrownHats.map((hat) => (
				<ThrownHatComponent key={hat.id} editor={editor} hat={hat} />
			))}
		</div>,
		document.body
	)
}

// Power arrow showing throw direction and strength
function PowerArrow({ editor, dragState }: { editor: Editor; dragState: DragState }) {
	// Convert page coordinates to screen coordinates
	const startScreen = editor.pageToScreen({ x: dragState.startX, y: dragState.startY })
	const currentScreen = editor.pageToScreen({ x: dragState.currentX, y: dragState.currentY })

	// Arrow points opposite to drag direction (throw direction)
	const dx = startScreen.x - currentScreen.x
	const dy = startScreen.y - currentScreen.y
	const distance = Math.sqrt(dx * dx + dy * dy)
	const angle = Math.atan2(dy, dx)

	// Scale arrow length based on drag distance
	const arrowLength = Math.min(distance * 1.5, 200)
	const arrowEndX = startScreen.x + Math.cos(angle) * arrowLength
	const arrowEndY = startScreen.y + Math.sin(angle) * arrowLength

	// Color based on power (distance)
	const power = Math.min(distance / 150, 1)
	const hue = 120 - power * 120 // Green to red

	const currentHat = (getLocalStorageItem('user-hat') as HatType) || 'cowboy'
	const hatData = HATS[currentHat]

	if (distance < 10) return null

	return (
		<>
			<svg
				style={{
					position: 'fixed',
					inset: 0,
					width: '100%',
					height: '100%',
					overflow: 'visible',
					pointerEvents: 'none',
				}}
			>
				{/* Arrow line */}
				<line
					x1={startScreen.x}
					y1={startScreen.y}
					x2={arrowEndX}
					y2={arrowEndY}
					stroke={`hsl(${hue}, 80%, 50%)`}
					strokeWidth={4}
					strokeLinecap="round"
				/>
				{/* Arrow head */}
				<polygon
					points={`
						${arrowEndX},${arrowEndY}
						${arrowEndX - 15 * Math.cos(angle - 0.4)},${arrowEndY - 15 * Math.sin(angle - 0.4)}
						${arrowEndX - 15 * Math.cos(angle + 0.4)},${arrowEndY - 15 * Math.sin(angle + 0.4)}
					`}
					fill={`hsl(${hue}, 80%, 50%)`}
				/>
			</svg>
			{/* Hat preview at start position */}
			<div
				style={{
					position: 'fixed',
					left: startScreen.x,
					top: startScreen.y - 40,
					transform: 'translateX(-50%)',
					width: 32,
					height: 32,
					filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
				}}
			>
				{hatData?.svg}
			</div>
		</>
	)
}

// Thrown hat flying through the air
function ThrownHatComponent({ editor, hat }: { editor: Editor; hat: ThrownHat }) {
	// Convert page coordinates to screen coordinates
	const screenPoint = editor.pageToScreen({ x: hat.x, y: hat.y })
	const hatData = HATS[hat.hatType]

	return (
		<div
			style={{
				position: 'absolute',
				left: screenPoint.x,
				top: screenPoint.y,
				transform: `translate(-50%, -50%) rotate(${hat.rotation}rad)`,
				width: 40,
				height: 40,
				filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
			}}
		>
			{hatData?.svg}
		</div>
	)
}
