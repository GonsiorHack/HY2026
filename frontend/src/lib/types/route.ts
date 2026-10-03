export type LatLngTuple = [number, number];

export interface Waypoint {
	lat: number;
	lng: number;
}

export type RouteType = 'standard' | 'wheelchair';

export interface RouteInfo {
	id: string;
	name: string;
	distance: string;
	duration: string;
	coordinates: LatLngTuple[];
	type: RouteType;
}

export interface RouteResponse {
	standard: RouteInfo;
	wheelchair: RouteInfo;
}
