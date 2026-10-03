import type {
	GeoJsonPosition,
	LatLngTuple,
	RouteFeature,
	RouteFeatureCollection,
	RouteInfo,
	RouteResponse
} from '../types/route';

/**
 * Backend endpoint, configured in `frontend/.env` (see `.env.example`):
 *   VITE_ROUTES_API_URL=http://localhost:8000/api/routes
 * When it's not set, the app uses mock data in the same format as the backend.
 */
const ROUTES_API_URL: string | undefined = import.meta.env.VITE_ROUTES_API_URL || undefined;

export const USING_MOCK_ROUTES = !ROUTES_API_URL;

/**
 * Fetches routes between A and B and converts them to the UI format.
 *
 * Request (POST, JSON):  { "start": { "lat", "lng" }, "destination": { "lat", "lng" } }
 * Response: GeoJSON FeatureCollection of LineStrings (example: `assets/przejazd.txt`).
 */
export async function fetchRouteComparison(
	start: LatLngTuple,
	destination: LatLngTuple,
	signal?: AbortSignal
): Promise<RouteResponse> {
	if (!ROUTES_API_URL) {
		await new Promise((resolve) => setTimeout(resolve, 400));
		return parseRouteFeatureCollection(createMockFeatureCollection(start, destination));
	}

	const response = await fetch(ROUTES_API_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/geo+json, application/json'
		},
		body: JSON.stringify({
			start: { lat: start[0], lng: start[1] },
			destination: { lat: destination[0], lng: destination[1] }
		}),
		signal
	});
	if (!response.ok) throw new Error(`Routes API responded with ${response.status}`);

	return parseRouteFeatureCollection(await response.json());
}

/** Validates the backend GeoJSON and maps it to `RouteInfo[]` (wheelchair-safe routes first). */
export function parseRouteFeatureCollection(data: unknown): RouteResponse {
	if (!isRecord(data) || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
		throw new Error('Invalid routes response: expected a GeoJSON FeatureCollection');
	}

	const routes = data.features.flatMap((feature, index) => {
		if (!isRouteFeature(feature)) {
			console.warn('Skipping invalid route feature:', feature);
			return [];
		}
		return [toRouteInfo(feature, index)];
	});

	return routes.sort((a, b) => Number(b.isWheelchairSafe) - Number(a.isWheelchairSafe));
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
		g.type === 'LineString' &&
		Array.isArray(g.coordinates) &&
		g.coordinates.length >= 2 &&
		g.coordinates.every(isPosition)
	);
}

// --- Formatting for the UI ---

export function formatDistance(meters: number): string {
	return meters < 1000
		? `${Math.round(meters)} m`
		: `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}

export function formatDuration(minutes: number): string {
	const total = Math.max(1, Math.round(minutes));
	return total < 60 ? `${total} min` : `${Math.floor(total / 60)} h ${total % 60} min`;
}

// --- Mock data in the backend format (used only without VITE_ROUTES_API_URL) ---

const WALKING_SPEED_KMH = 4.8;
const WHEELCHAIR_SPEED_KMH = 3.6;

function createMockFeatureCollection(
	start: LatLngTuple,
	destination: LatLngTuple
): RouteFeatureCollection {
	const [lat1, lng1] = start;
	const [lat2, lng2] = destination;

	// Fake detour: two points shifted sideways from the straight line.
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
			is_wheelchair_safe: safe
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
