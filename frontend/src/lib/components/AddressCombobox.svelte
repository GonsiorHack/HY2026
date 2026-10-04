<script lang="ts">
	import {
		GEOCODE_NETWORK_MESSAGE,
		GEOCODE_NOT_FOUND_MESSAGE,
		GeocodeError,
		MIN_GEOCODE_QUERY_LENGTH,
		fetchGeocode,
		splitPlaceName
	} from '../services/geocode';
	import type { GeocodeResult, QuickOption } from '../types/geocode';

	type Option =
		| { kind: 'quick'; id: string; primary: string; secondary: string }
		| { kind: 'place'; id: string; primary: string; secondary: string; result: GeocodeResult };

	let {
		label,
		labelHidden = false,
		value,
		placeholder,
		onselect,
		quickOption
	}: {
		label: string;
		labelHidden?: boolean;
		/** Etykieta aktualnie wybranego punktu - wyświetlana, gdy użytkownik nie pisze. */
		value: string;
		placeholder: string;
		onselect: (result: GeocodeResult) => void;
		quickOption?: QuickOption;
	} = $props();

	const DEBOUNCE_MS = 350;

	const uid = $props.id();
	const inputId = `${uid}-input`;
	const listId = `${uid}-list`;

	let inputElement = $state<HTMLInputElement>();
	let searchQuery = $state('');
	let suggestions = $state<GeocodeResult[]>([]);
	let isSearching = $state(false);
	let errorMessage = $state<string | null>(null);
	/* `editing` = w polu jest tekst wpisany przez użytkownika, a nie etykieta wybranego punktu. */
	let editing = $state(false);
	let focused = $state(false);
	let dismissed = $state(false);
	let activeIndex = $state(-1);

	let debounceTimer: ReturnType<typeof setTimeout> | undefined;
	let controller: AbortController | undefined;

	const trimmedQuery = $derived(searchQuery.trim());
	const tooShort = $derived(
		editing && trimmedQuery.length > 0 && trimmedQuery.length < MIN_GEOCODE_QUERY_LENGTH
	);

	const options = $derived.by<Option[]>(() => {
		const list: Option[] = [];
		if (quickOption && (!editing || trimmedQuery.length === 0)) {
			list.push({
				kind: 'quick',
				id: `${uid}-quick`,
				primary: quickOption.label,
				secondary: quickOption.description ?? ''
			});
		}
		suggestions.forEach((result, index) => {
			list.push({
				kind: 'place',
				id: `${uid}-option-${index}`,
				result,
				...splitPlaceName(result.name)
			});
		});
		return list;
	});

	const message = $derived(
		!editing
			? null
			: isSearching
				? 'Szukanie adresu…'
				: (errorMessage ??
					(tooShort ? `Wpisz co najmniej ${MIN_GEOCODE_QUERY_LENGTH} znaki.` : null))
	);

	const open = $derived(focused && !dismissed && (options.length > 0 || message !== null));
	const activeOption = $derived(open && activeIndex >= 0 ? options[activeIndex] : undefined);
	const displayedValue = $derived(editing ? searchQuery : value);

	const announcement = $derived.by(() => {
		if (!editing || isSearching) return '';
		if (errorMessage) return errorMessage;
		const count = suggestions.length;
		if (count === 0) return '';
		return `${count} ${resultsWord(count)}. Użyj strzałek, aby wybrać.`;
	});

	function resultsWord(count: number) {
		if (count === 1) return 'wynik';
		const lastDigit = count % 10;
		const lastTwo = count % 100;
		return lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)
			? 'wyniki'
			: 'wyników';
	}

	function cancelSearch() {
		clearTimeout(debounceTimer);
		controller?.abort();
		controller = undefined;
		isSearching = false;
	}

	function handleInput(event: Event) {
		searchQuery = (event.currentTarget as HTMLInputElement).value;
		editing = true;
		dismissed = false;
		activeIndex = -1;
		errorMessage = null;
		suggestions = [];
		cancelSearch();

		const query = searchQuery.trim();
		if (query.length < MIN_GEOCODE_QUERY_LENGTH) return;
		isSearching = true;
		debounceTimer = setTimeout(() => runSearch(query), DEBOUNCE_MS);
	}

	async function runSearch(query: string) {
		const current = (controller = new AbortController());
		try {
			const results = await fetchGeocode(query, current.signal);
			if (current !== controller) return;
			suggestions = results;
			errorMessage = results.length > 0 ? null : GEOCODE_NOT_FOUND_MESSAGE;
		} catch (error) {
			if (current !== controller) return;
			if (error instanceof GeocodeError && error.kind === 'aborted') return;
			console.warn('Geocoding failed:', error);
			errorMessage = GEOCODE_NETWORK_MESSAGE;
		} finally {
			if (current === controller) {
				isSearching = false;
				controller = undefined;
			}
		}
	}

	function choose(option: Option) {
		cancelSearch();
		editing = false;
		searchQuery = '';
		suggestions = [];
		errorMessage = null;
		activeIndex = -1;
		dismissed = true;
		if (option.kind === 'quick') quickOption?.onselect();
		else onselect(option.result);
	}

	function handleKeydown(event: KeyboardEvent) {
		switch (event.key) {
			case 'ArrowDown':
			case 'ArrowUp': {
				event.preventDefault();
				dismissed = false;
				if (options.length === 0) return;
				const step = event.key === 'ArrowDown' ? 1 : -1;
				activeIndex =
					activeIndex < 0
						? step === 1
							? 0
							: options.length - 1
						: (activeIndex + step + options.length) % options.length;
				return;
			}
			case 'Enter': {
				// Enter bez zaznaczenia wybiera pierwszy wynik wyszukiwania.
				const option =
					activeOption ?? (editing ? options.find((item) => item.kind === 'place') : undefined);
				event.preventDefault();
				if (option) choose(option);
				return;
			}
			case 'Escape':
				if (open) {
					event.preventDefault();
					dismissed = true;
				} else if (editing) {
					event.preventDefault();
					revert();
				}
				return;
		}
	}

	function revert() {
		cancelSearch();
		editing = false;
		searchQuery = '';
		suggestions = [];
		errorMessage = null;
		activeIndex = -1;
	}

	function handleFocus() {
		focused = true;
		dismissed = false;
		// Zaznaczenie całej etykiety: pierwszy wpisany znak zastępuje ją nowym zapytaniem.
		inputElement?.select();
	}

	function handleBlur() {
		focused = false;
		activeIndex = -1;
		if (editing) revert();
	}

	function clearInput() {
		cancelSearch();
		searchQuery = '';
		editing = true;
		dismissed = false;
		suggestions = [];
		errorMessage = null;
		activeIndex = -1;
		inputElement?.focus();
	}

	// Kliknięcie opcji nie może zabrać fokusu z pola (blur zamknąłby listę przed wyborem).
	function keepFocus(event: MouseEvent) {
		event.preventDefault();
	}

	$effect(() => () => cancelSearch());
</script>

<div class="combobox">
	<label class="combobox-label" class:visually-hidden={labelHidden} for={inputId}>{label}</label>
	<div class="input-wrap">
		<input
			bind:this={inputElement}
			id={inputId}
			class="combobox-input"
			type="text"
			role="combobox"
			aria-autocomplete="list"
			aria-expanded={open}
			aria-controls={listId}
			aria-activedescendant={activeOption?.id}
			autocomplete="off"
			autocapitalize="off"
			spellcheck="false"
			enterkeyhint="search"
			{placeholder}
			value={displayedValue}
			title={displayedValue || undefined}
			oninput={handleInput}
			onkeydown={handleKeydown}
			onfocus={handleFocus}
			onblur={handleBlur}
		/>
		{#if isSearching}
			<span class="input-spinner" aria-hidden="true"></span>
		{/if}
		{#if displayedValue}
			<button
				type="button"
				class="clear-btn"
				aria-label={`Wyczyść pole: ${label}`}
				onmousedown={keepFocus}
				onclick={clearInput}
			>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path d="M6 6l12 12M18 6L6 18" />
				</svg>
			</button>
		{/if}
	</div>

	<div class="dropdown" hidden={!open}>
		<ul id={listId} class="options" role="listbox" aria-label={`Podpowiedzi: ${label}`}>
			{#each options as option, index (option.id)}
				<!-- Klawiaturę obsługuje pole (wzorzec combobox), opcje nie dostają fokusu. -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<li
					id={option.id}
					class="option"
					class:option--active={index === activeIndex}
					class:option--quick={option.kind === 'quick'}
					role="option"
					aria-selected={index === activeIndex}
					onmousedown={keepFocus}
					onmousemove={() => (activeIndex = index)}
					onclick={() => {
						choose(option);
						inputElement?.blur();
					}}
				>
					<span class="option-icon" aria-hidden="true">
						{#if option.kind === 'quick'}
							<svg viewBox="0 0 24 24">
								<circle cx="12" cy="12" r="7" />
								<circle cx="12" cy="12" r="2.5" class="filled" />
								<path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
							</svg>
						{:else}
							<svg viewBox="0 0 24 24">
								<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 1113 0c0 5.4-6.5 11-6.5 11z" />
								<circle cx="12" cy="10" r="2.3" />
							</svg>
						{/if}
					</span>
					<span class="option-text">
						<span class="option-primary">{option.primary}</span>
						{#if option.secondary}<span class="option-secondary">{option.secondary}</span>{/if}
					</span>
				</li>
			{/each}
		</ul>
		{#if message}
			<p class="dropdown-message" class:dropdown-message--error={errorMessage !== null}>
				{#if isSearching}<span class="input-spinner" aria-hidden="true"></span>{/if}
				{message}
			</p>
		{/if}
	</div>

	<p class="visually-hidden" role="status" aria-live="polite">{announcement}</p>
</div>

<style>
	.combobox {
		position: relative;
		display: flex;
		flex: 1;
		align-items: center;
		gap: var(--odstep-maly);
		min-width: 0;
	}

	.combobox-label {
		flex-shrink: 0;
		width: 1.75rem;
		color: var(--kolor-tekstu-drugorzednego);
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.input-wrap {
		position: relative;
		display: flex;
		flex: 1;
		align-items: center;
		min-width: 0;
	}

	.combobox-input {
		width: 100%;
		min-width: 0;
		min-height: 44px;
		padding: 0 44px 0 var(--odstep-maly);
		border: 1px solid transparent;
		border-radius: var(--zaokraglenie-srednie);
		background: var(--kolor-tla-elementu-drugorzednego);
		color: var(--kolor-tekstu-podstawowego);
		font: inherit;
		/* 16px zapobiega automatycznemu przybliżaniu strony w iOS Safari po dotknięciu pola. */
		font-size: 1rem;
		text-overflow: ellipsis;
	}

	.combobox-input::placeholder {
		color: var(--kolor-tekstu-drugorzednego);
		opacity: 1;
	}

	.combobox-input:focus {
		outline: none;
	}

	.combobox-input:focus-visible {
		border-color: var(--kolor-wyroznienia);
		outline: 2px solid var(--kolor-wyroznienia);
		outline-offset: 1px;
	}

	.input-wrap > .input-spinner {
		position: absolute;
		right: 48px;
	}

	.input-spinner {
		flex-shrink: 0;
		width: 14px;
		height: 14px;
		border: 2px solid var(--kolor-delikatnego-wyroznienia);
		border-top-color: var(--kolor-wyroznienia);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	.clear-btn {
		position: absolute;
		right: 0;
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		padding: 0;
		border: none;
		border-radius: var(--zaokraglenie-srednie);
		background: transparent;
		color: var(--kolor-tekstu-drugorzednego);
		cursor: pointer;
	}

	.clear-btn svg {
		width: 18px;
		height: 18px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-width: 2.2;
	}

	.clear-btn:hover {
		color: var(--kolor-tekstu-podstawowego);
	}

	.clear-btn:focus-visible {
		outline: 2px solid var(--kolor-wyroznienia);
		outline-offset: -4px;
	}

	.dropdown {
		position: absolute;
		z-index: 5;
		top: calc(100% + var(--odstep-bardzo-maly));
		right: 0;
		left: 0;
		overflow: hidden;
		border: 1px solid var(--kolor-obramowania);
		border-radius: var(--zaokraglenie-duze);
		background: var(--kolor-tla-karty);
		box-shadow: var(--cien-panelu-mapy);
	}

	.dropdown[hidden] {
		display: none;
	}

	.options {
		max-height: 15rem;
		margin: 0;
		padding: var(--odstep-bardzo-maly);
		overflow-y: auto;
		list-style: none;
	}

	.options:empty {
		display: none;
	}

	.option {
		display: flex;
		align-items: center;
		gap: var(--odstep-sredni);
		min-height: 44px;
		padding: var(--odstep-maly) var(--odstep-sredni);
		border-radius: var(--zaokraglenie-srednie);
		color: var(--kolor-tekstu-podstawowego);
		cursor: pointer;
	}

	.option--active {
		background: var(--kolor-delikatnego-wyroznienia);
		outline: 2px solid var(--kolor-wyroznienia);
		outline-offset: -2px;
	}

	.option-icon {
		display: grid;
		flex-shrink: 0;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: var(--zaokraglenie-pelne);
		background: var(--kolor-tla-elementu-drugorzednego);
		color: var(--kolor-tekstu-drugorzednego);
	}

	.option--quick .option-icon {
		background: var(--kolor-delikatnego-wyroznienia);
		color: var(--kolor-wyroznienia);
	}

	.option-icon svg {
		width: 18px;
		height: 18px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 2;
	}

	.option-icon .filled {
		fill: currentColor;
	}

	.option-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.option-primary {
		overflow: hidden;
		font-size: 0.9375rem;
		font-weight: 600;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.option-secondary {
		overflow: hidden;
		color: var(--kolor-tekstu-drugorzednego);
		font-size: 0.8125rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.dropdown-message {
		display: flex;
		align-items: center;
		gap: var(--odstep-maly);
		margin: 0;
		padding: var(--odstep-sredni);
		color: var(--kolor-tekstu-drugorzednego);
		font-size: 0.875rem;
		line-height: 1.4;
	}

	.dropdown-message--error {
		background: var(--kolor-tla-ostrzezenia);
		color: var(--kolor-tekstu-ostrzezenia);
	}

	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		padding: 0;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
		border: 0;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.input-spinner {
			animation-duration: 2s;
		}
	}
</style>
