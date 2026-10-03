// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	interface ImportMetaEnv {
		readonly VITE_ROUTES_API_URL?: string;
	}
}

declare module 'svelte/elements' {
	interface HTMLVideoAttributes {
		'webkit-playsinline'?: boolean | '' | undefined | null;
	}
}

export {};
