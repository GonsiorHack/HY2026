<script lang="ts">
	import { formatDistance, formatDuration } from '../services/routes';
	import type { RouteInfo } from '../types/route';

	interface Props {
		routes: RouteInfo[];
		activeRouteId: string | null;
		identical?: boolean;
		navigating?: boolean;
		onselect: (routeId: string) => void;
		onstartnavigation: () => void;
		/** Wysokość widocznej części panelu (px) - mapa przesuwa nad nią kontrolki. */
		visibleHeight?: number;
	}

	let {
		routes,
		activeRouteId,
		identical = false,
		navigating = false,
		onselect,
		onstartnavigation,
		visibleHeight = $bindable(0)
	}: Props = $props();

	const DRAG_THRESHOLD_PX = 6;
	const FLICK_VELOCITY_PX_PER_MS = 0.4;
	const OVERDRAG_RESISTANCE = 0.25;

	interface DragGesture {
		pointerId: number;
		startY: number;
		startOffset: number;
		lastY: number;
		lastTime: number;
		velocity: number;
		dragging: boolean;
	}

	let sheet = $state<HTMLElement>();
	let extra = $state<HTMLElement>();
	let sheetHeight = $state(0);
	let extraHeight = $state(0);
	let expanded = $state(false);
	let dragOffset = $state<number | null>(null);
	let gesture: DragGesture | null = null;
	let suppressClick = false;

	const activeRoute = $derived(routes.find((route) => route.id === activeRouteId) ?? routes[0]);
	const alternatives = $derived(routes.filter((route) => route.id !== activeRoute?.id));
	const hasAlternative = $derived(alternatives.length > 0);
	const collapsedOffset = $derived(hasAlternative ? extraHeight : 0);
	const offset = $derived(dragOffset ?? (expanded && hasAlternative ? 0 : collapsedOffset));
	const measured = $derived(sheetHeight > 0);

	$effect(() => {
		visibleHeight = measured ? Math.max(0, sheetHeight - offset) : 0;
	});

	/** Wysokość panelu zwinięta. */
	export function collapsedHeight(): number {
		if (!sheet) return 0;
		return sheet.offsetHeight - (hasAlternative ? (extra?.offsetHeight ?? 0) : 0);
	}

	function toggle() {
		if (hasAlternative) expanded = !expanded;
	}

	function handlePointerDown(event: PointerEvent) {
		suppressClick = false;
		if (!hasAlternative || !event.isPrimary || event.button !== 0) return;
		gesture = {
			pointerId: event.pointerId,
			startY: event.clientY,
			startOffset: offset,
			lastY: event.clientY,
			lastTime: event.timeStamp,
			velocity: 0,
			dragging: false
		};
	}

	function handlePointerMove(event: PointerEvent) {
		if (!gesture || event.pointerId !== gesture.pointerId) return;
		const deltaY = event.clientY - gesture.startY;
		if (!gesture.dragging) {
			if (Math.abs(deltaY) < DRAG_THRESHOLD_PX) return;
			gesture.dragging = true;
			try {
				sheet?.setPointerCapture(event.pointerId);
			} catch {
				// a tu co xd
			}
		}

		const elapsed = event.timeStamp - gesture.lastTime;
		if (elapsed > 0) gesture.velocity = (event.clientY - gesture.lastY) / elapsed;
		gesture.lastY = event.clientY;
		gesture.lastTime = event.timeStamp;

		const target = gesture.startOffset + deltaY;
		dragOffset =
			target < 0
				? target * OVERDRAG_RESISTANCE
				: target > collapsedOffset
					? collapsedOffset + (target - collapsedOffset) * OVERDRAG_RESISTANCE
					: target;
	}

	function handlePointerEnd(event: PointerEvent) {
		if (!gesture || event.pointerId !== gesture.pointerId) return;
		if (gesture.dragging) {
			const current = dragOffset ?? offset;
			expanded =
				Math.abs(gesture.velocity) >= FLICK_VELOCITY_PX_PER_MS
					? gesture.velocity < 0
					: current < collapsedOffset / 2;
			suppressClick = event.type === 'pointerup';
		}
		gesture = null;
		dragOffset = null;
	}

	// Zakończony gest przeciągania nie może kliknąc przycisku nad którym puszczono palec.
	function handleClickCapture(event: MouseEvent) {
		if (!suppressClick) return;
		suppressClick = false;
		event.preventDefault();
		event.stopPropagation();
	}

	function timeDifference(route: RouteInfo): string {
		if (!activeRoute) return '';
		const diff = Math.round(route.durationMinutes) - Math.round(activeRoute.durationMinutes);
		if (diff === 0) return 'ten sam czas';
		return `${Math.abs(diff)} min ${diff < 0 ? 'szybciej' : 'dłużej'}`;
	}
</script>

{#if activeRoute}
	<!-- Przeciąganie to skrót dla dotyku; z klawiatury panel rozwija przycisk-uchwyt. -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="route-sheet"
		class:is-dragging={dragOffset !== null}
		class:is-measured={measured}
		style:transform={measured ? `translateY(${offset}px)` : 'translateY(100%)'}
		bind:this={sheet}
		bind:offsetHeight={sheetHeight}
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerEnd}
		onpointercancel={handlePointerEnd}
		onlostpointercapture={handlePointerEnd}
		onclickcapture={handleClickCapture}
	>
		{#if hasAlternative}
			<button
				type="button"
				class="sheet-handle"
				aria-expanded={expanded}
				aria-controls="route-sheet-alternatives"
				aria-label={expanded ? 'Ukryj trasę alternatywną' : 'Pokaż trasę alternatywną'}
				onclick={toggle}
			>
				<span class="sheet-handle-bar" aria-hidden="true"></span>
			</button>
		{:else}
			<span class="sheet-handle sheet-handle--static" aria-hidden="true"></span>
		{/if}

		<section class="sheet-peek" aria-live="polite" aria-label="Wybrana trasa">
			{#key activeRoute.id}
				<div class="active-route">
					<p class="route-heading">
						<span
							class="route-swatch route-swatch--{activeRoute.type} route-swatch--active"
							aria-hidden="true"
						></span>
						<span class="route-name">{activeRoute.name}</span>
						{#if identical}
							<span class="route-badge">Trasy zbieżne</span>
						{/if}
					</p>
					<p class="route-stats">
						<strong>{formatDuration(activeRoute.durationMinutes)}</strong>
						<span class="stats-separator" aria-hidden="true">•</span>
						<strong>{formatDistance(activeRoute.distanceMeters)}</strong>
					</p>
					<ul class="tag-list" aria-label="Cechy trasy">
						{#each activeRoute.tags as tag (tag.label)}
							<li class="tag tag--{tag.tone}">{tag.label}</li>
						{/each}
					</ul>
				</div>
			{/key}
			<button
				type="button"
				class="start-btn"
				class:start-btn--stop={navigating}
				onclick={onstartnavigation}
			>
				{navigating ? 'Zakończ nawigację' : 'Rozpocznij nawigację'}
			</button>
		</section>

		{#if hasAlternative}
			<section
				id="route-sheet-alternatives"
				class="sheet-extra"
				aria-label="Trasa alternatywna"
				inert={!expanded}
				bind:this={extra}
				bind:offsetHeight={extraHeight}
			>
				<p class="extra-heading">Trasa alternatywna</p>
				{#each alternatives as route (route.id)}
					<button type="button" class="alt-card" onclick={() => onselect(route.id)}>
						<span class="route-swatch route-swatch--{route.type}" aria-hidden="true"></span>
						<span class="alt-body">
							<span class="route-name">{route.name}</span>
							<span class="alt-stats">
								<strong>{formatDuration(route.durationMinutes)}</strong>
								<span class="stats-separator" aria-hidden="true">•</span>
								<strong>{formatDistance(route.distanceMeters)}</strong>
								<span class="alt-difference">({timeDifference(route)})</span>
							</span>
							<span class="tag-list">
								{#each route.tags as tag (tag.label)}
									<span class="tag tag--{tag.tone}">{tag.label}</span>
								{/each}
							</span>
						</span>
						<span class="alt-action">Wybierz</span>
					</button>
				{/each}
			</section>
		{/if}
	</div>
{/if}

<style>
	.route-sheet {
		--odstep-dolny-panelu: max(var(--odstep-duzy), env(safe-area-inset-bottom, 0px));

		position: absolute;
		z-index: 1;
		right: 0;
		bottom: 0;
		left: 0;
		display: flex;
		flex-direction: column;
		padding: 0 max(var(--odstep-duzy), env(safe-area-inset-right, 0px)) var(--odstep-dolny-panelu)
			max(var(--odstep-duzy), env(safe-area-inset-left, 0px));
		border: 1px solid var(--kolor-obramowania);
		border-bottom: none;
		border-radius: var(--zaokraglenie-duze) var(--zaokraglenie-duze) 0 0;
		background: var(--kolor-tla-karty);
		box-shadow: var(--cien-panelu-tras);
		color: var(--kolor-tekstu-podstawowego);
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
		will-change: transform;
	}

	.route-sheet.is-measured {
		transition: transform var(--czas-animacji-panelu) cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	.route-sheet.is-dragging {
		transition: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.route-sheet.is-measured {
			transition-duration: 1ms;
		}
	}

	.sheet-handle {
		display: grid;
		align-self: center;
		width: 100%;
		min-height: 28px;
		padding: 0;
		place-items: center;
		border: none;
		background: none;
		cursor: grab;
	}

	.route-sheet.is-dragging .sheet-handle {
		cursor: grabbing;
	}

	.sheet-handle--static {
		min-height: var(--odstep-duzy);
		cursor: default;
	}

	.sheet-handle-bar {
		width: 40px;
		height: 5px;
		border-radius: var(--zaokraglenie-pelne);
		background: var(--kolor-uchwytu-panelu);
	}

	.sheet-handle:focus-visible {
		outline: 2px solid var(--kolor-wyroznienia);
		outline-offset: -2px;
		border-radius: var(--zaokraglenie-srednie);
	}

	.sheet-peek {
		display: flex;
		flex-direction: column;
		gap: var(--odstep-sredni);
	}

	.active-route {
		display: flex;
		flex-direction: column;
		gap: var(--odstep-maly);
		animation: route-swap var(--czas-animacji-panelu) ease-out;
	}

	@keyframes route-swap {
		from {
			opacity: 0.4;
			transform: translateY(4px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.active-route {
			animation: none;
		}
	}

	.route-heading {
		display: flex;
		align-items: center;
		gap: var(--odstep-maly);
		margin: 0;
		color: var(--kolor-tekstu-drugorzednego);
		font-size: 0.8125rem;
		font-weight: 600;
	}

	.route-name {
		color: var(--kolor-tekstu-podstawowego);
		font-weight: 700;
	}

	.route-badge {
		margin-left: auto;
		padding: 2px var(--odstep-maly);
		border-radius: var(--zaokraglenie-pelne);
		background: var(--kolor-tla-elementu-drugorzednego);
		font-size: 0.6875rem;
	}

	.route-swatch {
		flex-shrink: 0;
		width: 24px;
		height: 0;
		border-radius: var(--zaokraglenie-pelne);
	}

	/* Jak linie na mapie: wybrana ciągła w kolorze typu, alternatywna szara i kropkowana. */
	.route-swatch {
		border-top: var(--grubosc-linii-trasy-nieaktywnej) dotted var(--kolor-trasy-nieaktywnej);
	}

	.route-swatch--wheelchair {
		--kolor-probki-trasy: var(--kolor-trasy-dostepnej);
	}

	.route-swatch--standard {
		--kolor-probki-trasy: var(--kolor-trasy-standardowej);
	}

	.route-swatch--active {
		border-top: var(--grubosc-linii-trasy-aktywnej) solid var(--kolor-probki-trasy);
	}

	.route-stats {
		display: flex;
		align-items: baseline;
		gap: var(--odstep-maly);
		margin: 0;
		font-size: 1.5rem;
		line-height: 1.1;
	}

	.route-stats strong {
		font-weight: 800;
	}

	.stats-separator {
		color: var(--kolor-tekstu-pomocniczego);
		font-size: 1rem;
	}

	.tag-list {
		display: flex;
		flex-wrap: wrap;
		gap: var(--odstep-bardzo-maly);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.tag {
		display: inline-flex;
		align-items: center;
		gap: var(--odstep-bardzo-maly);
		padding: 2px var(--odstep-maly);
		border: 1px solid transparent;
		border-radius: var(--zaokraglenie-pelne);
		font-size: 0.75rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.tag::before {
		font-weight: 800;
	}

	.tag--positive {
		background: var(--kolor-tla-sukcesu);
		color: var(--kolor-sukcesu);
	}

	.tag--positive::before {
		content: '✓';
		content: '✓' / '';
	}

	.tag--caution {
		background: var(--kolor-tla-uwagi);
		color: var(--kolor-tekstu-uwagi);
	}

	.tag--caution::before {
		content: '!';
		content: '!' / '';
	}

	:global([data-contrast='high']) .tag {
		border-color: currentColor;
	}

	.start-btn {
		min-height: 48px;
		padding: var(--odstep-sredni) var(--odstep-duzy);
		border: none;
		border-radius: var(--zaokraglenie-srednie);
		background: var(--kolor-wyroznienia);
		color: var(--kolor-tekstu-na-wyroznieniu);
		font: inherit;
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
	}

	.start-btn--stop {
		background: var(--kolor-tla-elementu-drugorzednego);
		color: var(--kolor-tekstu-podstawowego);
	}

	.start-btn:focus-visible,
	.alt-card:focus-visible {
		outline: 2px solid var(--kolor-wyroznienia);
		outline-offset: 2px;
	}

	/* Górny odstęp = dolny margines panelu, więc w stanie zwiniętym nie wystaje fragment karty. */
	.sheet-extra {
		display: flex;
		flex-direction: column;
		gap: var(--odstep-maly);
		padding-top: var(--odstep-dolny-panelu);
	}

	.extra-heading {
		margin: 0;
		color: var(--kolor-tekstu-drugorzednego);
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.alt-card {
		display: flex;
		align-items: center;
		gap: var(--odstep-sredni);
		width: 100%;
		padding: var(--odstep-sredni);
		border: 1px solid var(--kolor-obramowania);
		border-radius: var(--zaokraglenie-srednie);
		background: var(--kolor-tla-elementu-drugorzednego);
		color: var(--kolor-tekstu-podstawowego);
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.alt-body {
		display: flex;
		min-width: 0;
		flex: 1;
		flex-direction: column;
		gap: var(--odstep-bardzo-maly);
		font-size: 0.875rem;
	}

	.alt-stats {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--odstep-bardzo-maly) var(--odstep-maly);
		font-size: 1.0625rem;
	}

	.alt-difference {
		color: var(--kolor-tekstu-drugorzednego);
		font-size: 0.8125rem;
		font-weight: 600;
	}

	.alt-action {
		flex-shrink: 0;
		color: var(--kolor-wyroznienia);
		font-size: 0.875rem;
		font-weight: 700;
	}
</style>
