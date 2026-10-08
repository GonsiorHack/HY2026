<script lang="ts">
	import type { Snippet } from 'svelte';
	import AddressCombobox from './AddressCombobox.svelte';
	import type { GeocodeResult, RoutePlace } from '../types/geocode';

	let {
		origin,
		destination,
		routing = false,
		onoriginselect,
		ondestinationselect,
		onuselocation,
		onswap,
		actions
	}: {
		origin: RoutePlace | null;
		destination: RoutePlace | null;
		routing?: boolean;
		onoriginselect: (result: GeocodeResult) => void;
		ondestinationselect: (result: GeocodeResult) => void;
		onuselocation: () => void;
		onswap: () => void;
		actions?: Snippet;
	} = $props();

	/* Pojedyncze pole "Dokad?" rozwija sie w panel Od / Do, gdy jest juz ktorykolwiek punkt */
	const expanded = $derived(origin !== null || destination !== null);
	const canSwap = $derived(origin !== null && destination !== null && !routing);

	const locationOption = {
		label: 'Twoja lokalizacja',
		description: 'Użyj GPS jako punktu startowego',
		onselect: () => onuselocation()
	};
</script>

<form
	class="planner"
	class:planner--expanded={expanded}
	role="search"
	aria-label="Wyznacz trasę"
	aria-busy={routing}
	onsubmit={(event) => event.preventDefault()}
>
	<div class="planner-main">
		<div class="planner-fields">
			{#if expanded}
				<div class="planner-row">
					<span class="row-icon" aria-hidden="true">
						<span class="origin-dot"></span>
					</span>
					<AddressCombobox
						label="Od"
						value={origin?.label ?? ''}
						placeholder="Wybierz punkt startowy"
						onselect={onoriginselect}
						quickOption={locationOption}
					/>
				</div>
				<span class="connector" aria-hidden="true"></span>
			{/if}
			<div class="planner-row">
				<span class="row-icon" class:row-icon--destination={expanded} aria-hidden="true">
					{#if expanded}
						<svg viewBox="0 0 24 24">
							<path class="pin-fill" d="M12 22s-7-6-7-12a7 7 0 1114 0c0 6-7 12-7 12z" />
							<circle class="pin-hole" cx="12" cy="10" r="2.6" />
						</svg>
					{:else}
						<svg viewBox="0 0 24 24" class="stroke-icon">
							<circle cx="11" cy="11" r="6.5" />
							<path d="M16 16l4.5 4.5" />
						</svg>
					{/if}
				</span>
				<AddressCombobox
					label={expanded ? 'Do' : 'Cel podróży'}
					labelHidden={!expanded}
					value={destination?.label ?? ''}
					placeholder={expanded ? 'Wybierz cel podróży' : 'Dokąd?'}
					onselect={ondestinationselect}
				/>
			</div>
		</div>

		{#if expanded}
			<button
				type="button"
				class="swap-btn"
				aria-label="Zamień punkt startowy i cel"
				title="Zamień start i cel"
				disabled={!canSwap}
				onclick={onswap}
			>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path d="M8 20V5M4 9l4-4 4 4M16 4v15M12 15l4 4 4-4" />
				</svg>
			</button>
		{/if}
	</div>

	{#if actions}
		<div class="planner-actions">
			{@render actions()}
		</div>
	{/if}

	{#if routing}
		<div class="progress" aria-hidden="true"><span></span></div>
	{/if}
</form>

<style>
	.planner {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 2px;
		margin: 0;
		padding: 4px 6px;
		border: 1px solid var(--kolor-obramowania);
		border-radius: var(--zaokraglenie-wyszukiwania);
		background: var(--kolor-tla-wyszukiwania);
		box-shadow: var(--cien-panelu-mapy);
		pointer-events: auto;
	}

	.planner:not(.planner--expanded) {
		flex-direction: row;
		align-items: center;
		padding: 4px 6px;
	}

	.planner:not(.planner--expanded) .planner-main {
		flex: 1;
	}

	.planner:not(.planner--expanded) .planner-actions {
		flex-shrink: 0;
		padding-top: 0;
		border-top: none;
	}

	.planner-main {
		display: flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
	}

	.planner--expanded {
		--wysokosc-pola-adresu: 40px;
	}

	.planner-actions {
		display: flex;
		justify-content: flex-end;
		padding-top: 2px;
		border-top: 1px solid var(--kolor-obramowania);
	}

	.planner-fields {
		position: relative;
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 0;
		min-width: 0;
	}

	.planner-row {
		display: flex;
		align-items: center;
		gap: var(--odstep-maly);
		min-width: 0;
	}

	.row-icon {
		display: grid;
		flex-shrink: 0;
		place-items: center;
		width: 20px;
		height: 20px;
		color: var(--kolor-tekstu-drugorzednego);
	}

	.row-icon svg {
		width: 20px;
		height: 20px;
	}

	.stroke-icon {
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-width: 2.2;
	}

	.origin-dot {
		width: 10px;
		height: 10px;
		border: 2px solid var(--kolor-tla-karty);
		border-radius: 50%;
		background: var(--kolor-sukcesu);
		box-shadow: 0 0 0 1px var(--kolor-sukcesu);
	}

	.pin-fill {
		fill: var(--kolor-punktu-celu);
	}

	.pin-hole {
		fill: var(--kolor-tla-karty);
	}

	/* Kropkowany lacznik miedzy ikonami "Od" i "Do" */
	.connector {
		position: absolute;
		top: 28px;
		bottom: 28px;
		left: 9px;
		width: 2px;
		background-image: radial-gradient(
			circle,
			var(--kolor-tekstu-pomocniczego) 1px,
			transparent 1.5px
		);
		background-size: 2px 5px;
		pointer-events: none;
	}

	.swap-btn {
		display: grid;
		flex-shrink: 0;
		place-items: center;
		width: 36px;
		height: 36px;
		padding: 0;
		border: 1px solid var(--kolor-obramowania);
		border-radius: var(--zaokraglenie-pelne);
		background: var(--kolor-tla-karty);
		color: var(--kolor-wyroznienia);
		cursor: pointer;
		transition: transform 0.2s ease;
	}

	.swap-btn svg {
		width: 16px;
		height: 16px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 2.2;
	}

	.swap-btn:not(:disabled):hover {
		background: var(--kolor-delikatnego-wyroznienia);
	}

	.swap-btn:not(:disabled):active {
		transform: rotate(180deg);
	}

	.swap-btn:disabled {
		color: var(--kolor-tekstu-pomocniczego);
		cursor: not-allowed;
	}

	.swap-btn:focus-visible {
		outline: 2px solid var(--kolor-wyroznienia);
		outline-offset: 2px;
	}

	.progress {
		position: absolute;
		right: var(--odstep-duzy);
		bottom: 0;
		left: var(--odstep-duzy);
		height: 3px;
		overflow: hidden;
		border-radius: var(--zaokraglenie-pelne);
		background: var(--kolor-delikatnego-wyroznienia);
	}

	.progress span {
		display: block;
		width: 40%;
		height: 100%;
		border-radius: inherit;
		background: var(--kolor-wyroznienia);
		animation: progress 1s ease-in-out infinite;
	}

	@keyframes progress {
		from {
			transform: translateX(-100%);
		}
		to {
			transform: translateX(250%);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.swap-btn {
			transition: none;
		}

		.progress span {
			width: 100%;
			animation: pulse 1.6s ease-in-out infinite;
		}

		@keyframes pulse {
			50% {
				opacity: 0.35;
			}
		}
	}
</style>
