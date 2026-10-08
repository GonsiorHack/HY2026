<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { fade } from 'svelte/transition';
	import { APP } from '#lib/config/app.ts';

	let { onfinish }: { onfinish: () => void } = $props();

	// Nie podmieniamy nowego intro na stare nagranie, gdy pliku brakuje
	const VIDEO_SOURCES = [APP.assets.introVideo];
	const MEDIA_TIMEOUT_MS = 12_000;

	let videoElement = $state<HTMLVideoElement>();
	let finished = false;
	let mode = $state<'video' | 'poster'>('video');
	let playback = $state<'loading' | 'playing' | 'blocked'>('loading');
	let mounted = $state(false);
	let sourceIndex = $state(0);
	let inactiveElapsed = 0;
	let lastVideoTime = 0;
	let playAttempt = 0;
	let playbackMessage = $state('');
	const failedVideos = new WeakSet<HTMLVideoElement>();
	let activeVideo: HTMLVideoElement | undefined;
	let videoProgress = $state(false);

	// Efekt rusza dopiero po zamontowaniu nowego elementu <video>, takze po
	// zmianie pliku zapasowego, klikniecie przycisku wywoluje play() bezposrednio
	$effect(() => {
		if (!mounted || mode !== 'video' || !videoElement) return;
		const element = videoElement;
		const index = sourceIndex;
		untrack(() => {
			// Podczas wymiany klucza bind:this moze jeszcze wskazywac stary film
			if (element.getAttribute('src') !== VIDEO_SOURCES[index]) return;
			activeVideo = element;
			videoProgress = false;
			void playVideo(element);
		});
	});

	function finish() {
		if (finished) return;
		finished = true;
		playAttempt += 1;
		videoElement?.pause();
		onfinish();
	}

	async function playVideo(element: HTMLVideoElement) {
		if (finished || mode !== 'video' || document.hidden || failedVideos.has(element)) return;
		const attempt = ++playAttempt;
		playback = 'loading';
		playbackMessage = '';
		inactiveElapsed = 0;
		// Wyciszenie jest ustawione takze w HTML przed pierwsza proba autoplay
		// Nigdy nie prosimy o dzwiek ani nie odciszamy filmu
		element.muted = true;
		element.defaultMuted = true;
		try {
			await element.play();
		} catch (error) {
			if (finished || attempt !== playAttempt || element !== videoElement || document.hidden)
				return;
			if (error instanceof Error && error.name === 'NotAllowedError') {
				playback = 'blocked';
				playbackMessage =
					'Przeglądarka blokuje również odtwarzanie bez dźwięku. Kliknij, aby rozpocząć.';
			} else if (error instanceof Error && error.name === 'AbortError') {
				playback = 'blocked';
				playbackMessage = 'Odtwarzanie przerwano. Kliknij, aby wznowić intro.';
			} else {
				useNextMedia(element, error);
			}
		}
	}

	function useNextMedia(element: HTMLVideoElement, reason: unknown) {
		// error i odrzucone play() moga dotyczyc TEJ SAMEJ awarii
		// Obslugujemy ja raz, aby nie przeskoczyc sprawnego filmu zapasowego
		if (finished || mode !== 'video' || failedVideos.has(element)) return;
		if (element.getAttribute('src') !== VIDEO_SOURCES[sourceIndex]) return;
		failedVideos.add(element);
		console.warn(`Nie można odtworzyć intro ${VIDEO_SOURCES[sourceIndex]}.`, reason);
		playAttempt += 1;
		// Stan zmieniamy przed pause(), aby zdarzenie pause nie pokazalo przycisku
		playback = 'loading';
		element.pause();
		activeVideo = undefined;
		inactiveElapsed = 0;
		lastVideoTime = 0;
		playbackMessage = '';
		if (sourceIndex + 1 < VIDEO_SOURCES.length) sourceIndex += 1;
		else {
			mode = 'poster';
			playbackMessage = `Nie można odtworzyć ${APP.assets.introVideo}. Sprawdź, czy plik jest w katalogu static.`;
		}
	}

	function handlePlaying(event: Event) {
		if (event.currentTarget !== videoElement || finished) return;
		if (document.hidden) {
			videoElement?.pause();
			return;
		}
		playback = 'playing';
		playbackMessage = '';
		inactiveElapsed = 0;
	}

	function handlePause() {
		if (finished || document.hidden || playback !== 'playing') return;
		playback = 'blocked';
		playbackMessage = 'Intro zostało wstrzymane. Kliknij, aby wznowić odtwarzanie.';
	}

	function handleVideoError(event: Event) {
		if (event.currentTarget !== videoElement) return;
		if (videoElement) useNextMedia(videoElement, videoElement.error);
	}

	function handleVideoEnded(event: Event) {
		if (event.currentTarget !== activeVideo || !videoProgress) return;
		finish();
	}

	function startIntro() {
		if (mode === 'poster') {
			sourceIndex = 0;
			mode = 'video';
			playback = 'blocked';
			playbackMessage = 'Kliknij, aby odtworzyć intro.';
		} else if (videoElement) {
			void playVideo(videoElement);
		}
	}

	onMount(() => {
		mounted = true;

		let lastTick = performance.now();
		function handleVisibilityChange() {
			lastTick = performance.now();
			if (document.hidden) {
				playAttempt += 1;
				videoElement?.pause();
			} else if (!finished) {
				if (mode === 'video' && videoElement && playback !== 'blocked') {
					void playVideo(videoElement);
				}
			}
		}
		document.addEventListener('visibilitychange', handleVisibilityChange);

		const clock = setInterval(() => {
			const now = performance.now();
			const elapsed = now - lastTick;
			lastTick = now;
			if (finished || document.hidden) return;

			if (mode === 'video') {
				if (!videoElement || videoElement !== activeVideo || failedVideos.has(videoElement)) return;
				// Odmowa autoplay to nie awaria filmu, nie odliczamy wtedy timeoutu
				// i nie ponawiamy play() w petli - czekamy na uzytkownika
				if (playback === 'blocked') return;
				if (videoElement.currentTime > lastVideoTime) inactiveElapsed = 0;
				else inactiveElapsed += elapsed;
				lastVideoTime = videoElement.currentTime;
				if (inactiveElapsed >= MEDIA_TIMEOUT_MS) {
					useNextMedia(
						videoElement,
						new Error('Przekroczono czas ładowania lub film przestał się odtwarzać.')
					);
				}
				return;
			}
		}, 100);

		return () => {
			finished = true;
			playAttempt += 1;
			clearInterval(clock);
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			videoElement?.pause();
		};
	});
</script>

<div class="splash" aria-label="Uruchamianie aplikacji" out:fade={{ duration: 300 }}>
	<!-- Stary plakat jest pusty/bialy, dlatego przed filmem pokazujemy marke -->
	<div class="intro-brand" class:static-brand={mode === 'poster'} aria-hidden="true">
		<span class="intro-name"></span><span class="intro-dot">?</span>
	</div>
	{#if mounted && mode === 'video'}
		{#key sourceIndex}
			<video
				bind:this={videoElement}
				src={VIDEO_SOURCES[sourceIndex]}
				class:video-ready={videoProgress}
				autoplay
				muted
				playsinline
				webkit-playsinline
				disablepictureinpicture
				disableremoteplayback
				preload="auto"
				aria-hidden="true"
				onplaying={handlePlaying}
				onpause={handlePause}
				ontimeupdate={(event) => {
					if (event.currentTarget === activeVideo && activeVideo.currentTime > 0) {
						videoProgress = true;
					}
				}}
				onended={handleVideoEnded}
				onerror={handleVideoError}
			></video>
		{/key}
	{/if}
	{#if !mounted || (mode === 'video' && playback === 'loading')}
		<p class="loading-status" role="status">Ładowanie intro…</p>
	{/if}
	{#if mounted && ((mode === 'video' && playback === 'blocked') || mode === 'poster')}
		<div class="play-prompt">
			<p role="status">
				{playbackMessage || 'Nie udało się załadować intro. Spróbuj ponownie lub wybierz „Pomiń”.'}
			</p>
			<button class="play-btn" type="button" onclick={startIntro}>
				{mode === 'poster' ? 'Spróbuj ponownie' : 'Odtwórz intro'}
			</button>
		</div>
	{/if}
	<button class="skip-btn" type="button" onclick={finish}>Pomiń</button>
</div>

<style>
	.splash {
		position: absolute;
		z-index: 100;
		inset: 0;
		background: var(--kolor-tla-strony);
	}

	video {
		position: absolute;
		inset: 0;
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	video {
		opacity: 0;
	}

	video.video-ready {
		opacity: 1;
	}

	.intro-brand {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--kolor-tekstu-podstawowego);
		font-size: clamp(1.75rem, 7vw, 3rem);
		font-weight: 800;
	}

	.static-brand {
		background: var(--kolor-tla-strony);
		z-index: 1;
	}

	.intro-name::before {
		content: var(--nazwa-aplikacji);
	}

	.intro-dot {
		color: var(--kolor-kropki-pulpitu);
	}

	.loading-status {
		position: absolute;
		z-index: 2;
		top: 65%;
		left: 50%;
		transform: translate(-50%, -50%);
		margin: 0;
		padding: 12px 16px;
		border-radius: var(--zaokraglenie-srednie);
		background: var(--kolor-tla-przezroczystej-karty);
		color: var(--kolor-tekstu-podstawowego);
		text-align: center;
	}

	video::-webkit-media-controls,
	video::-webkit-media-controls-start-playback-button,
	video::-webkit-media-controls-overlay-play-button {
		display: none !important;
		-webkit-appearance: none;
	}

	.skip-btn,
	.play-btn {
		padding: 8px 16px;
		border: none;
		border-radius: 999px;
		background: var(--kolor-tla-przycisku-pomin);
		color: var(--kolor-jasnego-tekstu);
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
	}

	.skip-btn {
		position: absolute;
		z-index: 3;
		right: 16px;
		bottom: calc(24px + env(safe-area-inset-bottom, 0px));
	}

	.play-prompt {
		position: absolute;
		z-index: 2;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 16px;
		padding: 24px;
		background: var(--kolor-tla-zaciemnienia);
		color: var(--kolor-jasnego-tekstu);
		text-align: center;
	}

	.play-btn {
		min-height: 48px;
		background: var(--kolor-wyroznienia);
		color: var(--kolor-tekstu-na-wyroznieniu);
	}

	.skip-btn:focus-visible,
	.play-btn:focus-visible {
		outline: 2px solid var(--kolor-wyroznienia);
		outline-offset: 2px;
	}
</style>
