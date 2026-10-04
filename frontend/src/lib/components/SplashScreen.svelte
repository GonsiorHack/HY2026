<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	let { onfinish }: { onfinish: () => void } = $props();

	const INTRO_DURATION_MS = 5200;
	const LOAD_TIMEOUT_MS = 9000;
	const VIDEO_STALL_MS = 2500;

	let videoElement = $state<HTMLVideoElement>();
	let finished = false;
	let mode = $state<'video' | 'image' | 'poster'>('poster');
	let initialized = $state(false);
	let imageSequence = $state(0);
	let imageReady = false;
	let visibleElapsed = 0;
	let stalledElapsed = 0;
	let lastVideoTime = 0;

	function finish() {
		if (finished) return;
		finished = true;
		videoElement?.pause();
		onfinish();
	}

	function showImageFallback() {
		if (finished || mode !== 'video') return;
		mode = 'image';
		imageReady = false;
		visibleElapsed = 0;
		videoElement?.pause();
	}

	function handleImageLoad() {
		imageReady = true;
		visibleElapsed = 0;
	}

	function handleImageError() {
		console.warn('Nie udało się załadować obrazu ekranu powitalnego.');
		if (mode === 'image') {
			mode = 'poster';
			imageReady = false;
			visibleElapsed = 0;
		} else {
			// Nawet przy braku plakatu pozostawiamy ekran z przyciskiem „Pomiń”.
			imageReady = true;
			visibleElapsed = 0;
		}
	}

	function handleVideoEnded() {
		if (finished || mode !== 'video' || document.hidden || !videoElement) return;
		if (lastVideoTime > 0 && videoElement.currentTime >= INTRO_DURATION_MS / 1000 - 0.2) {
			finish();
		} else {
			showImageFallback();
		}
	}

	onMount(() => {
		const userAgent = navigator.userAgent;
		const isIOS =
			/iPad|iPhone|iPod/.test(userAgent) ||
			(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
		const isSafari =
			/AppleWebKit/.test(userAgent) && !/Chrome|Chromium|Edg|OPR|Android/.test(userAgent);
		const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

		mode = reducedMotion ? 'poster' : isIOS || isSafari ? 'image' : 'video';
		initialized = !document.hidden;

		function playVideo() {
			if (finished || mode !== 'video' || !videoElement || document.hidden) return;
			videoElement.muted = true;
			videoElement.defaultMuted = true;
			videoElement.playsInline = true;
			videoElement.play()?.catch((error: unknown) => {
				if (finished || mode !== 'video' || document.hidden) return;
				console.warn('Autoodtwarzanie intro niedostępne; używam animacji WebP.', error);
				showImageFallback();
			});
		}

		let lastTick = performance.now();
		function handleVisibilityChange() {
			lastTick = performance.now();
			if (document.hidden) videoElement?.pause();
			else {
				initialized = true;
				// Animowanego obrazu nie można wstrzymać, więc po powrocie odtwarzamy go od początku.
				if (mode === 'image') {
					imageReady = false;
					visibleElapsed = 0;
					imageSequence += 1;
				}
				playVideo();
			}
		}
		document.addEventListener('visibilitychange', handleVisibilityChange);

		const clock = setInterval(() => {
			const now = performance.now();
			const elapsed = now - lastTick;
			lastTick = now;
			if (finished || document.hidden) return;

			if (mode === 'video') {
				if (!videoElement) return;
				if (videoElement.currentTime > lastVideoTime) stalledElapsed = 0;
				else stalledElapsed += elapsed;
				lastVideoTime = videoElement.currentTime;
				if (stalledElapsed >= VIDEO_STALL_MS) showImageFallback();
				else if (videoElement.paused) playVideo();
				return;
			}

			visibleElapsed += elapsed;
			if (imageReady) {
				if (visibleElapsed >= INTRO_DURATION_MS) finish();
			} else if (visibleElapsed >= LOAD_TIMEOUT_MS) {
				handleImageError();
			}
		}, 100);

		return () => {
			finished = true;
			clearInterval(clock);
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			videoElement?.pause();
		};
	});
</script>

<div class="splash" role="status" aria-label="Uruchamianie aplikacji" out:fade={{ duration: 300 }}>
	{#if initialized && mode === 'video'}
		<video
			bind:this={videoElement}
			src="/animacjaWejscia.mp4"
			poster="/animacjaWejscia-poster.jpg"
			muted
			playsinline
			webkit-playsinline
			disablepictureinpicture
			disableremoteplayback
			preload="auto"
			aria-hidden="true"
			onended={handleVideoEnded}
			onerror={showImageFallback}
		></video>
	{:else if initialized}
		{#key imageSequence}
			<img
				src={mode === 'image'
					? `/animacjaWejscia.webp?intro=${imageSequence}`
					: '/animacjaWejscia-poster.jpg'}
				alt=""
				aria-hidden="true"
				onload={handleImageLoad}
				onerror={handleImageError}
			/>
		{/key}
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
