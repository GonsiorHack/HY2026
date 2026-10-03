<script lang="ts">
	import 'leaflet/dist/leaflet.css';
	import type * as Leaflet from 'leaflet';
	import { onMount, tick } from 'svelte';
	import {
		MIN_ROUTE_DISTANCE_M,
		RouteApiError,
		USING_MOCK_ROUTES,
		collapseIdenticalRoutes,
		distanceMeters,
		fetchRouteComparison,
		formatDistance,
		formatDuration
	} from '../../services/routes';
	import type { LatLngTuple, RouteInfo, RouteResponse, Waypoint } from '../../types/route';
	import { DEMO_ROUTE, TILE_SUBDOMAINS, TILE_URL } from '../../config/map';
	import ReportObstacle from '#lib/components/ReportObstacle.svelte';

	type WaypointKind = 'start' | 'destination';
	interface Toast {
		message: string;
		tone: 'error' | 'warning' | 'info';
		/** Shows a "Spróbuj ponownie" button (network / server failures). */
		retry?: boolean;
	}

	const KRAKOW_CENTER: LatLngTuple = [50.06768366766956, 19.989913515829258];
	const DEFAULT_ZOOM = 16;
	const TOAST_TIMEOUT_MS = 8000;

	let mapContainer: HTMLDivElement;
	let hintBar = $state<HTMLElement>();
	let summaryCard = $state<HTMLElement>();
	let summaryHeight = $state(0);

	let start = $state<Waypoint | null>(null);
	let destination = $state<Waypoint | null>(null);
	let routes = $state<RouteResponse | null>(null);
	/** Both endpoints returned the same geometry - only one route is drawn and listed. */
	let identicalRoutes = $state(false);
	let loading = $state(false);
	let toast = $state<Toast | null>(null);

	let L: typeof Leaflet | undefined;
	let map: Leaflet.Map | undefined;
	let markersLayer: Leaflet.LayerGroup | undefined;
	let routesLayer: Leaflet.LayerGroup | undefined;
	let zoomControl: Leaflet.Control.Zoom | undefined;
	const markers: Partial<Record<WaypointKind, Leaflet.Marker>> = {};
	let requestId = 0;
	let abortController: AbortController | undefined;

	const hint = $derived(
		loading
			? 'Wyznaczanie trasy…'
			: !start
				? 'Dotknij mapy, aby wybrać punkt startowy (A).'
				: !destination
					? 'Teraz wybierz cel podróży (B).'
					: 'Przeciągnij A lub B, aby zmienić trasę.'
	);

	// Auto-hide informational toasts; ones with a retry action stay until handled.
	$effect(() => {
		if (!toast || toast.retry) return;
		const timer = setTimeout(() => (toast = null), TOAST_TIMEOUT_MS);
		return () => clearTimeout(timer);
	});

	onMount(() => {
		let destroyed = false;
		let resizeObserver: ResizeObserver | undefined;

		import('leaflet').then((module) => {
			if (destroyed) return;
			L = module.default;

			// Attribution is rendered in the app's top bar (MAP_ATTRIBUTION_HTML), not over the map.
			map = L.map(mapContainer, { zoomControl: false, attributionControl: false }).setView(
				KRAKOW_CENTER,
				DEFAULT_ZOOM
			);
			zoomControl = L.control.zoom({ position: 'bottomright' }).addTo(map);
			L.tileLayer(TILE_URL, {
				subdomains: TILE_SUBDOMAINS,
				maxZoom: 19
			}).addTo(map);
			// Routes below markers, so A/B stay grabbable on top of the lines.
			routesLayer = L.layerGroup().addTo(map);
			markersLayer = L.layerGroup().addTo(map);
			map.on('click', handleMapClick);

			map.invalidateSize();
			resizeObserver = new ResizeObserver(() => map?.invalidateSize());
			resizeObserver.observe(mapContainer);
		});

		return () => {
			destroyed = true;
			abortController?.abort();
			resizeObserver?.disconnect();
			map?.off('click', handleMapClick);
			map?.remove();
			map = markersLayer = routesLayer = zoomControl = L = undefined;
			delete markers.start;
			delete markers.destination;
		};
	});

	// --- Point selection ---

	function handleMapClick(event: Leaflet.LeafletMouseEvent) {
		if (loading) return;
		const point: Waypoint = { lat: event.latlng.lat, lng: event.latlng.lng };

		if (!start) {
			start = point;
			placeMarker('start', point);
			toast = null;
			return;
		}
		// Both points set: changes happen by dragging the markers (or "Wyczyść").
		if (destination) return;

		if (isTooClose(start, point)) {
			showSamePointToast();
			return;
		}
		destination = point;
		placeMarker('destination', point);
		requestRoutes();
	}

	function placeMarker(kind: WaypointKind, point: Waypoint) {
		if (!L || !markersLayer) return;
		const existing = markers[kind];
		if (existing) {
			existing.setLatLng([point.lat, point.lng]);
			return;
		}

		const icon = L.divIcon({
			className: `map-marker map-marker--${kind}`,
			html: `<span>${kind === 'start' ? 'A' : 'B'}</span>`,
			iconSize: null as unknown as Leaflet.PointExpression
		});
		const marker = L.marker([point.lat, point.lng], {
			icon,
			draggable: true,
			autoPan: true,
			keyboard: false,
			title:
				kind === 'start'
					? 'Start (A) - przeciągnij, aby zmienić'
					: 'Cel (B) - przeciągnij, aby zmienić'
		}).addTo(markersLayer);
		marker.on('dragend', () => handleMarkerDrag(kind, marker.getLatLng()));
		markers[kind] = marker;
	}

	function handleMarkerDrag(kind: WaypointKind, latlng: Leaflet.LatLng) {
		const point: Waypoint = { lat: latlng.lat, lng: latlng.lng };
		if (kind === 'start') start = point;
		else destination = point;

		if (!start || !destination) return;
		if (isTooClose(start, destination)) {
			cancelRequest();
			clearRoutes();
			showSamePointToast();
			return;
		}
		requestRoutes();
	}

	/** Places the preset A/B markers, frames them and fetches both routes. */
	function loadDemoRoute() {
		if (!map) return;
		start = { ...DEMO_ROUTE.start };
		destination = { ...DEMO_ROUTE.destination };
		placeMarker('start', start);
		placeMarker('destination', destination);
		const spacing = parseFloat(getComputedStyle(mapContainer).getPropertyValue('--odstep-duzy'));
		map.fitBounds(
			[
				[start.lat, start.lng],
				[destination.lat, destination.lng]
			],
			{
				paddingTopLeft: [spacing, spacing + (hintBar?.offsetHeight ?? 0)],
				paddingBottomRight: [spacing, spacing]
			}
		);
		requestRoutes();
	}

	function isTooClose(a: Waypoint, b: Waypoint) {
		return distanceMeters([a.lat, a.lng], [b.lat, b.lng]) < MIN_ROUTE_DISTANCE_M;
	}

	function showSamePointToast() {
		toast = {
			tone: 'warning',
			message: 'Start i cel są w tym samym miejscu. Wybierz cel w innym punkcie.'
		};
	}

	// --- Backend request ---

	async function requestRoutes() {
		if (!start || !destination) return;
		const from: LatLngTuple = [start.lat, start.lng];
		const to: LatLngTuple = [destination.lat, destination.lng];

		cancelRequest();
		const currentRequest = requestId;
		const controller = (abortController = new AbortController());
		clearRoutes();
		toast = null;
		loading = true;

		try {
			const response = await fetchRouteComparison(from, to, controller.signal);
			if (currentRequest !== requestId) return;

			const { routes: visibleRoutes, identical } = collapseIdenticalRoutes(response);
			routes = visibleRoutes;
			identicalRoutes = identical;
			if (visibleRoutes.some((route) => route.fallback)) {
				toast = {
					tone: 'warning',
					retry: true,
					message:
						'Serwer tras jest niedostępny - pokazano trasę zapasową (offline). Spróbuj ponownie za chwilę.'
				};
			} else if (!visibleRoutes.some((route) => route.isWheelchairSafe)) {
				toast = {
					tone: 'warning',
					message:
						'Brak trasy dostępnej dla wózka między tymi punktami. Pokazano trasę standardową - może zawierać bariery.'
				};
			} else if (identical) {
				toast = {
					tone: 'info',
					message: 'Obie wyznaczone trasy są identyczne - wyświetlono jedną ścieżkę.'
				};
			}
			await drawRoutes(visibleRoutes);
		} catch (error) {
			if (currentRequest !== requestId) return;
			const kind = error instanceof RouteApiError ? error.kind : 'server';
			if (kind === 'aborted') return;
			console.error('Route request failed:', error);
			toast = errorToast(kind);
		} finally {
			if (currentRequest === requestId) loading = false;
		}
	}

	function errorToast(kind: RouteApiError['kind']): Toast {
		switch (kind) {
			case 'no-route':
				return {
					tone: 'error',
					message: 'Nie istnieje trasa między wybranymi punktami. Przesuń A lub B w inne miejsce.'
				};
			case 'network':
				return {
					tone: 'error',
					retry: true,
					message: 'Brak połączenia z serwerem tras. Sprawdź internet i spróbuj ponownie.'
				};
			default:
				return {
					tone: 'error',
					retry: true,
					message: 'Serwer tras zwrócił błąd. Spróbuj ponownie za chwilę.'
				};
		}
	}

	/** Invalidates any in-flight request so its result is ignored. */
	function cancelRequest() {
		requestId++;
		abortController?.abort();
		abortController = undefined;
		loading = false;
	}

	// --- Drawing ---

	function clearRoutes() {
		routesLayer?.clearLayers();
		routes = null;
		identicalRoutes = false;
		summaryHeight = 0;
	}

	async function drawRoutes(response: RouteResponse) {
		if (!L || !map || !routesLayer) return;

		// Barrier routes first so the wheelchair-safe ones are drawn on top.
		for (const route of [...response].reverse()) {
			L.polyline(route.coordinates, {
				className: `route-line route-line--${route.type}`,
				interactive: false
			}).addTo(routesLayer);
		}

		await tick();
		if (!map) return;
		const spacing = parseFloat(getComputedStyle(mapContainer).getPropertyValue('--odstep-duzy'));
		const bounds = L.latLngBounds(response.flatMap((route) => route.coordinates));
		if (start) bounds.extend([start.lat, start.lng]);
		if (destination) bounds.extend([destination.lat, destination.lng]);
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
		cancelRequest();
		clearRoutes();
		markersLayer?.clearLayers();
		delete markers.start;
		delete markers.destination;
		start = destination = toast = null;
		map?.setView(KRAKOW_CENTER, DEFAULT_ZOOM);
	}

	function routeLabel(route: RouteInfo) {
		if (identicalRoutes) return 'Obie trasy';
		return route.isWheelchairSafe ? 'Dla wózka' : 'Bariery';
	}
</script>

<section
	class="map-tab"
	aria-busy={loading}
	style:--wysokosc-panelu-tras="{summaryHeight}px"
	style:--przesuniecie-zgloszenia={summaryHeight > 0
		? `calc(${summaryHeight}px + var(--odstep-sredni))`
		: '0px'}
>
	<div class="map-canvas" class:has-summary={summaryHeight > 0} bind:this={mapContainer}></div>

	<div class="map-top" bind:this={hintBar}>
		<div class="map-top-row">
			<p class="map-hint" aria-live="polite">
				{#if loading}<span class="spinner" aria-hidden="true"></span>{/if}
				{hint}
			</p>
			<div class="top-actions">
				<button
					class="demo-btn"
					type="button"
					onclick={loadDemoRoute}
					disabled={loading}
					title="Wczytaj przykładową trasę do prezentacji">Demo</button
				>
				{#if start}
					<button class="reset-btn" type="button" onclick={reset}>Wyczyść</button>
				{/if}
			</div>
		</div>

		{#if toast}
			<div
				class="map-toast map-toast--{toast.tone}"
				role={toast.tone === 'error' ? 'alert' : 'status'}
			>
				<p>{toast.message}</p>
				<div class="toast-actions">
					{#if toast.retry}
						<button type="button" class="toast-btn" onclick={requestRoutes}>Spróbuj ponownie</button
						>
					{/if}
					<button
						type="button"
						class="toast-btn toast-btn--close"
						aria-label="Zamknij komunikat"
						onclick={() => (toast = null)}>&times;</button
					>
				</div>
			</div>
		{/if}
	</div>

	{#if routes && routes.length > 0}
		<div
			class="route-summary"
			bind:this={summaryCard}
			bind:offsetHeight={summaryHeight}
			aria-live="polite"
		>
			<ul class="route-list">
				{#each routes as route (route.id)}
					<li class="route-row">
						<span class="legend-line legend-line--{route.type}" aria-hidden="true"></span>
						<div class="route-text">
							<strong>{route.name}</strong>
							<span class="route-meta"
								>{formatDistance(route.distanceMeters)} · {formatDuration(
									route.durationMinutes
								)}</span
							>
							{#if identicalRoutes}
								<span class="route-identical"
									>Trasa bez barier i standardowa pokrywają się - ten sam przebieg, dystans i czas.</span
								>
							{/if}
							{#if route.note}
								<span class="route-note">{route.note}</span>
							{/if}
						</div>
						<span class="route-tag route-tag--{route.type}">{routeLabel(route)}</span>
					</li>
				{/each}
			</ul>
			{#if USING_MOCK_ROUTES}
				<p class="summary-note">Dane przykładowe - trasy wyznaczy serwer.</p>
			{:else if routes.some((route) => route.fallback)}
				<p class="summary-note">Trasa zapasowa (offline) - serwer tras jest niedostępny.</p>
			{/if}
		</div>
	{/if}

	<ReportObstacle />
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
		flex-direction: column;
		gap: var(--odstep-maly);
		padding: var(--odstep-sredni);
		padding-right: max(var(--odstep-sredni), env(safe-area-inset-right, 0px));
		padding-left: max(var(--odstep-sredni), env(safe-area-inset-left, 0px));
		pointer-events: none;
	}

	.map-top-row {
		display: flex;
		align-items: flex-start;
		gap: var(--odstep-maly);
	}

	.map-hint,
	.reset-btn,
	.demo-btn,
	.map-toast {
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

	.map-hint {
		display: flex;
		align-items: center;
		gap: var(--odstep-maly);
	}

	.spinner {
		flex-shrink: 0;
		width: 1em;
		height: 1em;
		border: 2px solid var(--kolor-obramowania);
		border-top-color: var(--kolor-wyroznienia);
		border-radius: var(--zaokraglenie-pelne);
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation-duration: 2.4s;
		}
	}

	.map-toast {
		display: flex;
		align-items: flex-start;
		gap: var(--odstep-maly);
		padding: var(--odstep-maly) var(--odstep-sredni);
		border: 1px solid var(--kolor-obramowania-ostrzezenia);
		border-radius: var(--zaokraglenie-srednie);
		background: var(--kolor-tla-ostrzezenia);
		color: var(--kolor-tekstu-ostrzezenia);
		font-size: 0.8125rem;
		font-weight: 600;
	}

	.map-toast--warning,
	.map-toast--info {
		border-color: var(--kolor-obramowania);
		background: var(--kolor-tla-przezroczystej-karty);
		color: var(--kolor-tekstu-podstawowego);
	}

	.map-toast p {
		flex: 1;
		margin: 0;
		padding-block: var(--odstep-bardzo-maly);
	}

	.toast-actions {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		gap: var(--odstep-bardzo-maly);
	}

	.toast-btn {
		padding: var(--odstep-bardzo-maly) var(--odstep-maly);
		border: 1px solid currentColor;
		border-radius: var(--zaokraglenie-pelne);
		background: none;
		color: inherit;
		font: inherit;
		font-size: 0.75rem;
		cursor: pointer;
	}

	.toast-btn--close {
		width: 1.75rem;
		height: 1.75rem;
		padding: 0;
		border: none;
		font-size: 1.125rem;
		line-height: 1;
	}

	.toast-btn:focus-visible {
		outline: 2px solid currentColor;
		outline-offset: 2px;
	}

	.top-actions {
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
		align-items: stretch;
		gap: var(--odstep-bardzo-maly);
		margin-left: auto;
	}

	.demo-btn {
		padding: var(--odstep-bardzo-maly) var(--odstep-maly);
		border: 1px solid var(--kolor-obramowania);
		border-radius: var(--zaokraglenie-pelne);
		background: var(--kolor-tla-przezroczystej-karty);
		color: var(--kolor-tekstu-drugorzednego);
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
	}

	.demo-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.demo-btn:focus-visible {
		outline: 2px solid var(--kolor-wyroznienia);
		outline-offset: 2px;
	}

	.reset-btn {
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

	.route-identical {
		color: var(--kolor-trasy-bez-barier);
		font-size: 0.75rem;
		font-weight: 600;
	}

	.route-note {
		color: var(--kolor-tekstu-drugorzednego);
		font-size: 0.75rem;
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

	.summary-note {
		margin: 0;
		color: var(--kolor-tekstu-drugorzednego);
		font-size: 0.75rem;
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
		cursor: grab;
		touch-action: none;
	}

	.map-canvas :global(.map-marker.leaflet-drag-target),
	.map-canvas :global(.map-marker:active) {
		cursor: grabbing;
	}

	.map-canvas :global(.map-marker--start) {
		background: var(--kolor-punktu-startu);
	}

	.map-canvas :global(.map-marker--destination) {
		background: var(--kolor-punktu-celu);
	}
</style>
