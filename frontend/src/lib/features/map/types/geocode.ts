export interface GeocodeResult {
	/** Pelna nazwa z geokodera, na przyklad "Wawel, Krakow, wojewodztwo malopolskie, 31-003, Polska" */
	name: string;
	lat: number;
	lng: number;
}

/** Punkt trasy wraz z etykieta wyswietlana w polach "Od" / "Do" */
export interface RoutePlace {
	lat: number;
	lng: number;
	label: string;
}

export type GeocodeErrorKind = 'network' | 'aborted';

/** Stala opcja na poczatku listy podpowiedzi (na przyklad "Twoja lokalizacja") */
export interface QuickOption {
	label: string;
	description?: string;
	onselect: () => void;
}
