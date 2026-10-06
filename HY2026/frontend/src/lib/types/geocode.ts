export interface GeocodeResult {
	/** Pełna nazwa z geokodera, np. „Wawel, Kraków, województwo małopolskie, 31-003, Polska”. */
	name: string;
	lat: number;
	lng: number;
}

/** Punkt trasy wraz z etykietą wyświetlaną w polach „Od” / „Do”. */
export interface RoutePlace {
	lat: number;
	lng: number;
	label: string;
}

export type GeocodeErrorKind = 'not-found' | 'network' | 'aborted';

/** Stała opcja na początku listy podpowiedzi (np. „Twoja lokalizacja”). */
export interface QuickOption {
	label: string;
	description?: string;
	onselect: () => void;
}
