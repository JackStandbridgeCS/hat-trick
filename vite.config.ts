import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
	const isProduction = mode === 'production'

	return {
		plugins: [
			// Only use Cloudflare plugin in production builds
			...(isProduction ? [cloudflare()] : []),
			react(),
		],
		// For local dev without Cloudflare, set up proxy if needed
		server: {
			port: 5173,
		},
	}
})
