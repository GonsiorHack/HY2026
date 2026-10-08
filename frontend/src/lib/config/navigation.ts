import type { Tab } from './navigation.types';

interface NavigationTab {
	id: Tab;
	label: string;
	icon: string;
	fullBleed: boolean;
	showTopNav: boolean;
}

export const DEFAULT_TAB: Tab = 'map';

// Kolejnosc tablicy steruje rozmieszczeniem ekranow i kolejnoscia dolnej nawigacji
// Zachowujemy identyfikatory URL, aby zapisane linki ?tab= nadal dzialaly
export const NAVIGATION_TABS: readonly NavigationTab[] = [
	{
		id: 'map',
		label: 'Trasa',
		icon: 'M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2V5z',
		fullBleed: true,
		showTopNav: false
	},
	{
		id: 'facilities',
		label: 'Odkrywaj',
		icon: 'M12 21a9 9 0 100-18 9 9 0 000 18zM15.5 8.5l-2 5-5 2 2-5 5-2z',
		fullBleed: false,
		showTopNav: true
	},
	{
		id: 'chatbot',
		label: 'Asystent',
		icon: 'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3z',
		fullBleed: true,
		showTopNav: true
	},
	{
		id: 'settings',
		label: 'Ustawienia',
		icon: 'M4 6h10M18 6h2M14 6a2 2 0 104 0 2 2 0 10-4 0M4 12h4M12 12h8M8 12a2 2 0 104 0 2 2 0 10-4 0M4 18h12M20 18h0M16 18a2 2 0 104 0 2 2 0 10-4 0',
		fullBleed: false,
		showTopNav: true
	}
];

export function isTab(value: string | null): value is Tab {
	return NAVIGATION_TABS.some((tab) => tab.id === value);
}

export function tabHref(tab: Tab): string {
	return `?tab=${tab}`;
}
