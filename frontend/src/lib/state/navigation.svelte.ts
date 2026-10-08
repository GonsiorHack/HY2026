export interface NavigationTarget {
	name: string;
	lat: number;
	lng: number;
}
export const navigationRequest = $state<{ target: NavigationTarget | null }>({ target: null });
