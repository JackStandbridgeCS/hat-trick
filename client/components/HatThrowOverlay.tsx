import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Editor } from 'tldraw'
import { HATS, HatType, isCustomHat, getCustomHatId, CustomHatData } from './Hats'
import { getLocalStorageItem } from '../localStorage'

interface ThrownHat {
	id: string
	x: number
	y: number
	velocityX: number
	velocityY: number
	rotation: number
	rotationSpeed: number
	hatType: string // Can be HatType or custom hat type
	startTime: number
}

// Load custom hats from localStorage
function loadCustomHats(): CustomHatData[] {
	try {
		const stored = getLocalStorageItem('custom-hats')
		if (stored) {
			return JSON.parse(stored)
		}
	} catch (error) {
		console.warn('Failed to load custom hats:', error)
	}
	return []
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
	const [customHats, setCustomHats] = useState<CustomHatData[]>([])
	const animationFrameRef = useRef<number | null>(null)

	// Use refs to avoid stale closures in event handlers
	const dragStateRef = useRef<DragState | null>(null)
	const isShiftHeldRef = useRef(false)

	// Load custom hats
	useEffect(() => {
		setCustomHats(loadCustomHats())
	}, [])

	// Keep refs in sync with state
	useEffect(() => {
		dragStateRef.current = dragState
	}, [dragState])

	useEffect(() => {
		isShiftHeldRef.current = isShiftHeld
	}, [isShiftHeld])

	// Track shift key state
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Shift') {
				setIsShiftHeld(true)
			}
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
			if (!isShiftHeldRef.current) return

			// Prevent tldraw from handling this event
			e.stopPropagation()
			e.preventDefault()

			// Convert screen to page coordinates
			const pagePoint = editor.screenToPage({ x: e.clientX, y: e.clientY })

			const newDragState = {
				startX: pagePoint.x,
				startY: pagePoint.y,
				currentX: pagePoint.x,
				currentY: pagePoint.y,
			}
			setDragState(newDragState)
			dragStateRef.current = newDragState
		}

		const handlePointerMove = (e: PointerEvent) => {
			const currentDrag = dragStateRef.current
			if (!currentDrag || !isShiftHeldRef.current) return

			const pagePoint = editor.screenToPage({ x: e.clientX, y: e.clientY })

			const updatedDrag = {
				...currentDrag,
				currentX: pagePoint.x,
				currentY: pagePoint.y,
			}
			setDragState(updatedDrag)
			dragStateRef.current = updatedDrag
		}

		const handlePointerUp = () => {
			const currentDrag = dragStateRef.current
			if (!currentDrag) return

			// Calculate throw vector (opposite direction of drag)
			const dx = currentDrag.startX - currentDrag.currentX
			const dy = currentDrag.startY - currentDrag.currentY
			const distance = Math.sqrt(dx * dx + dy * dy)

			console.log('[HatThrow] Pointer up, distance:', distance, 'drag:', currentDrag)

			// Only throw if there's significant drag
			if (distance > 20) {
				const hatType = getLocalStorageItem('user-hat') || 'cowboy'

				const newHat: ThrownHat = {
					id: `thrown-${Date.now()}-${Math.random()}`,
					x: currentDrag.startX,
					y: currentDrag.startY,
					velocityX: dx * 0.15,
					velocityY: dy * 0.15,
					rotation: 0,
					rotationSpeed: (Math.random() - 0.5) * 0.3,
					hatType,
					startTime: Date.now(),
				}

				console.log('[HatThrow] Throwing hat:', newHat)
				setThrownHats((prev) => {
					console.log('[HatThrow] Previous hats:', prev.length, '-> adding new hat')
					return [...prev, newHat]
				})
			}

			setDragState(null)
			dragStateRef.current = null
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
	}, [editor]) // Only depend on editor now - refs handle the rest

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
			{dragState && <PowerArrow editor={editor} dragState={dragState} customHats={customHats} />}

			{/* Thrown Hats */}
			{thrownHats.map((hat) => (
				<ThrownHatComponent key={hat.id} editor={editor} hat={hat} customHats={customHats} />
			))}

			{/* Debug: show hat count */}
			{thrownHats.length > 0 && (
				<div style={{ position: 'fixed', bottom: 10, left: 10, background: 'black', color: 'lime', padding: 4, fontSize: 12, zIndex: 999999 }}>
					Thrown hats: {thrownHats.length}
				</div>
			)}
		</div>,
		document.body
	)
}

// Power arrow showing throw direction and strength
function PowerArrow({ editor, dragState, customHats }: { editor: Editor; dragState: DragState; customHats: CustomHatData[] }) {
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

	const currentHatType = getLocalStorageItem('user-hat') || 'cowboy'

	// Render the hat preview (built-in or custom)
	const renderHatPreview = () => {
		if (isCustomHat(currentHatType)) {
			const customHatId = getCustomHatId(currentHatType)
			const customHat = customHats.find((h) => h.id === customHatId)
			if (customHat) {
				return (
					<img
						src={customHat.imageUrl}
						alt={customHat.name}
						style={{
							width: '100%',
							height: '100%',
							objectFit: 'contain',
						}}
					/>
				)
			}
		}
		const hatData = HATS[currentHatType as HatType]
		return hatData?.svg || HATS.tophat.svg
	}

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
				{renderHatPreview()}
			</div>
		</>
	)
}

// Thrown hat flying through the air
function ThrownHatComponent({ editor, hat, customHats }: { editor: Editor; hat: ThrownHat; customHats: CustomHatData[] }) {
	// Convert page coordinates to screen coordinates
	const screenPoint = editor.pageToScreen({ x: hat.x, y: hat.y })

	// Render the hat (built-in or custom)
	const renderHat = () => {
		if (isCustomHat(hat.hatType)) {
			const customHatId = getCustomHatId(hat.hatType)
			const customHat = customHats.find((h) => h.id === customHatId)
			if (customHat) {
				return (
					<img
						src={customHat.imageUrl}
						alt={customHat.name}
						style={{
							width: '100%',
							height: '100%',
							objectFit: 'contain',
						}}
					/>
				)
			}
		}
		// Built-in hat
		const hatData = HATS[hat.hatType as HatType]
		return hatData?.svg || HATS.tophat.svg
	}

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
			{renderHat()}
		</div>
	)
}
