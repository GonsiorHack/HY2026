export type FacilityCategory = 'Muzea' | 'Sport' | 'Zabytki';

export type AmenityIconType =
	'wheelchair' | 'lift' | 'parking' | 'restroom' | 'komfortka' | 'ear' | 'digital';

/* Pola odpowiadają sekcjom okna szczegółów; brak pola = brak danych w deklaracji dostępności. */
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
	/* Pusty adres oznacza brak zdjęcia - wtedy karta pokazuje ikonę kategorii. */
	image: string;
	alt: string;
	details: AccessibilityDetails;
	/* Punkt docelowy przekazywany do mapy po kliknięciu „Nawiguj”. */
	coordinates: [lat: number, lng: number];
}
