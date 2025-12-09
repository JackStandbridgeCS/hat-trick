import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NameModal } from '../components/NameModal'
import { setLocalStorageItem } from '../localStorage'

export function Root() {
	const navigate = useNavigate()
	const [hasJoined, setHasJoined] = useState(false)

	function handleJoin(name: string, roomId: string) {
		// Store user info in localStorage so Room can access it
		setLocalStorageItem('user-name', name)
		setLocalStorageItem('user-color', generateUserColor())

		setHasJoined(true)
		navigate(`/${roomId}`)
	}

	if (hasJoined) {
		return null // Navigating...
	}

	return <NameModal onSubmit={handleJoin} />
}

// Generate a random warm/pastel color for user cursor
function generateUserColor(): string {
	const hue = Math.floor(Math.random() * 360)
	return `hsl(${hue}, 70%, 55%)`
}
