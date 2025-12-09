// Image-based Hat data loaded from JSON files

import topHatData from '../data/topHat.json'
import wizardHatData from '../data/wizardHat.json'
import policeHelmetData from '../data/policeHelmet.json'
import feathersData from '../data/feathers.json'

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

// Helper to create a hat image element
function createHatImage(imgUrl: string, name: string, size: number = 32) {
	return (
		<img
			src={imgUrl}
			alt={name}
			style={{
				width: size,
				height: size,
				objectFit: 'contain',
			}}
		/>
	)
}

export const HATS = {
	tophat: {
		name: topHatData.name,
		imgUrl: topHatData.imgUrl,
		svg: createHatImage(topHatData.imgUrl, topHatData.name),
	},
	wizard: {
		name: wizardHatData.name,
		imgUrl: wizardHatData.imgUrl,
		svg: createHatImage(wizardHatData.imgUrl, wizardHatData.name),
	},
	police: {
		name: policeHelmetData.name,
		imgUrl: policeHelmetData.imgUrl,
		svg: createHatImage(policeHelmetData.imgUrl, policeHelmetData.name),
	},
	feathers: {
		name: feathersData.name,
		imgUrl: feathersData.imgUrl,
		svg: createHatImage(feathersData.imgUrl, feathersData.name),
	},
} as const

export type HatType = keyof typeof HATS

export function HatIcon({ hat, size = 32 }: { hat: HatType; size?: number }) {
	const hatData = HATS[hat]
	return (
		<div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
			{createHatImage(hatData.imgUrl, hatData.name, size)}
		</div>
	)
}
