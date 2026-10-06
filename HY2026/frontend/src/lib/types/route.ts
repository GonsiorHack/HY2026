export type LatLngTuple = [number, number];

export interface Waypoint {
	lat: number;
	lng: number;
}

export type GeoJsonPosition = [number, number];

export interface RouteFeatureProperties {
	route_type: string;
	distance_m: number;
	time_minutes: number;
	is_wheelchair_safe: boolean;
	info?: string;
	warning?: string;
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

export type RouteType = 'standard' | 'wheelchair';

export type RouteTagTone = 'positive' | 'caution';

/** Krótka, zrozumiała dla użytkownika cecha trasy (nawierzchnia, przeszkody, nachylenie). */
export interface RouteTag {
	label: string;
	tone: RouteTagTone;
}

export interface RouteInfo {
	id: string;
	name: string;
	routeType: string;
	type: RouteType;
	isWheelchairSafe: boolean;
	distanceMeters: number;
	durationMinutes: number;
	tags: RouteTag[];
	/** Zapisana trasa demonstracyjna pokazana, gdy serwer tras jest niedostępny. */
	offline?: boolean;
	coordinates: LatLngTuple[];
}

export type RouteResponse = RouteInfo[];

export type RouteErrorKind = 'no-route' | 'network' | 'server' | 'aborted';
