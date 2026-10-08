export type FacilityCategory = 'Muzea' | 'Sport' | 'Zabytki';

export type AmenityIconType =
	'wheelchair' | 'lift' | 'parking' | 'restroom' | 'komfortka' | 'ear' | 'digital';

/* Pola odpowiadaja sekcjom okna szczegolow; brak pola = brak danych w deklaracji dostepnosci */
export interface AccessibilityDetails {
	parking?: string;
	entrance?: string;
	verticalTransport?: string;
	cloakroom?: string;
	restrooms?: string;
	equipmentRental?: string;
	digitalAccess?: string;
	notes?: string;
}

export interface FacilityBadge {
	label: string;
	iconType: AmenityIconType;
}

export interface Facility {
	id: string;
	name: string;
	category: FacilityCategory;
	distance: string;
	address: string;
	verified: boolean;
	verifiedSource: string;
	badges: FacilityBadge[];
	/* Pusty adres oznacza brak zdjecia - wtedy karta pokazuje ikone kategorii */
	image: string;
	alt: string;
	details: AccessibilityDetails;
	/* Punkt docelowy przekazywany do mapy po kliknieciu "Nawiguj" */
	coordinates: [lat: number, lng: number];
}
