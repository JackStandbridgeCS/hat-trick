import { DefaultCursor } from 'tldraw'

/**
 * Custom cursor component that parses the encoded name format "Name|hatType"
 * and only displays the user's name (without the hat type suffix).
 */
export const CustomCursor = (props: Parameters<typeof DefaultCursor>[0]) => {
	// Parse the name to extract just the display name (strip hat type)
	const [displayName] = (props.name || '').split('|')

	return <DefaultCursor {...props} name={displayName || props.name} />
}

