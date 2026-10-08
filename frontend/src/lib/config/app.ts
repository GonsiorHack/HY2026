// Tozsamosc aplikacji i publiczne adresy URL zasobow, reguly wygladu nalezy umieszczac w styles/, nie tutaj
export const APP = {
	name: 'czyPrzejade',
	title: 'czyPrzejade?',
	assistantName: 'Cypek',
	tagline: 'Miasta Bez Barier',
	description:
		'Aplikacja mobilna wspierająca dostępność i poruszanie się po miastach - bez barier.',
	assets: {
		logos: {
			light: '/branding/logo-light.svg',
			dark: '/branding/logo-dark.svg'
		},
		introVideo: '/media/intro/intro.mp4'
	}
} as const;
