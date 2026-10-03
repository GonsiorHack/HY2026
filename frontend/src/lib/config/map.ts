// Humanitarian OpenStreetMap (HOT) - highlights footways, steps and amenities.
export const TILE_URL = 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png';
export const TILE_SUBDOMAINS = ['a', 'b', 'c'];

/**
 * Legally required map credits. Leaflet's built-in attribution bar is disabled;
 * this text is rendered in the app's top bar instead (see `routes/+page.svelte`).
 */
export const MAP_ATTRIBUTION_HTML =
	'<a href="https://leafletjs.com" target="_blank" rel="noopener" title="A JavaScript library for interactive maps">Leaflet</a> | ' +
	'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors, ' +
	'Tiles style by <a href="https://www.hotosm.org/" target="_blank" rel="noopener">Humanitarian OpenStreetMap Team</a> ' +
	'hosted by <a href="https://openstreetmap.fr/" target="_blank" rel="noopener">OSM France</a>';
