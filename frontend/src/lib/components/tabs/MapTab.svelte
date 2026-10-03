<script lang="ts">
	import 'leaflet/dist/leaflet.css';
	import type * as Leaflet from 'leaflet';
	import { onMount, tick } from 'svelte';
	import { fetchRouteComparison } from '../../services/routes';
	import type { LatLngTuple, RouteInfo, RouteResponse, Waypoint } from '../../types/route';

	const KRAKOW_CENTER: LatLngTuple = [50.06768366766956, 19.989913515829258];
	const DEFAULT_ZOOM = 16;
	// Humanitarian OpenStreetMap (HOT) - highlights footways, steps and amenities.
	const TILE_URL = 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png';
	const TILE_SUBDOMAINS = ['a', 'b', 'c'];
	const TILE_ATTRIBUTION =
		'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors, ' +
		'Tiles style by <a href="https://www.hotosm.org/" target="_blank" rel="noopener">Humanitarian OpenStreetMap Team</a> ' +
		'hosted by <a href="https://openstreetmap.fr/" target="_blank" rel="noopener">OSM France</a>';
	const ATTRIBUTION_PREFIX =
		'<a href="https://leafletjs.com" target="_blank" rel="noopener" title="A JavaScript library for interactive maps">Leaflet</a>';

	let mapContainer: HTMLDivElement;
	let hintBar = $state<HTMLElement>();
	let summaryCard = $state<HTMLElement>();

	let summaryHeight = $state(0);

	let start = $state<Waypoint | null>(null);
	let destination = $state<Waypoint | null>(null);
	let routes = $state<RouteResponse | null>(null);
	let loading = $state(false);
	let errorMessage = $state<string | null>(null);

	let L: typeof Leaflet | undefined;
	let map: Leaflet.Map | undefined;
	let overlayLayer: Leaflet.LayerGroup | undefined;
	let zoomControl: Leaflet.Control.Zoom | undefined;
	let requestId = 0;

	const hint = $derived(
		loading
			? 'Wyznaczanie tras…'
			: !start
				? 'Dotknij mapy, aby wybrać punkt startowy (A).'
				: !destination
					? 'Teraz wybierz cel podróży (B).'
					: null
	);

	onMount(() => {
		let destroyed = false;
		let resizeObserver: ResizeObserver | undefined;

		import('leaflet').then((module) => {
			if (destroyed) return;
			L = module.default;

			map = L.map(mapContainer, { zoomControl: false }).setView(KRAKOW_CENTER, DEFAULT_ZOOM);
			map.attributionControl.setPrefix(ATTRIBUTION_PREFIX);
			zoomControl = L.control.zoom({ position: 'bottomright' }).addTo(map);
			L.tileLayer(TILE_URL, {
				attribution: TILE_ATTRIBUTION,
				subdomains: TILE_SUBDOMAINS,
				maxZoom: 19
			}).addTo(map);
			overlayLayer = L.layerGroup().addTo(map);
			map.on('click', handleMapClick);

			map.invalidateSize();
			resizeObserver = new ResizeObserver(() => map?.invalidateSize());
			resizeObserver.observe(mapContainer);
		});

		return () => {
			destroyed = true;
			resizeObserver?.disconnect();
			map?.off('click', handleMapClick);
			map?.remove();
			map = overlayLayer = zoomControl = L = undefined;
		};
	});

	function handleMapClick(event: Leaflet.LeafletMouseEvent) {
		if (destination || loading) return;
		const point: Waypoint = { lat: event.latlng.lat, lng: event.latlng.lng };

		if (!start) {
			start = point;
			addWaypointMarker(point, 'start');
			return;
		}

		destination = point;
		addWaypointMarker(point, 'destination');
		loadRoutes(start, destination);
	}

	function addWaypointMarker(point: Waypoint, kind: 'start' | 'destination') {
		if (!L || !overlayLayer) return;
		const label = kind === 'start' ? 'A' : 'B';
		const icon = L.divIcon({
			className: `map-marker map-marker--${kind}`,
			html: `<span>${label}</span>`,
			iconSize: null as unknown as Leaflet.PointExpression
		});
		L.marker([point.lat, point.lng], {
			icon,
			keyboard: false,
			title: kind === 'start' ? 'Start (A)' : 'Cel (B)'
		}).addTo(overlayLayer);
	}

	async function loadRoutes(from: Waypoint, to: Waypoint) {
		const currentRequest = ++requestId;
		loading = true;
		errorMessage = null;

		try {
			const response = await fetchRouteComparison([from.lat, from.lng], [to.lat, to.lng]);
			if (currentRequest !== requestId) return;
			routes = response;
			drawRoutes(response);
		} catch (error) {
			if (currentRequest !== requestId) return;
			console.error('Route comparison failed:', error);
			errorMessage = 'Nie udało się wyznaczyć tras. Spróbuj ponownie.';
		} finally {
			if (currentRequest === requestId) loading = false;
		}
	}

	async function drawRoutes(response: RouteResponse) {
		if (!L || !map || !overlayLayer) return;

		for (const route of [response.standard, response.wheelchair]) {
			L.polyline(route.coordinates, {
				className: `route-line route-line--${route.type}`,
				interactive: false
			}).addTo(overlayLayer);
		}

		await tick();
		if (!map) return;
		const spacing = parseFloat(getComputedStyle(mapContainer).getPropertyValue('--odstep-duzy'));
		const bounds = L.latLngBounds([
			...response.standard.coordinates,
			...response.wheelchair.coordinates
		]);
		const zoomEl = zoomControl?.getContainer();
		const zoomInset = zoomEl
			? mapContainer.getBoundingClientRect().right - zoomEl.getBoundingClientRect().left
			: 0;
		map.fitBounds(bounds, {
			paddingTopLeft: [spacing, spacing + (hintBar?.offsetHeight ?? 0)],
			paddingBottomRight: [spacing + zoomInset, spacing + (summaryCard?.offsetHeight ?? 0)]
		});
	}

	function reset() {
		requestId++;
		overlayLayer?.clearLayers();
		start = destination = routes = errorMessage = null;
		loading = false;
		summaryHeight = 0;
		map?.setView(KRAKOW_CENTER, DEFAULT_ZOOM);
	}

	function routeLabel(route: RouteInfo) {
		return route.type === 'wheelchair' ? 'Bez barier' : 'Standardowa';
	}
</script>

<section class="map-tab" style:--wysokosc-panelu-tras="{summaryHeight}px">
	<div class="map-canvas" class:has-summary={summaryHeight > 0} bind:this={mapContainer}></div>

	<div class="map-top" bind:this={hintBar}>
		{#if hint}
			<p class="map-hint" aria-live="polite">{hint}</p>
		{/if}
		{#if start}
			<button class="reset-btn" type="button" onclick={reset}>Wyczyść</button>
		{/if}
	</div>

	{#if routes || errorMessage}
		<div
			class="route-summary"
			bind:this={summaryCard}
			bind:offsetHeight={summaryHeight}
			aria-live="polite"
		>
			{#if errorMessage}
				<p class="summary-error">{errorMessage}</p>
			{:else if routes}
				<ul class="route-list">
					{#each [routes.wheelchair, routes.standard] as route (route.id)}
						<li class="route-row">
							<span class="legend-line legend-line--{route.type}" aria-hidden="true"></span>
							<div class="route-text">
								<strong>{route.name}</strong>
								<span class="route-meta">{route.distance} · {route.duration}</span>
							</div>
							<span class="route-tag route-tag--{route.type}">{routeLabel(route)}</span>
						</li>
					{/each}
				</ul>
				<p class="summary-note">Dane przykładowe - trasy wyznaczy serwer.</p>
			{/if}
		</div>
	{/if}
</section>

<style>
	.map-tab {
		position: relative;
		height: 100%;
		min-height: 100%;
		margin: 0;
		padding: 0;
		overflow: hidden;
		border: none;
		border-radius: 0;
		outline: none;
		box-shadow: none;
		background: var(--kolor-tla-mapy);
	}

	.map-canvas {
		position: absolute;
		z-index: 0;
		inset: 0;
		isolation: isolate;
		border: none;
		outline: none;
		box-shadow: none;
		background: var(--kolor-tla-mapy);
		font-family: inherit;
	}

	.map-canvas:focus-visible {
		outline: 2px solid var(--kolor-linku-mapy);
		outline-offset: -2px;
	}

	.map-top {
		position: absolute;
		z-index: 1;
		top: 0;
		right: 0;
		left: 0;
		display: flex;
		align-items: flex-start;
		gap: var(--odstep-maly);
		padding: var(--odstep-sredni);
		padding-right: max(var(--odstep-sredni), env(safe-area-inset-right, 0px));
		padding-left: max(var(--odstep-sredni), env(safe-area-inset-left, 0px));
		pointer-events: none;
	}

	.map-hint,
	.reset-btn {
		pointer-events: auto;
		box-shadow: var(--cien-panelu-mapy);
	}

	.map-hint {
		flex: 1;
		margin: 0;
		padding: var(--odstep-maly) var(--odstep-sredni);
		border: 1px solid var(--kolor-obramowania);
		border-radius: var(--zaokraglenie-srednie);
		background: var(--kolor-tla-przezroczystej-karty);
		color: var(--kolor-tekstu-podstawowego);
		font-size: 0.875rem;
		font-weight: 600;
	}

	.reset-btn {
		margin-left: auto;
		padding: var(--odstep-maly) var(--odstep-sredni);
		border: none;
		border-radius: var(--zaokraglenie-pelne);
		background: var(--kolor-tla-karty);
		color: var(--kolor-wyroznienia);
		font-size: 0.875rem;
		font-weight: 700;
		cursor: pointer;
	}

	.reset-btn:focus-visible {
		outline: 2px solid var(--kolor-wyroznienia);
		outline-offset: 2px;
	}

	.route-summary {
		position: absolute;
		z-index: 1;
		right: max(var(--odstep-sredni), env(safe-area-inset-right, 0px));
		bottom: max(var(--odstep-sredni), env(safe-area-inset-bottom, 0px));
		left: max(var(--odstep-sredni), env(safe-area-inset-left, 0px));
		display: flex;
		flex-direction: column;
		gap: var(--odstep-maly);
		padding: var(--odstep-sredni);
		border: 1px solid var(--kolor-obramowania);
		border-radius: var(--zaokraglenie-duze);
		background: var(--kolor-tla-przezroczystej-karty);
		box-shadow: var(--cien-panelu-mapy);
		color: var(--kolor-tekstu-podstawowego);
	}

	.route-list {
		display: flex;
		flex-direction: column;
		gap: var(--odstep-maly);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.route-row {
		display: flex;
		align-items: center;
		gap: var(--odstep-sredni);
	}

	.legend-line {
		flex-shrink: 0;
		width: var(--rozmiar-znacznika-mapy);
		height: 0;
		border-top: var(--grubosc-linii-trasy) solid var(--kolor-trasy-standardowej);
		border-radius: var(--zaokraglenie-pelne);
	}

	.legend-line--wheelchair {
		border-top-style: dotted;
		border-top-color: var(--kolor-trasy-bez-barier);
	}

	.route-text {
		display: flex;
		min-width: 0;
		flex: 1;
		flex-direction: column;
		font-size: 0.875rem;
	}

	.route-meta {
		color: var(--kolor-tekstu-drugorzednego);
		font-size: 0.8125rem;
	}

	.route-tag {
		padding: var(--odstep-bardzo-maly) var(--odstep-maly);
		border-radius: var(--zaokraglenie-male);
		background: var(--kolor-tla-elementu-drugorzednego);
		color: var(--kolor-tekstu-podstawowego);
		font-size: 0.6875rem;
		font-weight: 700;
		white-space: nowrap;
	}

	.route-tag--wheelchair {
		background: var(--kolor-trasy-bez-barier);
		color: var(--kolor-tekstu-na-znaczniku);
	}

	.summary-note,
	.summary-error {
		margin: 0;
		font-size: 0.75rem;
	}

	.summary-note {
		color: var(--kolor-tekstu-drugorzednego);
	}

	.summary-error {
		color: var(--kolor-tekstu-ostrzezenia);
		font-weight: 600;
	}

	.map-canvas :global(.leaflet-tile) {
		filter: none;
	}

	.map-canvas.has-summary :global(.leaflet-bottom) {
		bottom: calc(var(--wysokosc-panelu-tras) + var(--odstep-sredni));
	}

	.map-canvas :global(.leaflet-bar) {
		border: 1px solid var(--kolor-obramowania-kontrolek-mapy);
		border-radius: var(--zaokraglenie-srednie);
		box-shadow: var(--cien-znacznika-mapy);
		overflow: hidden;
	}

	.map-canvas :global(.leaflet-bar a) {
		border-bottom-color: var(--kolor-obramowania-kontrolek-mapy);
		background: var(--kolor-tla-kontrolek-mapy);
		color: var(--kolor-tekstu-kontrolek-mapy);
	}

	.map-canvas :global(.leaflet-control-attribution) {
		background: var(--kolor-tla-kontrolek-mapy);
		color: var(--kolor-tekstu-kontrolek-mapy);
	}

	.map-canvas :global(.leaflet-control-attribution a) {
		color: var(--kolor-linku-mapy);
	}

	.map-canvas :global(.route-line) {
		fill: none;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-opacity: 1;
		stroke-width: var(--grubosc-linii-trasy);
	}

	.map-canvas :global(.route-line--standard) {
		stroke: var(--kolor-trasy-standardowej);
	}

	.map-canvas :global(.route-line--wheelchair) {
		stroke: var(--kolor-trasy-bez-barier);
		stroke-dasharray: var(--wzor-przerywanej-trasy);
	}

	.map-canvas :global(.map-marker) {
		display: grid;
		width: var(--rozmiar-znacznika-mapy);
		height: var(--rozmiar-znacznika-mapy);
		margin-top: calc(var(--rozmiar-znacznika-mapy) / -2);
		margin-left: calc(var(--rozmiar-znacznika-mapy) / -2);
		place-items: center;
		border: var(--grubosc-obwodki-znacznika) solid var(--kolor-obwodki-znacznika);
		border-radius: var(--zaokraglenie-pelne);
		box-shadow: var(--cien-znacznika-mapy);
		color: var(--kolor-tekstu-na-znaczniku);
		font-size: 0.875rem;
		font-weight: 800;
	}

	.map-canvas :global(.map-marker--start) {
		background: var(--kolor-punktu-startu);
	}

	.map-canvas :global(.map-marker--destination) {
		background: var(--kolor-punktu-celu);
	}
</style>
