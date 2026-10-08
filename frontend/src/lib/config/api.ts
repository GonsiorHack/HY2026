// Wartosci VITE_* sa publiczne i odczytywane podczas budowania, nigdy nie zapisujemy tu sekretow
export const CONFIGURED_API_BASE_URL =
	import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_BASE;

// Rozrozniamy brak konfiguracji od jawnie pustego adresu URL dla trybu demonstracyjnego
export const API_BASE_URL = CONFIGURED_API_BASE_URL?.trim().replace(/\/+$/, '') || undefined;
export const CHAT_MODE = import.meta.env.VITE_CHAT_MODE ?? 'api';
export const CHAT_API_URL = import.meta.env.VITE_CHAT_API_URL?.trim() ?? '/api/chat';

export const API_PATHS = {
	accessibleRoute: '/api/route',
	standardRoute: '/api/route-standard',
	geocode: '/api/geocode'
} as const;
