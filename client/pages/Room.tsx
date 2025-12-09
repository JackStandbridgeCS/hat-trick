import { useSync, useSyncDemo } from '@tldraw/sync'
import { ReactNode, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Editor, Tldraw, uniqueId } from 'tldraw'
import { CursorHatsOverlay } from '../components/CursorHatsOverlay'
import { HatType } from '../components/Hats'
import { HatSelector } from '../components/HatSelector'
import { NameModal } from '../components/NameModal'
import { getBookmarkPreview } from '../getBookmarkPreview'
import { getLocalStorageItem, setLocalStorageItem } from '../localStorage'
import { multiplayerAssetStore } from '../multiplayerAssetStore'

// Check if we're running on Cloudflare (production) or locally
const isProduction = import.meta.env.PROD

interface UserInfo {
	name: string
	color: string
	id: string
	hat: HatType
}

export function Room() {
	const { roomId } = useParams<{ roomId: string }>()
	const navigate = useNavigate()
	const [userInfo, setUserInfo] = useState<UserInfo | null>(null)

	// Check if user has entered their name
	useEffect(() => {
		const storedName = getLocalStorageItem('user-name')
		const storedColor = getLocalStorageItem('user-color')
		const storedHat = (getLocalStorageItem('user-hat') as HatType) || 'tophat'

		if (storedName && storedColor) {
			setUserInfo({
				name: storedName,
				color: storedColor,
				id: getLocalStorageItem('user-id') || createUserId(),
				hat: storedHat,
			})
		}
	}, [])

	// Handle joining from modal (for direct URL access)
	function handleJoin(name: string, newRoomId: string) {
		const color = generateUserColor()
		const id = createUserId()
		const hat: HatType = (getLocalStorageItem('user-hat') as HatType) || 'tophat'

		setLocalStorageItem('user-name', name)
		setLocalStorageItem('user-color', color)
		setLocalStorageItem('user-id', id)
		setLocalStorageItem('user-hat', hat)

		setUserInfo({ name, color, id, hat })

		// If they entered a different room ID, navigate there
		if (newRoomId !== roomId) {
			navigate(`/${newRoomId}`)
		}
	}

	// Show modal if user hasn't entered their name
	if (!userInfo) {
		return <NameModal onSubmit={handleJoin} defaultRoomId={roomId} />
	}

	return (
		<RoomContent
			roomId={roomId!}
			userInfo={userInfo}
			onHatChange={(hat) => {
				setLocalStorageItem('user-hat', hat)
				setUserInfo({ ...userInfo, hat })
			}}
		/>
	)
}

function RoomContent({
	roomId,
	userInfo,
	onHatChange,
}: {
	roomId: string
	userInfo: UserInfo
	onHatChange: (hat: HatType) => void
}) {
	const [editor, setEditor] = useState<Editor | null>(null)

	// Encode hat type in the name field (format: "Name|hatType")
	// This is necessary because tldraw's userInfo only supports id, name, color
	const encodedName = `${userInfo.name}|${userInfo.hat}`

	// Use different sync methods for dev vs production
	const store = isProduction
		? useSync({
				uri: `${window.location.origin}/api/connect/${roomId}`,
				assets: multiplayerAssetStore,
				userInfo: {
					id: userInfo.id,
					name: encodedName,
					color: userInfo.color,
				},
			})
		: useSyncDemo({
				roomId: roomId,
				userInfo: {
					id: userInfo.id,
					name: encodedName,
					color: userInfo.color,
				},
			})

	return (
		<>
			<RoomWrapper roomId={roomId} userName={userInfo.name}>
				<Tldraw
					store={store}
					deepLinks
					onMount={(e) => {
						setEditor(e)
						e.registerExternalAssetHandler('url', getBookmarkPreview)
					}}
				/>
			</RoomWrapper>
			<CursorHatsOverlay editor={editor} />
			<HatSelector selectedHat={userInfo.hat} onSelectHat={onHatChange} />
		</>
	)
}

function RoomWrapper({
	children,
	roomId,
	userName,
}: {
	children: ReactNode
	roomId?: string
	userName: string
}) {
	const [didCopy, setDidCopy] = useState(false)

	useEffect(() => {
		if (!didCopy) return
		const timeout = setTimeout(() => setDidCopy(false), 3000)
		return () => clearTimeout(timeout)
	}, [didCopy])

	return (
		<div className="RoomWrapper">
			<div className="RoomWrapper-header">
				<WifiIcon />
				<div className="RoomWrapper-roomId">{roomId}</div>
				<div className="RoomWrapper-user">
					<span className="RoomWrapper-userName">{userName}</span>
				</div>
				<button
					className="RoomWrapper-copy"
					onClick={() => {
						navigator.clipboard.writeText(window.location.href)
						setDidCopy(true)
					}}
					aria-label="copy room link"
				>
					Copy link
					{didCopy && <div className="RoomWrapper-copied">Copied!</div>}
				</button>
			</div>
			<div className="RoomWrapper-content">{children}</div>
		</div>
	)
}

function WifiIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth="1.5"
			stroke="currentColor"
			width={16}
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 0 1 1.06 0Z"
			/>
		</svg>
	)
}

function generateUserColor(): string {
	const hue = Math.floor(Math.random() * 360)
	return `hsl(${hue}, 70%, 55%)`
}

function createUserId(): string {
	const id = uniqueId()
	setLocalStorageItem('user-id', id)
	return id
}
