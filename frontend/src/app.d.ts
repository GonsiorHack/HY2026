declare global {
	namespace App {}

	interface ImportMetaEnv {
		readonly VITE_API_BASE_URL?: string;
		readonly VITE_CHAT_MODE?: string;
		readonly VITE_CHAT_API_URL?: string;
	}
}

declare module 'svelte/elements' {
	interface HTMLVideoAttributes {
		'webkit-playsinline'?: boolean | '' | undefined | null;
	}
}

export {};
