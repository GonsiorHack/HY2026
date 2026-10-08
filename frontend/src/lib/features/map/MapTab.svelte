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
	} from './services/routes';
	import type { LatLngTuple, RouteResponse, Waypoint } from './types/route';
	import type { GeocodeResult, RoutePlace } from './types/geocode';
	import { shortPlaceLabel } from './services/geocode';
	import {
		DEMO_ROUTE,
		KRAKOW_BOUNDS,
		MAP_ATTRIBUTION_HTML,
		TILE_SUBDOMAINS,
		TILE_URL
	} from './map.config';
	import ReportObstacle from './components/ReportObstacle.svelte';
	import RouteSheet from './components/RouteSheet.svelte';
	import RoutePlannerPanel from './components/RoutePlannerPanel.svelte';
	import { navigationRequest, type NavigationTarget } from '#lib/state/navigation.svelte.ts';

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
	/* Start zastepczy, gdy lokalizacja jest wylaczona, niedostepna lub poza Krakowem */
	const FALLBACK_START: RoutePlace = {
		lat: 50.068056,
		lng: 19.984806,
		label: 'TAURON Arena Kraków, ul. Stanisława Lema 7'
	};
	const USER_LOCATION_LABEL = 'Twoja lokalizacja';
	const DEMO_START_LABEL = 'Start trasy demo';
	const DEMO_DESTINATION_LABEL = 'Cel trasy demo';
	const MAP_POINT_LABEL = 'Punkt na mapie';
	/* Minimalny czas stanu "wyznaczanie trasy" po wyborze adresu - uzytkownik widzi, ze trasa jest liczona */
	const ROUTE_PROCESSING_MS = 1000;
	const TOAST_TIMEOUT_MS = 8000;
	const NAVIGATION_ZOOM = 18;
	const USER_LOCATION_ZOOM = 17;
	const GEOLOCATION_TIMEOUT_MS = 10_000;
	const LOCATE_ICON =
		'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>';
	// Osobne warstwy (pane): linie tras pod niewidocznymi obszarami dotyku, oba pod znacznikami A/B
	const ROUTE_PANE = 'routes';
	const ROUTE_HIT_PANE = 'route-hit-areas';

	let mapContainer: HTMLDivElement;
	let hintBar = $state<HTMLElement>();
	let routeSheet = $state<ReturnType<typeof RouteSheet>>();
	let summaryHeight = $state(0);

	let start = $state<Waypoint | null>(null);
	let destination = $state<Waypoint | null>(null);
	let startLabel = $state('');
	let destinationLabel = $state('');
	let locatingOrigin = $state(false);
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
	const originPlace = $derived<RoutePlace | null>(start ? { ...start, label: startLabel } : null);
	const destinationPlace = $derived<RoutePlace | null>(
		destination ? { ...destination, label: destinationLabel } : null
	);
	const hint = $derived(
		loading
			? 'Wyznaczanie optymalnej trasy'
			: locatingOrigin
				? 'Ustalanie Twojej lokalizacji…'
				: !start && !destination
					? ''
					: !start
						? 'Wybierz punkt startowy.'
						: !destination
							? 'Teraz wybierz cel podróży.'
							: navigating && activeRoute
								? `Nawigacja: ${formatDuration(activeRoute.durationMinutes)} do celu.`
								: ''
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
			// Kontrolki w rogu Leaflet uklada od dolu w kolejnosci dodania: atrybucja, lokalizacja, zoom
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

	/** Centruje mape na GPS uzytkownika; poza Krakowem lub bez zgody wraca do trasy / centrum miasta */
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
			startLabel = MAP_POINT_LABEL;
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
		destinationLabel = MAP_POINT_LABEL;
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
		if (kind === 'start') {
			start = point;
			startLabel = MAP_POINT_LABEL;
		} else {
			destination = point;
			destinationLabel = MAP_POINT_LABEL;
		}

		if (!start || !destination) return;
		if (isTooClose(start, destination)) {
			cancelRequest();
			clearRoutes();
			showSamePointToast();
			return;
		}
		requestRoutes();
	}

	/** Cel wybrany poza mapa ("Nawiguj"): start z lokalizacji, jesli jest juz udostepniona, w innym razie z TAURON Arena */
	async function navigateTo(target: NavigationTarget) {
		cancelRequest();
		clearRoutes();
		clearWaypoints();
		toast = null;
		setWaypoint('destination', { lat: target.lat, lng: target.lng, label: target.name });

		// Karta mapy mogla byc ukryta - Leaflet musi przeliczyc rozmiar przed centrowaniem
		await tick();
		map?.invalidateSize();
		map?.setView([target.lat, target.lng], DEFAULT_ZOOM);
		await routeFromResolvedOrigin({ allowPrompt: false, minDurationMs: 0 });
	}

	/** Wybor celu z wyszukiwarki, bez punktu startowego ustala go z GPS (z pytaniem o zgode) lub z TAURON Arena */
	async function selectDestination(result: GeocodeResult) {
		const place = toRoutePlace(result);
		if (start && isTooClose(start, place)) {
			showSamePointToast();
			return;
		}
		cancelRequest();
		clearRoutes();
		toast = null;
		setWaypoint('destination', place);
		if (start) {
			routeWithProcessingState();
			return;
		}
		map?.flyTo([place.lat, place.lng], DEFAULT_ZOOM);
		await routeFromResolvedOrigin({ allowPrompt: true, minDurationMs: ROUTE_PROCESSING_MS });
	}

	function selectOrigin(result: GeocodeResult) {
		const place = toRoutePlace(result);
		if (destination && isTooClose(place, destination)) {
			showSamePointToast();
			return;
		}
		cancelRequest();
		clearRoutes();
		toast = null;
		setWaypoint('start', place);
		if (destination) routeWithProcessingState();
		else map?.flyTo([place.lat, place.lng], DEFAULT_ZOOM);
	}

	/** Opcja "Twoja lokalizacja" w polu "Od", przy niepowodzeniu dotychczasowy start zostaje */
	async function useLocationAsOrigin() {
		const id = requestId;
		locatingOrigin = true;
		const result = await getUserPosition();
		if (id !== requestId) return;
		locatingOrigin = false;

		if ('reason' in result) {
			toast = { tone: 'warning', message: `${result.reason} Punkt startowy bez zmian.` };
			return;
		}
		const { point } = result;
		if (!isInKrakow(point) || (destination && isTooClose(point, destination))) {
			const reason = isInKrakow(point) ? 'Jesteś już przy celu.' : 'Jesteś poza Krakowem.';
			toast = { tone: 'warning', message: `${reason} Punkt startowy bez zmian.` };
			return;
		}
		cancelRequest();
		clearRoutes();
		toast = null;
		showUserLocation([point.lat, point.lng]);
		setWaypoint('start', { ...point, label: USER_LOCATION_LABEL });
		if (destination) routeWithProcessingState();
		else map?.flyTo([point.lat, point.lng], USER_LOCATION_ZOOM);
	}

	function swapWaypoints() {
		if (!start || !destination) return;
		const previousStart: RoutePlace = { ...start, label: startLabel };
		setWaypoint('start', { ...destination, label: destinationLabel });
		setWaypoint('destination', previousStart);
		routeWithProcessingState();
	}

	/**
	 * Ustala start dla wybranego celu: GPS w granicach Krakowa, a gdy to niemozliwe - TAURON Arena
	 * (z komunikatem o przyczynie), `allowPrompt: false` korzysta z GPS tylko, gdy zgoda juz jest
	 */
	async function routeFromResolvedOrigin(options: { allowPrompt: boolean; minDurationMs: number }) {
		if (!destination) return;
		const id = requestId;
		locatingOrigin = true;
		const origin = await resolveOrigin(destination, options.allowPrompt);
		if (id !== requestId) return;
		locatingOrigin = false;
		// Uzytkownik mogl w miedzyczasie wskazac start na mapie albo wyczyscic trase
		if (start || !destination) return;

		if (!origin.place) {
			toast = { tone: 'info', message: origin.notice };
			return;
		}
		if (origin.place.label === USER_LOCATION_LABEL) {
			showUserLocation([origin.place.lat, origin.place.lng]);
		}
		setWaypoint('start', origin.place);
		routeWithProcessingState(options.minDurationMs);
		// requestRoutes czysci komunikaty synchronicznie - informacje o zastepczym starcie ustawiamy po nim
		if (origin.notice) toast = { tone: 'info', message: origin.notice };
	}

	async function resolveOrigin(
		target: Waypoint,
		allowPrompt: boolean
	): Promise<{ place: RoutePlace; notice?: string } | { place: null; notice: string }> {
		let reason: string;
		if (!('geolocation' in navigator)) {
			reason = 'Lokalizacja jest niedostępna na tym urządzeniu.';
		} else if (!allowPrompt && !(await isLocationShared())) {
			reason = 'Lokalizacja jest wyłączona.';
		} else {
			const result = await getUserPosition();
			if ('reason' in result) reason = result.reason;
			else if (!isInKrakow(result.point)) reason = 'Jesteś poza Krakowem.';
			else if (isTooClose(result.point, target)) reason = 'Jesteś już przy celu.';
			else return { place: { ...result.point, label: USER_LOCATION_LABEL } };
		}

		if (isTooClose(FALLBACK_START, target)) {
			return {
				place: null,
				notice: `${reason} Wskaż start na mapie lub wpisz adres w polu „Od”.`
			};
		}
		return { place: FALLBACK_START, notice: `${reason} Start: TAURON Arena Kraków.` };
	}

	function getUserPosition(): Promise<{ point: Waypoint } | { reason: string }> {
		if (!('geolocation' in navigator)) {
			return Promise.resolve({ reason: 'Lokalizacja jest niedostępna na tym urządzeniu.' });
		}
		return new Promise((resolve) => {
			navigator.geolocation.getCurrentPosition(
				({ coords }) => resolve({ point: { lat: coords.latitude, lng: coords.longitude } }),
				(error) =>
					resolve({
						reason:
							error.code === error.PERMISSION_DENIED
								? 'Brak zgody na dostęp do lokalizacji.'
								: 'Nie udało się ustalić lokalizacji.'
					}),
				{ enableHighAccuracy: true, timeout: GEOLOCATION_TIMEOUT_MS, maximumAge: 30_000 }
			);
		});
	}

	function setWaypoint(kind: WaypointKind, place: RoutePlace) {
		const point: Waypoint = { lat: place.lat, lng: place.lng };
		if (kind === 'start') {
			start = point;
			startLabel = place.label;
		} else {
			destination = point;
			destinationLabel = place.label;
		}
		placeMarker(kind, point);
	}

	function clearWaypoints() {
		markersLayer?.clearLayers();
		delete markers.start;
		delete markers.destination;
		start = destination = null;
		startLabel = destinationLabel = '';
	}

	/** Oba punkty od razu w kadrze, linia trasy pojawia sie po (co najmniej) sekundzie obliczen */
	function routeWithProcessingState(minDurationMs = ROUTE_PROCESSING_MS) {
		fitToWaypoints();
		requestRoutes(minDurationMs);
	}

	function toRoutePlace(result: GeocodeResult): RoutePlace {
		return { lat: result.lat, lng: result.lng, label: shortPlaceLabel(result.name) };
	}

	function isInKrakow(point: Waypoint) {
		return !!L?.latLngBounds(KRAKOW_BOUNDS).contains([point.lat, point.lng]);
	}

	function loadDemoRoute() {
		if (!map) return;
		cancelRequest();
		setWaypoint('start', { ...DEMO_ROUTE.start, label: DEMO_START_LABEL });
		setWaypoint('destination', { ...DEMO_ROUTE.destination, label: DEMO_DESTINATION_LABEL });
		const spacing = parseFloat(getComputedStyle(mapContainer).getPropertyValue('--odstep-duzy'));
		map.fitBounds(
			[
				[DEMO_ROUTE.start.lat, DEMO_ROUTE.start.lng],
				[DEMO_ROUTE.destination.lat, DEMO_ROUTE.destination.lng]
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

	async function requestRoutes(minDurationMs = 0) {
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
			const [response] = await Promise.all([
				fetchRouteComparison(from, to, controller.signal),
				new Promise((resolve) => setTimeout(resolve, minDurationMs))
			]);
			if (currentRequest !== requestId) return;

			const offline = response.some((route) => route.offline);
			if (offline) {
				// Trasa demo ma wlasne punkty A/B - przesuwamy znaczniki, zeby pasowaly do linii
				setWaypoint('start', { ...DEMO_ROUTE.start, label: DEMO_START_LABEL });
				setWaypoint('destination', { ...DEMO_ROUTE.destination, label: DEMO_DESTINATION_LABEL });
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
		locatingOrigin = false;
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
			// Szeroka, niewidoczna linia = wiekszy obszar dotyku niz sama (cienka) przerywana trasa
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

	/** Aktywna trasa: pelna niebieska linia na wierzchu, pozostale: wyciszone, przerywane, klikalne */
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
		// Aktywny obszar dotyku na wierzchu: dotkniecie wspolnego odcinka nie przelacza trasy
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
		const bounds = L.latLngBounds(routes.flatMap((route) => route.coordinates));
		if (start) bounds.extend([start.lat, start.lng]);
		if (destination) bounds.extend([destination.lat, destination.lng]);
		map.fitBounds(bounds, fitPadding());
	}

	function fitToWaypoints() {
		if (!L || !map || !start || !destination) return;
		map.fitBounds(
			L.latLngBounds([
				[start.lat, start.lng],
				[destination.lat, destination.lng]
			]),
			{ ...fitPadding(), maxZoom: NAVIGATION_ZOOM }
		);
	}

	/** Marginesy kadrowania: panel wyszukiwania u gory, przyciski zoomu z prawej, panel tras u dolu */
	function fitPadding(): Leaflet.FitBoundsOptions {
		const spacing = parseFloat(getComputedStyle(mapContainer).getPropertyValue('--odstep-duzy'));
		const zoomEl = zoomControl?.getContainer();
		const zoomInset = zoomEl
			? mapContainer.getBoundingClientRect().right - zoomEl.getBoundingClientRect().left
			: 0;
		// Panel tras istnieje tylko, gdy sa trasy - bez nich referencja wskazuje odmontowany komponent
		const sheetHeight = routes?.length ? (routeSheet?.collapsedHeight() ?? 0) : 0;
		return {
			paddingTopLeft: [spacing, spacing + (hintBar?.offsetHeight ?? 0)],
			paddingBottomRight: [spacing + zoomInset, spacing + sheetHeight]
		};
	}

	function reset() {
		cancelRequest();
		clearRoutes();
		clearWaypoints();
		toast = null;
		recenterAfterReset();
	}

	/** Po wyczyszczeniu: lokalizacja uzytkownika (tylko gdy juz ja udostepnil), w innym razie widok startowy */
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

	// Sprawdza zgode bez wyswietlania pytania o dostep do lokalizacji
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
		<RoutePlannerPanel
			origin={originPlace}
			destination={destinationPlace}
			routing={loading}
			onoriginselect={selectOrigin}
			ondestinationselect={selectDestination}
			onuselocation={useLocationAsOrigin}
			onswap={swapWaypoints}
		>
			{#snippet actions()}
				<div class="top-actions">
					<button
						class="demo-btn"
						type="button"
						onclick={loadDemoRoute}
						disabled={loading}
						title="Wczytaj przykładową trasę do prezentacji">Demo</button
					>
					{#if start || destination}
						<button class="reset-btn" type="button" onclick={reset}>Wyczyść</button>
					{/if}
				</div>
			{/snippet}
		</RoutePlannerPanel>

		{#if hint}
			<p class="map-hint" aria-live="polite">
				{#if loading}<span class="spinner" aria-hidden="true"></span>{/if}
				{hint}
			</p>
		{/if}

		{#if toast}
			<div
				class="map-toast map-toast--{toast.tone}"
				class:map-toast--connection={toast.message === SERVER_CONNECTION_LOST}
				role={toast.tone === 'error' ? 'alert' : 'status'}
			>
				<p>{toast.message}</p>
				<div class="toast-actions">
					{#if toast.retry}
						<button type="button" class="toast-btn" onclick={() => requestRoutes()}
							>Spróbuj ponownie</button
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
		padding-top: calc(4px + var(--odstep-gorny-mapy, env(safe-area-inset-top, 0px)));
		padding-right: max(var(--odstep-sredni), env(safe-area-inset-right, 0px));
		padding-left: max(var(--odstep-sredni), env(safe-area-inset-left, 0px));
		pointer-events: none;
	}

	.map-hint,
	.reset-btn,
	.demo-btn,
	.map-toast {
		pointer-events: auto;
		box-shadow: var(--cien-panelu-mapy);
	}

	.map-hint {
		display: flex;
		align-items: center;
		gap: var(--odstep-maly);
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
		min-width: 0;
		margin: 0;
		padding-block: var(--odstep-bardzo-maly);
	}

	.map-toast--connection {
		width: 100%;
		align-items: center;
		justify-content: center;
		gap: 4px;
		padding: 4px 6px;
		text-align: center;
	}

	.map-toast--connection p {
		flex: 1;
		padding-block: 0;
		white-space: nowrap;
		font-size: clamp(0.625rem, 2.5vw, 0.75rem);
	}

	.map-toast--connection .toast-actions {
		justify-content: center;
		gap: 2px;
	}

	.map-toast--connection .toast-btn {
		padding-inline: 4px;
		white-space: nowrap;
		font-size: 0.6875rem;
	}

	.map-toast--connection .toast-btn--close {
		width: 24px;
		height: 24px;
		font-size: 1.125rem;
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
		flex-direction: row;
		flex-shrink: 0;
		align-items: stretch;
		gap: var(--odstep-bardzo-maly);
		margin-left: auto;
	}

	.demo-btn {
		min-height: 32px;
		padding: 4px 10px;
		border: 1px solid transparent;
		border-radius: var(--zaokraglenie-pelne);
		background: transparent;
		box-shadow: none;
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
		min-height: 32px;
		padding: 4px 10px;
		border: none;
		border-radius: var(--zaokraglenie-pelne);
		background: transparent;
		box-shadow: none;
		color: var(--kolor-tekstu-drugorzednego);
		font-size: 0.8125rem;
		font-weight: 500;
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

	/* Wybrana trasa - ciagla, w kolorze swojego typu; druga - szara i kropkowana */
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

	/* Niewidoczna, ale "malowana" linia (stroke-opacity: 0), wiec nadal przyjmuje dotkniecia */
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

	/* Panel trasy zaslania dol mapy - wtedy ukrywamy atrybucje */
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
