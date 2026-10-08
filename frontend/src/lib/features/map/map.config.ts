export const TILE_URL = 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png';
export const TILE_SUBDOMAINS = ['a', 'b', 'c'];

export const MAP_ATTRIBUTION_HTML =
	'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener" title="OpenStreetMap contributors">OpenStreetMap</a> contributors · ' +
	'<a href="https://www.hotosm.org/" target="_blank" rel="noopener" title="Tiles style by Humanitarian OpenStreetMap Team">HOT</a> · ' +
	'<a href="https://openstreetmap.fr/" target="_blank" rel="noopener" title="Tiles hosted by OSM France">OSM France</a> | ' +
	'<a href="https://leafletjs.com" target="_blank" rel="noopener" title="Leaflet - A JavaScript library for interactive maps">Leaflet</a>';

/** Przyblizone granice Krakowa, od poludniowego zachodu do polnocnego wschodu, poza nimi przycisk lokalizacji wraca do trasy */
export const KRAKOW_BOUNDS: [[number, number], [number, number]] = [
	[49.967, 19.792],
	[50.126, 20.217]
];

export const DEMO_ROUTE = {
	start: { lat: 50.05455889, lng: 19.93239849 },
	destination: { lat: 50.0535173, lng: 19.9334305 }
} as const;
