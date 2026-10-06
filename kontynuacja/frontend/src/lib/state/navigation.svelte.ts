export interface NavigationTarget {
	name: string;
	lat: number;
	lng: number;
}

/* Cel ustawiony poza mapą (np. „Nawiguj” w Udogodnieniach); MapTab odbiera go i czyści. */
export const navigationRequest = $state<{ target: NavigationTarget | null }>({ target: null });
