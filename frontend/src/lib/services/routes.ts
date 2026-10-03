import type {
	GeoJsonPosition,
	LatLngTuple,
	RouteFeature,
	RouteFeatureCollection,
	RouteErrorKind,
	RouteInfo,
	RouteResponse
} from '../types/route';
import { DEMO_ROUTE } from '../config/map';
import demoRoutesSnapshot from '../data/demoRoutes.json';

/**
 * Backend do wyznaczania tras (FastAPI + OpenRouteService).
 *
 * Endpointy (GET, parametry: start_lng, start_lat, end_lng, end_lat):
 *   /api/route           -> trasa dostosowana dla wozkow inwalidzkich (omija przeszkody wykryte przez ML)
 *   /api/route-standard  -> zwykla trasa dla pieszych (moze zawierac schody lub kocie lby)
 * Oba zwracaja pojedynczy obiekt GeoJSON typu `Feature` (LineString). Jesli trasa nie istnieje, backend
 * odpowiada kodem HTTP 400 z komunikatem `{ "detail": "Blad ORS ..." }`.
 *
 * Glowny adres URL (Base URL) jest brany ze zmiennej `VITE_API_BASE_URL` w pliku `frontend/.env` (zobacz `.env.example`).
 * Jesli go nie ma, aplikacja korzysta z danych testowych (mock) o takiej samej strukturze jak te z backendu.
 */

const API_BASE_URL: string | undefined =
	import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') || undefined;

export const USING_MOCK_ROUTES = !API_BASE_URL;

// Backend normally answers in ~1.5 s; don't keep the user waiting long when the tunnel is down.
const REQUEST_TIMEOUT_MS = 10_000;

/** Demo points within this distance use the recorded real backend response as the fallback. */
const DEMO_MATCH_RADIUS_M = 30;

// Darmowe tunele ngrok zwracaja strone ostrzegawcza w HTML, chyba ze wyslyamy ten naglowek.
const DEFAULT_HEADERS: HeadersInit = {
	Accept: 'application/geo+json, application/json',
	'ngrok-skip-browser-warning': 'true'
};

export class RouteApiError extends Error {
	constructor(
		readonly kind: RouteErrorKind,
		message: string
	) {
		super(message);
		this.name = 'RouteApiError';
	}
}

/** punkty zbyt bliskie/tozsame - zadne zapytanie nie jest wysylane */
export const MIN_ROUTE_DISTANCE_M = 10;

/**
 * Pobiera rownolegle trase dostosowana dla wozkow oraz trase standardowa.
 *
 * Zwraca (resolve) tylko te trasy, ktore udalo sie znalezc (trasa dla wozkow na pierwszym miejscu).
 * Gdy backend nie znajdzie bezpiecznej trasy dla wozkow, po prostu jej nie zwroci
 * - mozesz to sprawdzic za pomoca `routes.some((r) => r.isWheelchairSafe)`.
 * Wyrzuca blad (reject) `RouteApiError`, jesli nie uda sie zaladowac zadnej z tras.
 */

export async function fetchRouteComparison(
	start: LatLngTuple,
	destination: LatLngTuple,
	signal?: AbortSignal
): Promise<RouteResponse> {
	if (!API_BASE_URL) {
		await new Promise((resolve) => setTimeout(resolve, 400));
		if (signal?.aborted) throw new RouteApiError('aborted', 'Request aborted');
		return parseRouteResponse(createMockFeatureCollection(start, destination));
	}

	const results = await Promise.allSettled([
		requestRoute('/api/route', start, destination, signal),
		requestRoute('/api/route-standard', start, destination, signal)
	]);
	if (signal?.aborted) throw new RouteApiError('aborted', 'Request aborted');

	const routes: RouteInfo[] = [];
	const errors: RouteApiError[] = [];
	for (const result of results) {
		if (result.status === 'rejected') {
			errors.push(toRouteApiError(result.reason));
			continue;
		}
		try {
			routes.push(...parseRouteResponse(result.value));
		} catch (error) {
			errors.push(toRouteApiError(error));
		}
	}

	if (routes.length > 0) {
		if (errors.length > 0) console.warn('Some routes could not be loaded:', errors);
		return sortRoutes(dedupeIds(routes));
	}
	// Prefer the most specific reason: no-route > network > server.
	const priority = ['no-route', 'network', 'server'];
	errors.sort((a, b) => priority.indexOf(a.kind) - priority.indexOf(b.kind));
	const error = errors[0] ?? new RouteApiError('no-route', 'Backend returned no usable route');
	// Backend unreachable / crashed (not "no route exists"): show a hard-coded fallback path.
	if (error.kind === 'network' || error.kind === 'server') {
		console.warn('Routing backend unavailable, using fallback routes:', error);
		return getFallbackRoutes(start, destination);
	}
	throw error;
}

/**
 * Offline fallback used when the backend can't be reached. For the presentation demo points
 * it returns the recorded real backend response (`data/demoRoutes.json`), otherwise mock routes.
 * Every returned route has `fallback: true`.
 */
export function getFallbackRoutes(start: LatLngTuple, destination: LatLngTuple): RouteResponse {
	const isDemo =
		distanceMeters(start, [DEMO_ROUTE.start.lat, DEMO_ROUTE.start.lng]) <= DEMO_MATCH_RADIUS_M &&
		distanceMeters(destination, [DEMO_ROUTE.destination.lat, DEMO_ROUTE.destination.lng]) <=
			DEMO_MATCH_RADIUS_M;
	const data = isDemo ? demoRoutesSnapshot : createMockFeatureCollection(start, destination);
	return parseRouteResponse(data).map((route) => ({ ...route, fallback: true }));
}

// --- HTTP ---

/** Pobiera dane z jednego endpointu trasy i zwraca czysty obiekt JSON (sprawdzony przez `parseRouteResponse`). */
async function requestRoute(
	path: string,
	[startLat, startLng]: LatLngTuple,
	[endLat, endLng]: LatLngTuple,
	signal?: AbortSignal
): Promise<unknown> {
	const query = new URLSearchParams({
		start_lng: String(startLng),
		start_lat: String(startLat),
		end_lng: String(endLng),
		end_lat: String(endLat)
	});

	// Przerwij na zadanie wywolujacego (reset / nowsze zapytanie) albo po przekroczeniu limitu czasu (timeout).
	// (Reczne podpiecie zamiast `AbortSignal.any`, ktore wymaga co najmniej iOS 17.4).
	const controller = new AbortController();
	let timedOut = false;
	const timer = setTimeout(() => {
		timedOut = true;
		controller.abort();
	}, REQUEST_TIMEOUT_MS);
	const forwardAbort = () => controller.abort();
	if (signal?.aborted) controller.abort();
	signal?.addEventListener('abort', forwardAbort, { once: true });

	let response: Response;
	let body: unknown;
	try {
		response = await fetch(`${API_BASE_URL}${path}?${query}`, {
			headers: DEFAULT_HEADERS,
			signal: controller.signal
		});
		body = await readJson(response);
	} catch (error) {
		if (signal?.aborted) throw new RouteApiError('aborted', 'Request aborted');
		if (timedOut) throw new RouteApiError('network', 'Routing server timed out');
		throw new RouteApiError('network', `Network error: ${(error as Error).message}`);
	} finally {
		clearTimeout(timer);
		signal?.removeEventListener('abort', forwardAbort);
	}

	if (!response.ok) {
		const detail = isRecord(body) ? body.detail : undefined;
		// Pole `detail` w formacie JSON przy kodach 400/404 oznacza, ze backend lub ORS nie mogl polaczyc punktow.
		// (Nieaktywny tunel ngrok tez zwraca 404, ale w formie strony HTML, wiec nie bedzie w nim pola `detail`).
		if ((response.status === 400 || response.status === 404) && typeof detail === 'string') {
			throw new RouteApiError('no-route', detail);
		}
		throw new RouteApiError('server', `Routing server responded with ${response.status}`);
	}

	if (body === undefined) throw new RouteApiError('server', 'Routing server returned non-JSON');
	return body;
}

// Pole `detail` w JSON przy 400/404 oznacza, ze backend albo ORS nie dal rady polaczyc punktow trasy.
// (Wylaczony tunel ngrok tez rzuca 404, ale zwraca strone w HTML-u, wiec tego pola po prostu tam nie bedzie).
async function readJson(response: Response): Promise<unknown> {
	const text = await response.text();
	try {
		return JSON.parse(text);
	} catch {
		return undefined;
	}
}

// --- Parsowanie ---

/**
 * Sprawdza poprawnosc GeoJSON-a z backendu - pojedynczy obiekt `Feature` (dzialajace API)
 * albo `FeatureCollection` (`assets/przejazd.txt`) - i przeksztalca go na `RouteInfo[]`.
 * Nieprawidlowe lub zdegenerowane linie (np. pojedynczy punkt, gdy start == end) sa pomijane.
 */

function parseRouteResponse(data: unknown): RouteResponse {
	const features =
		isRecord(data) && data.type === 'FeatureCollection' && Array.isArray(data.features)
			? data.features
			: isRecord(data) && data.type === 'Feature'
				? [data]
				: null;
	if (!features) {
		throw new RouteApiError('server', 'Invalid routes response: expected GeoJSON');
	}

	const routes = features.flatMap((feature, index) => {
		if (!isRouteFeature(feature)) {
			console.warn('Skipping invalid route feature:', feature);
			return [];
		}
		return [toRouteInfo(feature, index)];
	});
	return sortRoutes(routes);
}

/** Przyblizona odleglosc w metrach miedzy dwoma punktami `[lat, lng]`. */
export function distanceMeters(a: LatLngTuple, b: LatLngTuple): number {
	return haversineKm(a, b) * 1000;
}

/** Maksymalna roznica na os (w stopniach, ok. 0.1 m w Krakowie), aby dwa wierzcholki uznac za ten sam punkt. */
export const COORDINATE_EPSILON_DEG = 1e-6;

/** Dokladne dopasowanie geometrii: ta sama liczba wierzcholkow i kazdy wierzcholek w odleglosci nie wiekszej niz `epsilon` stopni. */
export function haveSameGeometry(
	a: RouteInfo,
	b: RouteInfo,
	epsilon = COORDINATE_EPSILON_DEG
): boolean {
	if (a.coordinates.length !== b.coordinates.length) return false;
	return a.coordinates.every(([lat, lng], index) => {
		const [otherLat, otherLng] = b.coordinates[index];
		return Math.abs(lat - otherLat) <= epsilon && Math.abs(lng - otherLng) <= epsilon;
	});
}

/**
 * Usuwa trasy, ktorych geometria duplikuje wczesniejsza, aby nie rysowac nakladajacych sie polilinii.
 * Oczekuje, ze trasy bez barier beda pierwsze (tak jak zwraca `fetchRouteComparison`), wiec
 * wariant bez barier jest zachowywany. `identical` jest prawdziwe, gdy jakakolwiek trasa zostala zredukowana.
 */
export function collapseIdenticalRoutes(routes: RouteInfo[]): {
	routes: RouteInfo[];
	identical: boolean;
} {
	const unique: RouteInfo[] = [];
	for (const route of routes) {
		if (!unique.some((kept) => haveSameGeometry(kept, route))) unique.push(route);
	}
	return { routes: unique, identical: unique.length < routes.length };
}

function sortRoutes(routes: RouteInfo[]): RouteInfo[] {
	return routes.sort((a, b) => Number(b.isWheelchairSafe) - Number(a.isWheelchairSafe));
}

// Oba konce trasy zwracaja indeks 0, wiec nalezy uczynic klucze w `{#each}` unikalnymi.
function dedupeIds(routes: RouteInfo[]): RouteInfo[] {
	return routes.map((route, index) => ({ ...route, id: `${route.routeType}-${index}` }));
}

function toRouteApiError(error: unknown): RouteApiError {
	if (error instanceof RouteApiError) return error;
	return new RouteApiError('server', error instanceof Error ? error.message : String(error));
}

function toRouteInfo({ properties, geometry }: RouteFeature, index: number): RouteInfo {
	const safe = properties.is_wheelchair_safe;
	return {
		id: `${properties.route_type}-${index}`,
		name: safe ? 'Trasa bez barier' : 'Trasa z barierami',
		routeType: properties.route_type,
		type: safe ? 'wheelchair' : 'standard',
		isWheelchairSafe: safe,
		distanceMeters: properties.distance_m,
		durationMinutes: properties.time_minutes,
		note: properties.warning ?? properties.info,
		// GeoJSON is [lng, lat]; Leaflet expects [lat, lng].
		coordinates: geometry.coordinates.map(([lng, lat]) => [lat, lng])
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isPosition(value: unknown): value is GeoJsonPosition {
	return (
		Array.isArray(value) &&
		value.length >= 2 &&
		Number.isFinite(value[0]) &&
		Number.isFinite(value[1])
	);
}

function isRouteFeature(value: unknown): value is RouteFeature {
	if (!isRecord(value) || !isRecord(value.properties) || !isRecord(value.geometry)) return false;
	const { properties: p, geometry: g } = value;
	return (
		typeof p.route_type === 'string' &&
		Number.isFinite(p.distance_m) &&
		Number.isFinite(p.time_minutes) &&
		typeof p.is_wheelchair_safe === 'boolean' &&
		(p.info === undefined || typeof p.info === 'string') &&
		(p.warning === undefined || typeof p.warning === 'string') &&
		g.type === 'LineString' &&
		Array.isArray(g.coordinates) &&
		g.coordinates.length >= 2 &&
		g.coordinates.every(isPosition)
	);
}

// --- Formatowanie interfejsu uzytkownika ---

export function formatDistance(meters: number): string {
	return meters < 1000
		? `${Math.round(meters)} m`
		: `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}

export function formatDuration(minutes: number): string {
	const total = Math.max(1, Math.round(minutes));
	return total < 60 ? `${total} min` : `${Math.floor(total / 60)} h ${total % 60} min`;
}

// --- Dane mock w formacie backendu (uzywane tylko bez VITE_API_BASE_URL) ---

const WALKING_SPEED_KMH = 4.8;
const WHEELCHAIR_SPEED_KMH = 3.6;

function createMockFeatureCollection(
	start: LatLngTuple,
	destination: LatLngTuple
): RouteFeatureCollection {
	const [lat1, lng1] = start;
	const [lat2, lng2] = destination;

	// Sztuczne obejscie: dwa punkty przesuniete na boki wzgledem prostej linii.
	const offsetLat = -(lng2 - lng1) * 0.25;
	const offsetLng = (lat2 - lat1) * 0.25;
	const detour: LatLngTuple[] = [
		start,
		[lat1 + (lat2 - lat1) * 0.3 + offsetLat, lng1 + (lng2 - lng1) * 0.3 + offsetLng],
		[lat1 + (lat2 - lat1) * 0.7 + offsetLat, lng1 + (lng2 - lng1) * 0.7 + offsetLng],
		destination
	];
	const direct: LatLngTuple[] = [start, destination];

	return {
		type: 'FeatureCollection',
		features: [
			mockFeature('wheelchair_accessible', detour, WHEELCHAIR_SPEED_KMH, true),
			mockFeature('shortest', direct, WALKING_SPEED_KMH, false)
		]
	};
}

function mockFeature(
	routeType: string,
	points: LatLngTuple[],
	speedKmh: number,
	safe: boolean
): RouteFeature {
	const meters = pathLengthKm(points) * 1000;
	return {
		type: 'Feature',
		properties: {
			route_type: routeType,
			distance_m: Math.round(meters * 10) / 10,
			time_minutes: Math.round((meters / 1000 / speedKmh) * 60 * 10) / 10,
			is_wheelchair_safe: safe,
			...(safe
				? { info: 'Trasa omija strefy wykryte przez ML oraz schody/krawężniki' }
				: { warning: 'Trasa może zawierać schody lub trudny bruk!' })
		},
		geometry: { type: 'LineString', coordinates: points.map(([lat, lng]) => [lng, lat]) }
	};
}

function pathLengthKm(points: LatLngTuple[]): number {
	let total = 0;
	for (let i = 1; i < points.length; i++) total += haversineKm(points[i - 1], points[i]);
	return total;
}

function haversineKm([lat1, lng1]: LatLngTuple, [lat2, lng2]: LatLngTuple): number {
	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLng = toRad(lng2 - lng1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
	return 6371 * 2 * Math.asin(Math.sqrt(a));
}
