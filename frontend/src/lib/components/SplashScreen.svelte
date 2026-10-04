<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	let { onfinish }: { onfinish: () => void } = $props();

	/* Długość animacji wejścia (5,17 s) z zapasem na wolne łącze. */
	const INTRO_DURATION_MS = 5200;
	const MAX_DURATION_MS = 9000;

	let videoElement: HTMLVideoElement;
	let finished = false;
	/* Safari w trybie oszczędzania energii blokuje autoodtwarzanie wideo - wtedy pokazujemy animowany WebP, który iOS odtwarza zawsze. */
	let useImageFallback = $state(false);

	function finish() {
		if (finished) return;
		finished = true;
		onfinish();
	}

	let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

	function showImageFallback() {
		if (finished || useImageFallback) return;
		useImageFallback = true;
		videoElement?.pause();
		fallbackTimer = setTimeout(finish, INTRO_DURATION_MS);
	}

	onMount(() => {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches || videoElement.ended) {
			finish();
			return;
		}

		videoElement.muted = true;
		videoElement.defaultMuted = true;
		videoElement.playsInline = true;

		/* play() od razu - iOS często ignoruje preload i nie wyśle „loadeddata”, dopóki odtwarzanie nie ruszy. */
		videoElement.play()?.catch((err: DOMException) => {
			if (err.name !== 'AbortError') showImageFallback();
		});

		/* Część wersji Safari nie odrzuca play(), tylko zostawia film zatrzymany; buforowanie na wolnym łączu nie włącza zastępstwa. */
		const stallCheck = setTimeout(() => {
			if (videoElement.paused && !videoElement.ended) showImageFallback();
		}, 1200);

		const timeout = setTimeout(finish, MAX_DURATION_MS);
		return () => {
			clearTimeout(timeout);
			clearTimeout(stallCheck);
			clearTimeout(fallbackTimer);
		};
	});
</script>

<div class="splash" role="status" aria-label="Uruchamianie aplikacji" out:fade={{ duration: 300 }}>
	<video
		bind:this={videoElement}
		class:hidden={useImageFallback}
		src="/animacjaWejscia.mp4"
		poster="/animacjaWejscia-poster.jpg"
		autoplay
		muted
		playsinline
		webkit-playsinline
		disablepictureinpicture
		disableremoteplayback
		preload="auto"
		aria-hidden="true"
		onended={finish}
		onerror={showImageFallback}
	></video>
	{#if useImageFallback}
		<img src="/animacjaWejscia.webp" alt="" aria-hidden="true" />
	{/if}
	<button class="skip-btn" type="button" onclick={finish}>Pomiń</button>
</div>

<style>
	.splash {
		position: absolute;
		z-index: 100;
		inset: 0;
		background: var(--kolor-tla-ekranu-startowego);
	}

	video,
	img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	img {
		position: absolute;
		inset: 0;
	}

	.hidden {
		visibility: hidden;
	}

	/* Ukrywa natywny przycisk odtwarzania Safari, który pojawia się, gdy autoodtwarzanie jest zablokowane. */
	video::-webkit-media-controls,
	video::-webkit-media-controls-start-playback-button,
	video::-webkit-media-controls-overlay-play-button {
		display: none !important;
		-webkit-appearance: none;
	}

	.skip-btn {
		position: absolute;
		right: 16px;
		bottom: calc(24px + env(safe-area-inset-bottom, 0px));
		padding: 8px 16px;
		border: none;
		border-radius: 999px;
		background: var(--kolor-tla-przycisku-pomin);
		color: var(--kolor-jasnego-tekstu);
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
	}

	.skip-btn:focus-visible {
		outline: 2px solid var(--kolor-wyroznienia);
		outline-offset: 2px;
	}
</style>
