import type { LatLngTuple, RouteResponse } from '../types/route';

/**
 * Pobiera porównanie dwóch tras (zwykłej i bez barier) między punktami A i B.
 *
 * PLACEHOLDER: wyznaczanie tras będzie po stronie backendu. Do tego czasu funkcja zwraca
 * dane pokazowe (linia prosta + sztuczny objazd), żeby dało się zbudować i przetestować UI.
 * Docelowo: `fetch('/api/routes/compare', { method: 'POST', body: JSON.stringify({ start, destination }) })`.
 */
export async function fetchRouteComparison(
	start: LatLngTuple,
	destination: LatLngTuple
): Promise<RouteResponse> {
	await new Promise((resolve) => setTimeout(resolve, 400));
	return createMockResponse(start, destination);
}

// --- Dane pokazowe (do usunięcia po podłączeniu backendu) ---

const WALKING_SPEED_KMH = 4.8;
const WHEELCHAIR_SPEED_KMH = 3.6;

function createMockResponse(start: LatLngTuple, destination: LatLngTuple): RouteResponse {
	const [lat1, lng1] = start;
	const [lat2, lng2] = destination;

	// Sztuczny "objazd": dwa punkty przesunięte w bok od linii prostej.
	const offsetLat = -(lng2 - lng1) * 0.25;
	const offsetLng = (lat2 - lat1) * 0.25;
	const detour: LatLngTuple[] = [
		start,
		[lat1 + (lat2 - lat1) * 0.3 + offsetLat, lng1 + (lng2 - lng1) * 0.3 + offsetLng],
		[lat1 + (lat2 - lat1) * 0.7 + offsetLat, lng1 + (lng2 - lng1) * 0.7 + offsetLng],
		destination
	];

	const standardKm = pathLengthKm([start, destination]);
	const wheelchairKm = pathLengthKm(detour);

	return {
		standard: {
			id: 'mock-standard',
			name: 'Trasa standardowa',
			distance: formatDistance(standardKm),
			duration: formatDuration(standardKm, WALKING_SPEED_KMH),
			coordinates: [start, destination],
			type: 'standard'
		},
		wheelchair: {
			id: 'mock-wheelchair',
			name: 'Trasa bez barier',
			distance: formatDistance(wheelchairKm),
			duration: formatDuration(wheelchairKm, WHEELCHAIR_SPEED_KMH),
			coordinates: detour,
			type: 'wheelchair'
		}
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

function formatDistance(km: number): string {
	return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`;
}

function formatDuration(km: number, speedKmh: number): string {
	const minutes = Math.max(1, Math.round((km / speedKmh) * 60));
	return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}
