// SVG Hat illustrations

// Custom hat prefix for identifying local custom hats (stored in localStorage)
export const CUSTOM_HAT_PREFIX = 'custom:'

// URL hat prefix for identifying server-hosted hats (shareable with other users)
export const URL_HAT_PREFIX = 'url:'

export interface CustomHatData {
	id: string
	name: string
	imageUrl: string // Can be data URL (local) or server URL (shareable)
}

// Check if a hat type string represents a local custom hat
export function isCustomHat(hatType: string): boolean {
	return hatType.startsWith(CUSTOM_HAT_PREFIX)
}

// Check if a hat type string represents a URL-based hat (server-hosted, shareable)
export function isUrlHat(hatType: string): boolean {
	return hatType.startsWith(URL_HAT_PREFIX)
}

// Check if a hat is any kind of custom/generated hat (not built-in)
export function isGeneratedHat(hatType: string): boolean {
	return isCustomHat(hatType) || isUrlHat(hatType)
}

// Get custom hat ID from the hat type string
export function getCustomHatId(hatType: string): string {
	return hatType.slice(CUSTOM_HAT_PREFIX.length)
}

// Get URL from a URL-based hat type
export function getUrlHatUrl(hatType: string): string {
	return hatType.slice(URL_HAT_PREFIX.length)
}

// Create a hat type string from a custom hat ID (local)
export function makeCustomHatType(customHatId: string): string {
	return `${CUSTOM_HAT_PREFIX}${customHatId}`
}

// Create a hat type string from a server URL (shareable)
export function makeUrlHatType(url: string): string {
	return `${URL_HAT_PREFIX}${url}`
}

export const HATS = {
	tophat: {
		name: 'Top Hat',
		emoji: '🎩',
		// SVG content (without the outer <svg> wrapper) for use in cursor
		svgContent: (
			<g>
				{/* Hat brim */}
				<ellipse cx="16" cy="26" rx="14" ry="4" fill="#1a1a2e" />
				<ellipse cx="16" cy="25" rx="13" ry="3.5" fill="#2d2d44" />
				{/* Hat body */}
				<rect x="7" y="8" width="18" height="17" rx="1" fill="#1a1a2e" />
				<rect x="8" y="9" width="16" height="15" rx="1" fill="#2d2d44" />
				{/* Hat band */}
				<rect x="7" y="20" width="18" height="3" fill="#c9a227" />
				<rect x="7" y="21" width="18" height="1" fill="#dbb42c" />
				{/* Hat top */}
				<ellipse cx="16" cy="8" rx="9" ry="2" fill="#1a1a2e" />
				<ellipse cx="16" cy="7.5" rx="8" ry="1.5" fill="#3d3d5c" />
				{/* Shine */}
				<path d="M10 12 L10 18" stroke="#4a4a6a" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
			</g>
		),
		// Full SVG for use in UI components
		svg: (
			<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
				{/* Hat brim */}
				<ellipse cx="16" cy="26" rx="14" ry="4" fill="#1a1a2e" />
				<ellipse cx="16" cy="25" rx="13" ry="3.5" fill="#2d2d44" />
				{/* Hat body */}
				<rect x="7" y="8" width="18" height="17" rx="1" fill="#1a1a2e" />
				<rect x="8" y="9" width="16" height="15" rx="1" fill="#2d2d44" />
				{/* Hat band */}
				<rect x="7" y="20" width="18" height="3" fill="#c9a227" />
				<rect x="7" y="21" width="18" height="1" fill="#dbb42c" />
				{/* Hat top */}
				<ellipse cx="16" cy="8" rx="9" ry="2" fill="#1a1a2e" />
				<ellipse cx="16" cy="7.5" rx="8" ry="1.5" fill="#3d3d5c" />
				{/* Shine */}
				<path d="M10 12 L10 18" stroke="#4a4a6a" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
			</svg>
		),
	},
	cowboy: {
		name: 'Cowboy Hat',
		emoji: '🤠',
		svgContent: (
			<g>
				{/* Hat brim - curved */}
				<path
					d="M2 24 Q4 20 10 22 L22 22 Q28 20 30 24 Q28 28 16 28 Q4 28 2 24Z"
					fill="#8B4513"
				/>
				<path
					d="M3 24 Q5 21 10 22.5 L22 22.5 Q27 21 29 24 Q27 27 16 27 Q5 27 3 24Z"
					fill="#A0522D"
				/>
				{/* Hat crown */}
				<path
					d="M8 22 Q8 12 11 10 L21 10 Q24 12 24 22Z"
					fill="#8B4513"
				/>
				<path
					d="M9 21 Q9 13 12 11 L20 11 Q23 13 23 21Z"
					fill="#A0522D"
				/>
				{/* Crown indent */}
				<path
					d="M11 11 Q16 14 21 11"
					stroke="#8B4513"
					strokeWidth="2"
					fill="none"
				/>
				{/* Hat band */}
				<rect x="8" y="18" width="16" height="3" fill="#654321" />
				<ellipse cx="16" cy="19.5" rx="2" ry="1.5" fill="#c9a227" />
				{/* Stitching */}
				<path d="M10 14 L10 17" stroke="#654321" strokeWidth="0.5" strokeDasharray="1 1" />
				<path d="M22 14 L22 17" stroke="#654321" strokeWidth="0.5" strokeDasharray="1 1" />
			</g>
		),
		svg: (
			<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
				{/* Hat brim - curved */}
				<path
					d="M2 24 Q4 20 10 22 L22 22 Q28 20 30 24 Q28 28 16 28 Q4 28 2 24Z"
					fill="#8B4513"
				/>
				<path
					d="M3 24 Q5 21 10 22.5 L22 22.5 Q27 21 29 24 Q27 27 16 27 Q5 27 3 24Z"
					fill="#A0522D"
				/>
				{/* Hat crown */}
				<path
					d="M8 22 Q8 12 11 10 L21 10 Q24 12 24 22Z"
					fill="#8B4513"
				/>
				<path
					d="M9 21 Q9 13 12 11 L20 11 Q23 13 23 21Z"
					fill="#A0522D"
				/>
				{/* Crown indent */}
				<path
					d="M11 11 Q16 14 21 11"
					stroke="#8B4513"
					strokeWidth="2"
					fill="none"
				/>
				{/* Hat band */}
				<rect x="8" y="18" width="16" height="3" fill="#654321" />
				<ellipse cx="16" cy="19.5" rx="2" ry="1.5" fill="#c9a227" />
				{/* Stitching */}
				<path d="M10 14 L10 17" stroke="#654321" strokeWidth="0.5" strokeDasharray="1 1" />
				<path d="M22 14 L22 17" stroke="#654321" strokeWidth="0.5" strokeDasharray="1 1" />
			</svg>
		),
	},
	party: {
		name: 'Party Hat',
		emoji: '🥳',
		svgContent: (
			<g>
				{/* Hat cone */}
				<path d="M16 2 L6 28 L26 28 Z" fill="#ff6b9d" />
				<path d="M16 2 L8 28 L16 28 Z" fill="#ff85b1" />
				{/* Stripes */}
				<path d="M16 2 L10 16 L12 16 Z" fill="#ffd93d" />
				<path d="M16 2 L18 16 L20 16 L16 2Z" fill="#ffd93d" />
				<path d="M8 22 L10 22 L12 28 L8 28Z" fill="#6bcb77" />
				<path d="M18 22 L20 22 L22 28 L20 28Z" fill="#6bcb77" />
				<path d="M13 22 L15 22 L16 28 L14 28Z" fill="#4d96ff" />
				{/* Pom pom */}
				<circle cx="16" cy="3" r="3" fill="#ffd93d" />
				<circle cx="15" cy="2" r="1.5" fill="#ffe566" />
				{/* Elastic band hint */}
				<ellipse cx="16" cy="27" rx="10" ry="2" fill="#e84a8a" opacity="0.3" />
				{/* Dots decoration */}
				<circle cx="12" cy="12" r="1" fill="#fff" opacity="0.7" />
				<circle cx="19" cy="18" r="1" fill="#fff" opacity="0.7" />
				<circle cx="14" cy="22" r="0.8" fill="#fff" opacity="0.7" />
			</g>
		),
		svg: (
			<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
				{/* Hat cone */}
				<path d="M16 2 L6 28 L26 28 Z" fill="#ff6b9d" />
				<path d="M16 2 L8 28 L16 28 Z" fill="#ff85b1" />
				{/* Stripes */}
				<path d="M16 2 L10 16 L12 16 Z" fill="#ffd93d" />
				<path d="M16 2 L18 16 L20 16 L16 2Z" fill="#ffd93d" />
				<path d="M8 22 L10 22 L12 28 L8 28Z" fill="#6bcb77" />
				<path d="M18 22 L20 22 L22 28 L20 28Z" fill="#6bcb77" />
				<path d="M13 22 L15 22 L16 28 L14 28Z" fill="#4d96ff" />
				{/* Pom pom */}
				<circle cx="16" cy="3" r="3" fill="#ffd93d" />
				<circle cx="15" cy="2" r="1.5" fill="#ffe566" />
				{/* Elastic band hint */}
				<ellipse cx="16" cy="27" rx="10" ry="2" fill="#e84a8a" opacity="0.3" />
				{/* Dots decoration */}
				<circle cx="12" cy="12" r="1" fill="#fff" opacity="0.7" />
				<circle cx="19" cy="18" r="1" fill="#fff" opacity="0.7" />
				<circle cx="14" cy="22" r="0.8" fill="#fff" opacity="0.7" />
			</svg>
		),
	},
} as const

export type HatType = keyof typeof HATS

export function HatIcon({ hat, size = 32 }: { hat: HatType; size?: number }) {
	const hatData = HATS[hat]
	return (
		<div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
			{hatData.svg}
		</div>
	)
}
