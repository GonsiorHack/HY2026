import type { GeocodeErrorKind, GeocodeResult } from '../types/geocode';
import { API_BASE_URL } from './routes';

const DEFAULT_GEOCODE_BASE_URL = 'https://opacity-hypnotism-footless.ngrok-free.dev';
const GEOCODE_TIMEOUT_MS = 10_000;

/** Backend odrzuca krótsze zapytania kodem 400 („Query is too short.”). */
export const MIN_GEOCODE_QUERY_LENGTH = 3;

export const GEOCODE_NOT_FOUND_MESSAGE =
	'Nie znaleziono adresu w Krakowie. Spróbuj podać dokładniejszą nazwę lub ulicę.';
export const GEOCODE_NETWORK_MESSAGE = 'Utracono połączenie z serwerem';

export class GeocodeError extends Error {
	constructor(
		readonly kind: GeocodeErrorKind,
		message: string
	) {
		super(message);
		this.name = 'GeocodeError';
	}
}

/**
 * Zwraca listę wyników dla zapytania. Backend odsyła pojedynczy obiekt, ale obsługujemy też tablicę.
 * Brak wyniku backend sygnalizuje kodem 400/404 albo 500 z „404” / „not found” w polu `detail` - wtedy zwracamy pustą listę.
 * Rzuca `GeocodeError` ('network' | 'aborted') przy problemach z połączeniem.
 */
export async function fetchGeocode(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
	const trimmed = query.trim();
	if (trimmed.length < MIN_GEOCODE_QUERY_LENGTH) return [];

	const baseUrl = API_BASE_URL ?? DEFAULT_GEOCODE_BASE_URL;
	// Ręczne łączenie sygnałów zamiast `AbortSignal.any` (wymaga iOS 17.4+).
	const controller = new AbortController();
	let timedOut = false;
	const timer = setTimeout(() => {
		timedOut = true;
		controller.abort();
	}, GEOCODE_TIMEOUT_MS);
	const forwardAbort = () => controller.abort();
	if (signal?.aborted) controller.abort();
	signal?.addEventListener('abort', forwardAbort, { once: true });

	let response: Response;
	let body: unknown;
	try {
		response = await fetch(`${baseUrl}/api/geocode?query=${encodeURIComponent(trimmed)}`, {
			headers: {
				Accept: 'application/json',
				// Bez tego nagłówka darmowy tunel ngrok zwraca stronę ostrzeżenia w HTML zamiast JSON.
				'ngrok-skip-browser-warning': 'true'
			},
			signal: controller.signal
		});
		const text = await response.text();
		try {
			body = JSON.parse(text);
		} catch {
			body = undefined;
		}
	} catch (error) {
		if (signal?.aborted) throw new GeocodeError('aborted', 'Geocode request aborted');
		throw new GeocodeError(
			'network',
			timedOut ? 'Geocode request timed out' : `Network error: ${(error as Error).message}`
		);
	} finally {
		clearTimeout(timer);
		signal?.removeEventListener('abort', forwardAbort);
	}

	if (!response.ok) {
		if (isNotFoundResponse(response.status, body)) return [];
		throw new GeocodeError('network', `Geocode server responded with ${response.status}`);
	}
	if (body === undefined) throw new GeocodeError('network', 'Geocode server returned non-JSON');

	const items = Array.isArray(body) ? body : [body];
	return dedupe(items.filter(isGeocodeResult));
}

function isNotFoundResponse(status: number, body: unknown): boolean {
	const detail =
		typeof body === 'object' && body !== null && 'detail' in body
			? String((body as { detail: unknown }).detail)
			: '';
	// Wyłączony tunel ngrok też odpowiada 404, ale stroną HTML (bez pola `detail`).
	if (!detail) return false;
	if (status === 400 || status === 404) return true;
	return /404|not found/i.test(detail);
}

function isGeocodeResult(value: unknown): value is GeocodeResult {
	if (typeof value !== 'object' || value === null) return false;
	const { name, lat, lng } = value as Record<string, unknown>;
	return (
		typeof name === 'string' &&
		name.trim() !== '' &&
		typeof lat === 'number' &&
		Number.isFinite(lat) &&
		typeof lng === 'number' &&
		Number.isFinite(lng)
	);
}

function dedupe(results: GeocodeResult[]): GeocodeResult[] {
	const seen = new Set<string>();
	return results.filter((result) => {
		const key = `${result.lat.toFixed(6)},${result.lng.toFixed(6)}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

const NOISE_SEGMENT = /^(województwo|polska$|\d{2}-\d{3}$)/i;

/** Dzieli pełną nazwę na część główną i doprecyzowanie (bez województwa, kraju i kodu pocztowego). */
export function splitPlaceName(name: string): { primary: string; secondary: string } {
	const parts = name
		.split(',')
		.map((part) => part.trim())
		.filter((part) => part && !NOISE_SEGMENT.test(part));
	const [primary = name, ...rest] = parts;
	return { primary, secondary: rest.join(', ') };
}

/** Krótka etykieta do pola „Od” / „Do”, np. „Wawel, Kraków”. */
export function shortPlaceLabel(name: string): string {
	const parts = name
		.split(',')
		.map((part) => part.trim())
		.filter((part) => part && !NOISE_SEGMENT.test(part));
	if (parts.length <= 1) return parts[0] ?? name;
	// Numer domu z Nominatim stoi osobno („abc, 1, …”) - doklejamy go do nazwy ulicy.
	if (/^\d+[a-z]?$/i.test(parts[1]) && parts.length > 2)
		return `${parts[0]} ${parts[1]}, ${parts[2]}`;
	const city = parts.find((part) => part === 'Kraków');
	return city && parts[0] !== city ? `${parts[0]}, ${city}` : `${parts[0]}, ${parts[1]}`;
}
