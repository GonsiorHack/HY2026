<script lang="ts">
	import { onDestroy, tick } from 'svelte';

	const PROCESSING_MS = 2000;
	const MENU_TEXT = 'Zgłoś przeszkodę na trasie.';
	const COMMUNITY_TEXT =
		'Dzięki Tobie ktoś inny bezpiecznie dotrze do celu.' + <br> + 'Razem tworzymy Kraków bez barier.';

	type Phase = 'idle' | 'menu' | 'processing' | 'success';

	let phase = $state<Phase>('idle');
	let photoUrl = $state<string | null>(null);

	let root: HTMLDivElement;
	let fab: HTMLButtonElement;
	let fileInput: HTMLInputElement;
	let startButton = $state<HTMLButtonElement>();
	let okButton = $state<HTMLButtonElement>();
	let processingTimer: ReturnType<typeof setTimeout> | undefined;

	const menuOpen = $derived(phase === 'menu');

	async function toggleMenu() {
		if (phase === 'menu') {
			phase = 'idle';
			return;
		}
		if (phase !== 'idle') return;
		phase = 'menu';
		await tick();
		startButton?.focus();
	}

	function openCamera() {
		fileInput.click();
		phase = 'idle';
	}

	function handlePhoto() {
		const file = fileInput.files?.[0];
		fileInput.value = '';
		if (!file) return;

		revokePhoto();
		photoUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
		phase = 'processing';
		clearTimeout(processingTimer);
		processingTimer = setTimeout(async () => {
			phase = 'success';
			await tick();
			okButton?.focus();
		}, PROCESSING_MS);
	}

	function closeSuccess() {
		phase = 'idle';
		revokePhoto();
		fab?.focus();
	}

	function revokePhoto() {
		if (photoUrl) URL.revokeObjectURL(photoUrl);
		photoUrl = null;
	}

	function handleWindowPointerDown(event: PointerEvent) {
		if (phase === 'menu' && !root.contains(event.target as Node)) phase = 'idle';
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape') return;
		if (phase === 'menu') {
			phase = 'idle';
			fab?.focus();
		} else if (phase === 'success') {
			closeSuccess();
		}
	}

	onDestroy(() => {
		clearTimeout(processingTimer);
		revokePhoto();
	});
</script>

<svelte:window onpointerdown={handleWindowPointerDown} onkeydown={handleKeydown} />

<div class="report" bind:this={root}>
	{#if menuOpen}
		<div class="report-menu" id="report-menu" role="dialog" aria-label="Zgłoszenie przeszkody">
			<p>{MENU_TEXT}</p>
			<button class="report-start" type="button" bind:this={startButton} onclick={openCamera}>
				Uruchom aparat
			</button>
		</div>
	{/if}

	<button
		class="report-fab"
		type="button"
		bind:this={fab}
		onclick={toggleMenu}
		disabled={phase === 'processing' || phase === 'success'}
		aria-label="Zgłoś przeszkodę zdjęciem"
		aria-haspopup="dialog"
		aria-expanded={menuOpen}
		aria-controls={menuOpen ? 'report-menu' : undefined}
	>
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path
				d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.4l1.2-1.8A1.5 1.5 0 0 1 10.35 3.5h3.3a1.5 1.5 0 0 1 1.25.7L16.1 6h1.4A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z"
			/>
			<circle cx="12" cy="12.25" r="3.5" />
		</svg>
	</button>

	<input
		class="visually-hidden"
		type="file"
		accept="image/*"
		capture="environment"
		tabindex="-1"
		aria-hidden="true"
		bind:this={fileInput}
		onchange={handlePhoto}
	/>
</div>

{#if phase === 'processing'}
	<div class="report-overlay">
		<div class="report-dialog" role="status" aria-live="polite">
			<span class="report-spinner" aria-hidden="true"></span>
			<p class="report-processing">Przetwarzanie…</p>
		</div>
	</div>
{:else if phase === 'success'}
	<div class="report-overlay">
		<div
			class="report-dialog report-dialog--success"
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="report-success-title"
			aria-describedby="report-success-text"
		>
			<div class="report-heading">
				<span class="report-badge" aria-hidden="true">
					<svg viewBox="0 0 24 24">
						<path
							d="M12 20.5s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 5.5-7.5 10.1-7.5 10.1z"
						/>
						<path d="M8.75 12.25l2.25 2.25 4.25-4.25" />
					</svg>
				</span>
				<h2 id="report-success-title">Potwierdzono zgłoszenie</h2>
			</div>
			{#if photoUrl}
				<img class="report-photo" src={photoUrl} alt="Przesłane zdjęcie przeszkody" />
			{/if}
			<p id="report-success-text" class="report-community" lang="pl">{COMMUNITY_TEXT}</p>
			<button class="report-start" type="button" bind:this={okButton} onclick={closeSuccess}>
				Proszę
			</button>
		</div>
	</div>
{/if}

<style>
	.report {
		position: absolute;
		z-index: 2;
		bottom: calc(
			max(var(--odstep-sredni), env(safe-area-inset-bottom, 0px)) +
				var(--przesuniecie-zgloszenia, 0px)
		);
		left: max(var(--odstep-sredni), env(safe-area-inset-left, 0px));
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--odstep-maly);
	}

	.report-fab {
		display: grid;
		width: var(--rozmiar-przycisku-aparatu);
		height: var(--rozmiar-przycisku-aparatu);
		place-items: center;
		padding: 0;
		border: 2px solid var(--kolor-obwodki-znacznika);
		border-radius: var(--zaokraglenie-pelne);
		background: var(--kolor-wyroznienia);
		box-shadow: var(--cien-panelu-mapy);
		color: var(--kolor-tekstu-na-wyroznieniu);
		cursor: pointer;
	}

	.report-fab svg {
		width: 50%;
		height: 50%;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.8;
	}

	.report-fab[aria-expanded='true'] {
		background: var(--kolor-tla-karty);
		color: var(--kolor-wyroznienia);
	}

	.report-fab:disabled {
		opacity: 0.6;
		cursor: default;
	}

	.report-fab:focus-visible,
	.report-start:focus-visible {
		outline: 2px solid var(--kolor-wyroznienia);
		outline-offset: 2px;
	}

	.report-menu {
		display: flex;
		width: var(--szerokosc-menu-zgloszenia);
		max-width: calc(100vw - 2 * var(--odstep-sredni));
		flex-direction: column;
		gap: var(--odstep-maly);
		padding: var(--odstep-sredni);
		border: 1px solid var(--kolor-obramowania);
		border-radius: var(--zaokraglenie-duze);
		background: var(--kolor-tla-przezroczystej-karty);
		box-shadow: var(--cien-panelu-mapy);
		color: var(--kolor-tekstu-podstawowego);
		animation: report-pop 160ms ease-out;
	}

	.report-menu p {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.report-start {
		padding: var(--odstep-maly) var(--odstep-sredni);
		border: none;
		border-radius: var(--zaokraglenie-pelne);
		background: var(--kolor-wyroznienia);
		color: var(--kolor-tekstu-na-wyroznieniu);
		font: inherit;
		font-size: 0.875rem;
		font-weight: 700;
		cursor: pointer;
	}

	.report-overlay {
		position: absolute;
		z-index: 3;
		inset: 0;
		display: grid;
		grid-template: minmax(0, 1fr) / minmax(0, 1fr);
		place-items: center;
		padding: var(--odstep-duzy);
		background: var(--kolor-tla-zaciemnienia);
	}

	.report-dialog {
		display: flex;
		width: var(--szerokosc-okna-komunikatu);
		max-width: 100%;
		flex-direction: column;
		align-items: center;
		gap: var(--odstep-sredni);
		padding: var(--odstep-duzy);
		border: 1px solid var(--kolor-obramowania);
		border-radius: var(--zaokraglenie-duze);
		background: var(--kolor-tla-karty);
		box-shadow: var(--cien-panelu-mapy);
		color: var(--kolor-tekstu-podstawowego);
		text-align: center;
		animation: report-pop 180ms ease-out;
	}

	.report-dialog p,
	.report-dialog h2 {
		margin: 0;
	}

	.report-dialog h2 {
		font-size: 1.0625rem;
	}

	.report-dialog p {
		font-size: 0.875rem;
		line-height: 1.45;
	}

	.report-dialog .report-start {
		align-self: stretch;
	}

	.report-dialog--success {
		width: var(--szerokosc-okna-podziekowania);
		max-height: 100%;
		gap: var(--odstep-duzy);
		padding: calc(var(--odstep-duzy) * 1.5) var(--odstep-duzy);
		overflow-y: auto;
		border-color: color-mix(in srgb, var(--kolor-wyroznienia) 35%, transparent);
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--kolor-wyroznienia) 14%, var(--kolor-tla-karty)) 0%,
			var(--kolor-tla-karty) 70%
		);
	}

	.report-heading {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--odstep-sredni);
	}

	.report-dialog--success h2 {
		font-size: 1.375rem;
		font-weight: 800;
		letter-spacing: -0.01em;
	}

	.report-dialog--success .report-community {
		align-self: stretch;
		padding: var(--odstep-sredni) var(--odstep-duzy);
		border-left: 4px solid var(--kolor-wyroznienia);
		border-radius: var(--zaokraglenie-srednie);
		background: color-mix(in srgb, var(--kolor-wyroznienia) 10%, transparent);
		color: var(--kolor-tekstu-podstawowego);
		font-size: 0.9375rem;
		font-weight: 500;
		line-height: 1.6;
		text-align: justify;
		overflow-wrap: break-word;
	}

	.report-processing {
		font-weight: 600;
	}

	.report-badge {
		display: grid;
		width: var(--rozmiar-ikony-podziekowania);
		height: var(--rozmiar-ikony-podziekowania);
		place-items: center;
		border-radius: var(--zaokraglenie-pelne);
		background: var(--kolor-wyroznienia);
		box-shadow: 0 0 0 8px color-mix(in srgb, var(--kolor-wyroznienia) 18%, transparent);
		color: var(--kolor-tekstu-na-wyroznieniu);
	}

	.report-badge svg {
		width: 56%;
		height: 56%;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 2;
	}

	/* Zdjęcie kurczy się jako pierwsze, żeby okno zmieściło się w ekranie telefonu. */
	.report-dialog--success .report-photo {
		width: 100%;
		height: var(--wysokosc-zdjecia-podziekowania);
		min-height: 72px;
		flex-shrink: 1;
	}

	.report-dialog--success > :not(.report-photo) {
		flex-shrink: 0;
	}

	.report-photo {
		width: var(--rozmiar-podgladu-zdjecia);
		height: var(--rozmiar-podgladu-zdjecia);
		border: 1px solid var(--kolor-obramowania);
		border-radius: var(--zaokraglenie-srednie);
		object-fit: cover;
	}

	.report-spinner {
		width: var(--rozmiar-znacznika-mapy);
		height: var(--rozmiar-znacznika-mapy);
		border: 3px solid var(--kolor-obramowania);
		border-top-color: var(--kolor-wyroznienia);
		border-radius: var(--zaokraglenie-pelne);
		animation: report-spin 0.8s linear infinite;
	}

	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		clip-path: inset(50%);
		white-space: nowrap;
	}

	@keyframes report-spin {
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes report-pop {
		from {
			opacity: 0;
			transform: translateY(var(--odstep-maly));
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.report-menu,
		.report-dialog {
			animation: none;
		}

		.report-spinner {
			animation-duration: 2.4s;
		}
	}
</style>
