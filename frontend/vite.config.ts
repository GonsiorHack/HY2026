import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, '.', '');
	// Przegladarka rozmawia z frontendem; tylko serwer Vite zna adres lokalnego backendu
	const proxy = {
		'/api/chat': {
			target: env.CHAT_PROXY_TARGET ?? 'http://127.0.0.1:8001',
			changeOrigin: true
		}
	};

	return {
		server: { proxy },
		preview: { proxy },
		plugins: [
			tailwindcss(),
			sveltekit({
				compilerOptions: {
					runes: ({ filename }) =>
						filename.split(/[/\\]/).includes('node_modules') ? undefined : true
				},

				adapter: adapter()
			})
		]
	};
});
