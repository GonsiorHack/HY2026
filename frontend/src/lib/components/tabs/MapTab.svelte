<script lang="ts">
	import 'leaflet/dist/leaflet.css';
	import type * as Leaflet from 'leaflet';
	import { onMount, tick, untrack } from 'svelte';
	import {
		MIN_ROUTE_DISTANCE_M,
		RouteApiError,
		collapseIdenticalRoutes,
		distanceMeters,
		fetchRouteComparison,
		formatDuration
	} from '../../services/routes';
	import type { LatLngTuple, RouteResponse, Waypoint } from '../../types/route';
	import {
		DEMO_ROUTE,
		KRAKOW_BOUNDS,
		MAP_ATTRIBUTION_HTML,
		TILE_SUBDOMAINS,
		TILE_URL
	} from '../../config/map';
	import ReportObstacle from '#lib/components/ReportObstacle.svelte';
	import RouteSheet from '#lib/components/RouteSheet.svelte';
	import { navigationRequest, type NavigationTarget } from '../../state/navigation.svelte';

	type WaypointKind = 'start' | 'destination';
	interface Toast {
		message: string;
		tone: 'error' | 'warning' | 'info';
		retry?: boolean;
	}
	interface RouteLayers {
		line: Leaflet.Polyline;
		hitArea: Leaflet.Polyline;
	}

	const KRAKOW_CENTER: LatLngTuple = [50.06768366766956, 19.989913515829258];
	const DEFAULT_ZOOM = 16;
	const TOAST_TIMEOUT_MS = 8000;
	const NAVIGATION_ZOOM = 18;
	const USER_LOCATION_ZOOM = 17;
	const GEOLOCATION_TIMEOUT_MS = 10_000;
	const LOCATE_ICON =
		'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>';
	// Osobne warstwy (pane): linie tras pod niewidocznymi obszarami dotyku, oba pod znacznikami A/B.
	const ROUTE_PANE = 'routes';
	const ROUTE_HIT_PANE = 'route-hit-areas';

	let mapContainer: HTMLDivElement;
	let hintBar = $state<HTMLElement>();
	let routeSheet = $state<ReturnType<typeof RouteSheet>>();
	let summaryHeight = $state(0);

	let start = $state<Waypoint | null>(null);
	let destination = $state<Waypoint | null>(null);
	let routes = $state<RouteResponse | null>(null);
	let identicalRoutes = $state(false);
	let activeRouteId = $state<string | null>(null);
	let navigating = $state(false);
	let loading = $state(false);
	const SERVER_CONNECTION_LOST = 'Utracono połączenie z serwerem';
	let toast = $state<Toast | null>(null);
	let locating = false;
	let mapReady = $state(false);

	let L: typeof Leaflet | undefined;
	let map: Leaflet.Map | undefined;
	let markersLayer: Leaflet.LayerGroup | undefined;
	let routesLayer: Leaflet.LayerGroup | undefined;
	let zoomControl: Leaflet.Control.Zoom | undefined;
	let userLocationLayer: Leaflet.LayerGroup | undefined;
	let locateButton: HTMLButtonElement | undefined;
	const markers: Partial<Record<WaypointKind, Leaflet.Marker>> = {};
	const routeLayers = new Map<string, RouteLayers>();
	let requestId = 0;
	let abortController: AbortController | undefined;

	const activeRoute = $derived(routes?.find((route) => route.id === activeRouteId));
	const hint = $derived(
		loading
			? 'Wyznaczanie trasy…'
			: !start
				? 'Wybierz punkt startowy.'
				: !destination
					? 'Teraz wybierz cel podróży.'
					: navigating && activeRoute
						? `Nawigacja: ${formatDuration(activeRoute.durationMinutes)} do celu.`
						: routes && routes.length > 1
							? 'Przesuń punkty, aby zmienić trasę.'
							: 'Przeciągnij A lub B, aby zmienić trasę.'
	);

	$effect(() => {
		if (!toast || toast.retry) return;
		const timer = setTimeout(() => (toast = null), TOAST_TIMEOUT_MS);
		return () => clearTimeout(timer);
	});

	$effect(() => {
		const target = navigationRequest.target;
		if (!mapReady || !target) return;
		navigationRequest.target = null;
		untrack(() => navigateTo(target));
	});

	onMount(() => {
		let destroyed = false;
		let resizeObserver: ResizeObserver | undefined;

		import('leaflet').then((module) => {
			if (destroyed) return;
			L = module.default;

			map = L.map(mapContainer, { zoomControl: false, attributionControl: false }).setView(
				KRAKOW_CENTER,
				DEFAULT_ZOOM
			);
			// Kontrolki w rogu Leaflet układa od dołu w kolejności dodania: atrybucja, lokalizacja, zoom.
			L.control
				.attribution({ position: 'bottomright', prefix: false })
				.addAttribution(MAP_ATTRIBUTION_HTML)
				.addTo(map);
			createLocateControl(L).addTo(map);
			zoomControl = L.control.zoom({ position: 'bottomright' }).addTo(map);
			L.tileLayer(TILE_URL, {
				subdomains: TILE_SUBDOMAINS,
				maxZoom: 19
			}).addTo(map);
			map.createPane(ROUTE_PANE).style.zIndex = '400';
			map.createPane(ROUTE_HIT_PANE).style.zIndex = '450';
			routesLayer = L.layerGroup().addTo(map);
			userLocationLayer = L.layerGroup().addTo(map);
			markersLayer = L.layerGroup().addTo(map);
			map.on('click', handleMapClick);

			map.invalidateSize();
			resizeObserver = new ResizeObserver(() => map?.invalidateSize());
			resizeObserver.observe(mapContainer);
			mapReady = true;
		});

		return () => {
			destroyed = true;
			mapReady = false;
			abortController?.abort();
			resizeObserver?.disconnect();
			map?.off('click', handleMapClick);
			map?.remove();
			map = markersLayer = routesLayer = userLocationLayer = zoomControl = L = undefined;
			locateButton = undefined;
			routeLayers.clear();
			delete markers.start;
			delete markers.destination;
		};
	});

	function createLocateControl(leaflet: typeof Leaflet): Leaflet.Control {
		const control = new leaflet.Control({ position: 'bottomright' });
		control.onAdd = () => {
			const container = leaflet.DomUtil.create('div', 'leaflet-bar leaflet-control locate-control');
			const button = leaflet.DomUtil.create('button', 'locate-btn', container);
			button.type = 'button';
			button.title = 'Pokaż moją lokalizację';
			button.setAttribute('aria-label', 'Pokaż moją lokalizację');
			button.innerHTML = LOCATE_ICON;
			leaflet.DomEvent.disableClickPropagation(container);
			leaflet.DomEvent.on(button, 'click', centerOnUser);
			locateButton = button;
			return container;
		};
		return control;
	}

	/** Centruje mapę na GPS użytkownika; poza Krakowem lub bez zgody wraca do trasy / centrum miasta. */
	function centerOnUser() {
		if (!map || locating) return;
		if (!('geolocation' in navigator)) {
			recenterFallback('Lokalizacja jest niedostępna na tym urządzeniu.');
			return;
		}
		setLocating(true);
		navigator.geolocation.getCurrentPosition(
			({ coords }) => {
				setLocating(false);
				if (!L || !map) return;
				const position: LatLngTuple = [coords.latitude, coords.longitude];
				if (!L.latLngBounds(KRAKOW_BOUNDS).contains(position)) {
					recenterFallback('Jesteś poza Krakowem.');
					return;
				}
				showUserLocation(position);
				map.flyTo(position, Math.max(map.getZoom(), USER_LOCATION_ZOOM));
			},
			(error) => {
				setLocating(false);
				recenterFallback(
					error.code === error.PERMISSION_DENIED
						? 'Brak zgody na dostęp do lokalizacji.'
						: 'Nie udało się ustalić lokalizacji.'
				);
			},
			{ enableHighAccuracy: true, timeout: GEOLOCATION_TIMEOUT_MS, maximumAge: 30_000 }
		);
	}

	function setLocating(value: boolean) {
		locating = value;
		locateButton?.classList.toggle('is-locating', value);
		locateButton?.setAttribute('aria-busy', String(value));
	}

	function recenterFallback(reason: string) {
		if (!map) return;
		if (routes?.length) {
			fitToRoutes();
			toast = { tone: 'info', message: `${reason} Pokazano wyznaczoną trasę.` };
		} else if (start) {
			map.flyTo([start.lat, start.lng], Math.max(map.getZoom(), DEFAULT_ZOOM));
			toast = { tone: 'info', message: `${reason} Pokazano punkt startowy.` };
		} else {
			map.flyTo(KRAKOW_CENTER, DEFAULT_ZOOM);
			toast = { tone: 'info', message: `${reason} Pokazano centrum Krakowa.` };
		}
	}

	function showUserLocation(position: LatLngTuple) {
		if (!L || !userLocationLayer) return;
		userLocationLayer.clearLayers();
		L.circleMarker(position, {
			radius: 8,
			className: 'user-location',
			interactive: false
		}).addTo(userLocationLayer);
	}

	function handleMapClick(event: Leaflet.LeafletMouseEvent) {
		if (loading) return;
		const point: Waypoint = { lat: event.latlng.lat, lng: event.latlng.lng };

		if (!start) {
			if (destination && isTooClose(point, destination)) {
				showSamePointToast();
				return;
			}
			start = point;
			placeMarker('start', point);
			toast = null;
			if (destination) requestRoutes();
			return;
		}
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

	/** Cel wybrany poza mapą: ustawia punkt B, a start bierze z lokalizacji (jeśli udostępniona) lub z dotknięcia mapy. */
	async function navigateTo(target: NavigationTarget) {
		cancelRequest();
		clearRoutes();
		markersLayer?.clearLayers();
		delete markers.start;
		delete markers.destination;
		start = null;
		destination = { lat: target.lat, lng: target.lng };
		placeMarker('destination', destination);
		toast = { tone: 'info', message: `Cel: ${target.name}. Dotknij mapy, aby wybrać start.` };

		// Karta mapy mogła być ukryta - Leaflet musi przeliczyć rozmiar przed centrowaniem.
		await tick();
		map?.invalidateSize();
		map?.setView([target.lat, target.lng], DEFAULT_ZOOM);

		const navigationId = requestId;
		if (!(await isLocationShared())) return;
		navigator.geolocation.getCurrentPosition(
			({ coords }) => {
				if (!L || navigationId !== requestId || start || !destination) return;
				const position: Waypoint = { lat: coords.latitude, lng: coords.longitude };
				if (!L.latLngBounds(KRAKOW_BOUNDS).contains([position.lat, position.lng])) return;
				if (isTooClose(position, destination)) return;
				start = position;
				placeMarker('start', position);
				requestRoutes();
			},
			() => {},
			{ enableHighAccuracy: true, timeout: GEOLOCATION_TIMEOUT_MS, maximumAge: 30_000 }
		);
	}

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

			const offline = response.some((route) => route.offline);
			if (offline) {
				// Trasa demo ma własne punkty A/B - przesuwamy znaczniki, żeby pasowały do linii.
				start = { ...DEMO_ROUTE.start };
				destination = { ...DEMO_ROUTE.destination };
				placeMarker('start', start);
				placeMarker('destination', destination);
			}

			const { routes: visibleRoutes, identical } = collapseIdenticalRoutes(response);
			routes = visibleRoutes;
			identicalRoutes = identical;
			activeRouteId = visibleRoutes[0]?.id ?? null;
			if (offline) {
				toast = { tone: 'warning', message: SERVER_CONNECTION_LOST };
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
					message: 'Nie istnieje trasa między wybranymi punktami. Wybierz inne punkty.'
				};
			default:
				return { tone: 'error', retry: true, message: SERVER_CONNECTION_LOST };
		}
	}

	function cancelRequest() {
		requestId++;
		abortController?.abort();
		abortController = undefined;
		loading = false;
	}

	function clearRoutes() {
		routesLayer?.clearLayers();
		routeLayers.clear();
		routes = null;
		identicalRoutes = false;
		activeRouteId = null;
		navigating = false;
		summaryHeight = 0;
	}

	async function drawRoutes(response: RouteResponse) {
		if (!L || !routesLayer) return;

		for (const route of response) {
			const line = L.polyline(route.coordinates, {
				pane: ROUTE_PANE,
				className: `route-line route-line--${route.type}`,
				interactive: false
			}).addTo(routesLayer);
			// Szeroka, niewidoczna linia = większy obszar dotyku niż sama (cienka) przerywana trasa.
			const hitArea = L.polyline(route.coordinates, {
				pane: ROUTE_HIT_PANE,
				className: 'route-hit-area',
				bubblingMouseEvents: false
			}).addTo(routesLayer);
			hitArea.on('click', () => selectRoute(route.id));
			routeLayers.set(route.id, { line, hitArea });
		}
		applyRouteStyles();

		await tick();
		fitToRoutes();
	}

	function selectRoute(routeId: string) {
		if (routeId === activeRouteId || !routeLayers.has(routeId)) return;
		activeRouteId = routeId;
		applyRouteStyles();
	}

	/** Aktywna trasa: pełna niebieska linia na wierzchu. Pozostałe: wyciszone, przerywane, klikalne. */
	function applyRouteStyles() {
		for (const [routeId, { line, hitArea }] of routeLayers) {
			const active = routeId === activeRouteId;
			const lineElement = line.getElement();
			lineElement?.classList.toggle('route-line--active', active);
			lineElement?.classList.toggle('route-line--inactive', !active);
			hitArea.getElement()?.classList.toggle('route-hit-area--active', active);
		}
		const active = activeRouteId ? routeLayers.get(activeRouteId) : undefined;
		active?.line.bringToFront();
		// Aktywny obszar dotyku na wierzchu: dotknięcie wspólnego odcinka nie przełącza trasy.
		active?.hitArea.bringToFront();
	}

	function toggleNavigation() {
		if (!map || !start) return;
		navigating = !navigating;
		if (navigating) map.flyTo([start.lat, start.lng], NAVIGATION_ZOOM);
		else fitToRoutes();
	}

	function fitToRoutes() {
		if (!L || !map || !routes?.length) return;
		const spacing = parseFloat(getComputedStyle(mapContainer).getPropertyValue('--odstep-duzy'));
		const bounds = L.latLngBounds(routes.flatMap((route) => route.coordinates));
		if (start) bounds.extend([start.lat, start.lng]);
		if (destination) bounds.extend([destination.lat, destination.lng]);
		const zoomEl = zoomControl?.getContainer();
		const zoomInset = zoomEl
			? mapContainer.getBoundingClientRect().right - zoomEl.getBoundingClientRect().left
			: 0;
		map.fitBounds(bounds, {
			paddingTopLeft: [spacing, spacing + (hintBar?.offsetHeight ?? 0)],
			paddingBottomRight: [spacing + zoomInset, spacing + (routeSheet?.collapsedHeight() ?? 0)]
		});
	}

	function reset() {
		cancelRequest();
		clearRoutes();
		markersLayer?.clearLayers();
		delete markers.start;
		delete markers.destination;
		start = destination = toast = null;
		recenterAfterReset();
	}

	/** Po wyczyszczeniu: lokalizacja użytkownika (tylko gdy już ją udostępnił), w innym razie widok startowy. */
	async function recenterAfterReset() {
		const resetId = requestId;
		map?.flyTo(KRAKOW_CENTER, DEFAULT_ZOOM);
		if (!(await isLocationShared())) return;
		navigator.geolocation.getCurrentPosition(
			({ coords }) => {
				if (!L || !map || resetId !== requestId || start) return;
				const position: LatLngTuple = [coords.latitude, coords.longitude];
				if (!L.latLngBounds(KRAKOW_BOUNDS).contains(position)) return;
				showUserLocation(position);
				map.flyTo(position, USER_LOCATION_ZOOM);
			},
			() => {},
			{ enableHighAccuracy: true, timeout: GEOLOCATION_TIMEOUT_MS, maximumAge: 30_000 }
		);
	}

	// Sprawdza zgodę bez wyświetlania pytania o dostęp do lokalizacji.
	async function isLocationShared(): Promise<boolean> {
		if (!('geolocation' in navigator) || !navigator.permissions) return false;
		try {
			const status = await navigator.permissions.query({ name: 'geolocation' });
			return status.state === 'granted';
		} catch {
			return false;
		}
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
		<RouteSheet
			bind:this={routeSheet}
			bind:visibleHeight={summaryHeight}
			{routes}
			{activeRouteId}
			{navigating}
			identical={identicalRoutes}
			onselect={selectRoute}
			onstartnavigation={toggleNavigation}
		/>
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
		min-height: 36px;
		padding: var(--odstep-maly) var(--odstep-duzy);
		border: 1px solid var(--kolor-obramowania);
		border-radius: var(--zaokraglenie-pelne);
		background: var(--kolor-tla-przezroczystej-karty);
		color: var(--kolor-tekstu-drugorzednego);
		font-size: 0.8125rem;
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

	/* Wybrana trasa - ciągła, w kolorze swojego typu; druga - szara i kropkowana. */
	.map-canvas :global(.route-line) {
		fill: none;
		stroke-dasharray: var(--wzor-trasy-nieaktywnej);
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-opacity: 1;
		stroke-width: var(--grubosc-linii-trasy-nieaktywnej);
		transition:
			stroke 200ms ease,
			stroke-width 200ms ease;
	}

	.map-canvas :global(.route-line--wheelchair) {
		stroke: var(--kolor-trasy-dostepnej);
	}

	.map-canvas :global(.route-line--standard) {
		stroke: var(--kolor-trasy-standardowej);
	}

	.map-canvas :global(.route-line--inactive) {
		stroke: var(--kolor-trasy-nieaktywnej);
	}

	.map-canvas :global(.route-line--active) {
		stroke-dasharray: none;
		stroke-width: var(--grubosc-linii-trasy-aktywnej);
	}

	/* Niewidoczna, ale "malowana" linia (stroke-opacity: 0), więc nadal przyjmuje dotknięcia. */
	.map-canvas :global(.route-hit-area) {
		fill: none;
		stroke: #000;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-opacity: 0;
		stroke-width: var(--grubosc-obszaru-dotyku-trasy);
	}

	.map-canvas :global(.route-hit-area--active) {
		cursor: default;
	}

	@media (prefers-reduced-motion: reduce) {
		.map-canvas :global(.route-line) {
			transition: none;
		}
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
		border-color: var(--kolor-obwodki-punktu-startu);
		background: var(--kolor-punktu-startu);
		color: var(--kolor-tekstu-punktu-startu);
	}

	.map-canvas :global(.map-marker--destination) {
		background: var(--kolor-punktu-celu);
	}

	.map-canvas :global(.locate-btn) {
		display: grid;
		width: 30px;
		height: 30px;
		padding: 5px;
		place-items: center;
		border: none;
		background: var(--kolor-tla-kontrolek-mapy);
		color: var(--kolor-tekstu-kontrolek-mapy);
		cursor: pointer;
	}

	.map-canvas :global(.locate-btn svg) {
		width: 100%;
		height: 100%;
	}

	.map-canvas :global(.locate-btn:hover) {
		background: var(--kolor-tla-elementu-drugorzednego);
	}

	.map-canvas :global(.locate-btn:focus-visible) {
		outline: 2px solid var(--kolor-wyroznienia);
		outline-offset: -2px;
	}

	.map-canvas :global(.locate-btn.is-locating svg) {
		color: var(--kolor-wyroznienia);
		animation: spin 1.2s linear infinite;
	}

	.map-canvas :global(.user-location) {
		fill: var(--kolor-lokalizacji-uzytkownika);
		fill-opacity: 1;
		stroke: var(--kolor-obwodki-znacznika);
		stroke-width: 3;
	}

	.map-canvas :global(.leaflet-control-attribution) {
		max-width: calc(100vw - var(--rozmiar-przycisku-aparatu) - 3 * var(--odstep-sredni));
		margin: 0 var(--odstep-maly) var(--odstep-bardzo-maly) 0;
		padding: 1px 6px;
		border-radius: var(--zaokraglenie-male);
		background: var(--kolor-tla-atrybucji-mapy);
		color: var(--kolor-tekstu-kontrolek-mapy);
		overflow: hidden;
		font-size: 0.5rem;
		line-height: 1.4;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Panel trasy zasłania dół mapy - wtedy ukrywamy atrybucję. */
	.map-canvas.has-summary :global(.leaflet-control-attribution) {
		display: none;
	}

	.map-canvas :global(.leaflet-control-attribution a) {
		color: var(--kolor-linku-mapy);
		text-decoration: none;
	}

	.map-canvas :global(.leaflet-control-attribution a:focus-visible) {
		outline: 2px solid var(--kolor-wyroznienia);
		outline-offset: 1px;
	}
</style>
