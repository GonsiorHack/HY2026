export type CardProgramCategory =
	'Dla osób z orzeczeniem' | 'Dla rodzin (KKR „N”)' | 'Dla seniorów';

export interface CardProgram {
	id: string;
	title: string;
	shortName: string;
	category: CardProgramCategory;
	issuer: string;
	/* Jedno krotkie zdanie na liscie - pelne informacje sa w oknie szczegolow */
	summary: string;
	cardDesign: {
		bgGradient: string;
		textColor: string;
		badgeText: string;
		cardNumberMask: string;
	};
	benefits: string[];
	eligibility: string[];
	requiredDocs: string[];
	officialSourceUrl: string;
	sourceLabel: string;
	applicationSteps: string[];
	/* Czas i koszt zalatwienia sprawy - pokazywane w instrukcji krok po kroku */
	processingTime?: string;
	contactInfo: {
		office: string;
		address: string;
		phone?: string;
		hours?: string;
	};
}
