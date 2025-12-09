import { HATS, HatType } from './Hats'

// Custom cursor component that shows a hat above the cursor
export const CursorWithHat: React.FC<{
	point: { x: number, y: number } | undefined,
	zoom: number,
	color: string,
	name?: string,
}> = ({ point, color, name }) => {
	// The hat type is stored in the user's name field as "Name|hatType"
	const [displayName, hatType] = (name || '').split('|')
	const hat = (hatType as HatType) in HATS ? (hatType as HatType) : 'tophat'
	const hatData = HATS[hat]

	// Don't render anything if no point
	if (!point) return null

	return (
		<div
			style={{
				position: 'absolute',
				top: point.y,
				left: point.x,
				pointerEvents: 'none',
				transform: 'translate(-2px, -2px)',
			}}
		>
			{/* Hat emoji above cursor - using emoji for reliability */}
			<div
				style={{
					position: 'absolute',
					bottom: '100%',
					left: '0',
					fontSize: '20px',
					lineHeight: 1,
					marginBottom: '-4px',
					filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
					transform: 'translateX(-25%)',
				}}
			>
				<img
					src={hatData?.imgUrl || HATS.tophat.imgUrl}
					alt={hatData?.name || 'Hat'}
					style={{ width: 20, height: 20, objectFit: 'contain' }}
				/>
			</div>

			{/* Cursor SVG */}
			<svg width="14" height="18" viewBox="0 0 14 18">
				<path
					d="M1 1L1 15L4.5 11.5L7.5 17L9.5 16L6.5 10L12 10L1 1Z"
					fill={color}
					stroke="white"
					strokeWidth="1.2"
					strokeLinejoin="round"
				/>
			</svg>

			{/* Name label */}
			{displayName && (
				<div
					style={{
						position: 'absolute',
						top: '14px',
						left: '12px',
						background: color,
						color: 'white',
						padding: '2px 6px',
						borderRadius: '4px',
						fontSize: '11px',
						fontWeight: 600,
						fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
						whiteSpace: 'nowrap',
						boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
					}}
				>
					{displayName}
				</div>
			)}
		</div>
	)
}
