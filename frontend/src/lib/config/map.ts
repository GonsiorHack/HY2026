// Humanitarian OpenStreetMap (HOT) - highlights footways, steps and amenities.
export const TILE_URL = 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png';
export const TILE_SUBDOMAINS = ['a', 'b', 'c'];

/**
 * Legally required map credits. Leaflet's built-in attribution bar is disabled;
 * this text is rendered in the app's top bar instead (see `routes/+page.svelte`).
 */
// Short one-line form; full credit names are in the `title` tooltips.
export const MAP_ATTRIBUTION_HTML =
	'<a href="https://leafletjs.com" target="_blank" rel="noopener" title="Leaflet - A JavaScript library for interactive maps">Leaflet</a> | ' +
	'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener" title="OpenStreetMap contributors">OpenStreetMap</a> contributors · ' +
	'<a href="https://www.hotosm.org/" target="_blank" rel="noopener" title="Tiles style by Humanitarian OpenStreetMap Team">HOT</a> · ' +
	'<a href="https://openstreetmap.fr/" target="_blank" rel="noopener" title="Tiles hosted by OSM France">OSM France</a>';
