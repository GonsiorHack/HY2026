export type LatLngTuple = [number, number];

export interface Waypoint {
	lat: number;
	lng: number;
}

// --- Backend response format (GeoJSON, see `assets/przejazd.txt`) ---

/** GeoJSON position: `[longitude, latitude]` - note the order is the reverse of Leaflet's. */
export type GeoJsonPosition = [number, number];

export interface RouteFeatureProperties {
	/** Backend route identifier, e.g. `"wheelchair_accessible"`. */
	route_type: string;
	distance_m: number;
	time_minutes: number;
	/** `true` = the whole route is passable for a wheelchair; `false` = it has barriers. */
	is_wheelchair_safe: boolean;
}

export interface RouteFeature {
	type: 'Feature';
	properties: RouteFeatureProperties;
	geometry: {
		type: 'LineString';
		coordinates: GeoJsonPosition[];
	};
}

export interface RouteFeatureCollection {
	type: 'FeatureCollection';
	features: RouteFeature[];
}

// --- Format used by the UI (after parsing) ---

/** Drives styling: `wheelchair` = safe (green, dotted), `standard` = has barriers (grey, solid). */
export type RouteType = 'standard' | 'wheelchair';

export interface RouteInfo {
	id: string;
	name: string;
	routeType: string;
	type: RouteType;
	isWheelchairSafe: boolean;
	distanceMeters: number;
	durationMinutes: number;
	/** Leaflet order: `[latitude, longitude]`. */
	coordinates: LatLngTuple[];
}

/** Wheelchair-safe routes first. May contain one route (like the sample) or several. */
export type RouteResponse = RouteInfo[];
