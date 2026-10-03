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
}

// Starsze iOS Safari wymaga atrybutu webkit-playsinline, którego nie ma w typach Svelte.
declare module 'svelte/elements' {
	interface HTMLVideoAttributes {
		'webkit-playsinline'?: boolean | '' | undefined | null;
	}
}

export {};
