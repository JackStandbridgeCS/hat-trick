import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { HATS, HatType } from './Hats'
import './HatSelector.css'

interface HatSelectorProps {
	selectedHat: HatType
	onSelectHat: (hat: HatType) => void
}

export function HatSelector({ selectedHat, onSelectHat }: HatSelectorProps) {
	const [isOpen, setIsOpen] = useState(false)
	const dropdownRef = useRef<HTMLDivElement>(null)

	// Close dropdown when clicking outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false)
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [])

	const hatKeys = Object.keys(HATS) as HatType[]

	return createPortal(
		<div
			className="hat-selector"
			ref={dropdownRef}
			style={{
				position: 'fixed',
				bottom: '80px',
				right: '16px',
				zIndex: 99999,
				background: 'white',
				padding: '8px 12px',
				borderRadius: '12px',
				boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
				border: '1px solid #e5e5e5',
			}}
		>
			<button
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: '8px',
					background: 'none',
					border: 'none',
					cursor: 'pointer',
					fontSize: '13px',
					fontWeight: 500,
				}}
				onClick={() => setIsOpen(!isOpen)}
				aria-label="Select your hat"
				aria-expanded={isOpen}
			>
				<span style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
				{HATS[selectedHat]?.svg}
			</span>
				<span>{HATS[selectedHat]?.name || 'Hat'}</span>
				<span style={{ fontSize: '10px' }}>{isOpen ? '▼' : '▲'}</span>
			</button>

			{isOpen && (
				<div
					style={{
						position: 'absolute',
						bottom: 'calc(100% + 8px)',
						right: 0,
						background: 'white',
						border: '1px solid #e5e5e5',
						borderRadius: '12px',
						boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
						minWidth: '160px',
						overflow: 'hidden',
					}}
				>
					<div style={{ padding: '8px 12px', fontSize: '11px', color: '#888', borderBottom: '1px solid #eee' }}>
						Choose your hat
					</div>
					{hatKeys.map((hatKey) => (
						<button
							key={hatKey}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: '8px',
								width: '100%',
								padding: '8px 12px',
								background: selectedHat === hatKey ? '#fff8e6' : 'none',
								border: 'none',
								cursor: 'pointer',
								textAlign: 'left',
							}}
							onClick={() => {
								onSelectHat(hatKey)
								setIsOpen(false)
							}}
						>
							<span style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
							{HATS[hatKey].svg}
						</span>
							<span style={{ flex: 1, fontSize: '14px' }}>{HATS[hatKey].name}</span>
							{selectedHat === hatKey && <span style={{ color: '#f59e0b' }}>✓</span>}
						</button>
					))}
				</div>
			)}
		</div>,
		document.body
	)
}

