import type { MobilityProfile, TextSize, Theme } from '../types/settings';

type Option<T extends string> = { value: T; label: string; description?: string };

export const themes: Option<Theme>[] = [
	{ value: 'light', label: 'Jasny' },
	{ value: 'dark', label: 'Ciemny' }
];

export const textSizes: Option<TextSize>[] = [
	{ value: 'standard', label: 'Standard' },
	{ value: 'large', label: 'Duży' },
	{ value: 'x-large', label: 'Bardzo duży' }
];

const mobilityProfiles: Option<MobilityProfile>[] = [
	{
		value: 'manual-wheelchair',
		label: 'Wózek manualny',
		description: 'Omija schody, strome podjazdy i wysokie krawężniki.'
	},
	{
		value: 'electric-wheelchair',
		label: 'Wózek elektryczny',
		description: 'Uwzględnia szerokość przejść i dostępne windy.'
	},
	{
		value: 'low-vision',
		label: 'Słaby wzrok',
		description: 'Preferuje trasy ze ścieżkami dotykowymi i dźwiękową sygnalizacją.'
	},
	{
		value: 'senior',
		label: 'Senior',
		description: 'Krótsze odcinki, ławki do odpoczynku i mniej przesiadek.'
	},
	{
		value: 'stroller',
		label: 'Wózek dziecięcy',
		description: 'Omija schody i wybiera równą nawierzchnię.'
	}
];

const STORAGE_KEY = 'krakow-dostepny:ustawienia';

function isOption<T extends string>(options: Option<T>[], value: unknown): value is T {
	return options.some((option) => option.value === value);
}

class AppSettings {
	theme = $state<Theme>('dark');
	highContrast = $state(false);
	textSize = $state<TextSize>('standard');
	mobilityProfile = $state<MobilityProfile>('manual-wheelchair');
	vibrationIntensity = $state(50);
	visualTransitAlerts = $state(true);
	useConversationContext = $state(true);
	animateReplies = $state(true);
	// Tylko lokalna preferencja; nie uruchamia zbierania danych ani treningu
	aiImprovementOptIn = $state(false);

	restore(storage: Storage) {
		let saved: unknown;
		try {
			saved = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null');
		} catch {
			return;
		}
		if (typeof saved !== 'object' || saved === null) return;

		const values = saved as Record<string, unknown>;
		if (typeof values.animateReplies === 'boolean') {
			this.animateReplies = values.animateReplies;
		}
		if (typeof values.useConversationContext === 'boolean') {
			this.useConversationContext = values.useConversationContext;
		}
		if (typeof values.aiImprovementOptIn === 'boolean') {
			this.aiImprovementOptIn = values.aiImprovementOptIn;
		}
		if (isOption(themes, values.theme)) this.theme = values.theme;
		if (typeof values.highContrast === 'boolean') this.highContrast = values.highContrast;
		if (values.theme === 'contrast') {
			this.theme = 'dark';
			this.highContrast = true;
		}
		if (isOption(textSizes, values.textSize)) this.textSize = values.textSize;
		if (isOption(mobilityProfiles, values.mobilityProfile)) {
			this.mobilityProfile = values.mobilityProfile;
		}
		if (
			typeof values.vibrationIntensity === 'number' &&
			values.vibrationIntensity >= 0 &&
			values.vibrationIntensity <= 100
		) {
			this.vibrationIntensity = values.vibrationIntensity;
		}
		if (typeof values.visualTransitAlerts === 'boolean') {
			this.visualTransitAlerts = values.visualTransitAlerts;
		}
	}

	persist(storage: Storage) {
		const snapshot = JSON.stringify({
			theme: this.theme,
			highContrast: this.highContrast,
			textSize: this.textSize,
			mobilityProfile: this.mobilityProfile,
			vibrationIntensity: this.vibrationIntensity,
			visualTransitAlerts: this.visualTransitAlerts,
			useConversationContext: this.useConversationContext,
			animateReplies: this.animateReplies,
			aiImprovementOptIn: this.aiImprovementOptIn
		});
		try {
			storage.setItem(STORAGE_KEY, snapshot);
		} catch {}
	}
}

export const settings = new AppSettings();
