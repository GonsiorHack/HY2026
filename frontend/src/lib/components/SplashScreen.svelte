<script lang="ts">
	import splashVideo from '#lib/assets/animacjaWejscia.mp4';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	let { onfinish }: { onfinish: () => void } = $props();

	const MAX_DURATION_MS = 9000;

	let videoElement: HTMLVideoElement;
	let finished = false;

	function finish() {
		if (finished) return;
		finished = true;
		onfinish();
	}

	onMount(() => {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches || videoElement.ended) {
			finish();
			return;
		}

		videoElement.muted = true;
		// case: autoplay blocked (np. Low Power Mode); prosto do apki
		videoElement.play().catch(finish);
		const timeout = setTimeout(finish, MAX_DURATION_MS);
		return () => clearTimeout(timeout);
	});
</script>

<div class="splash" role="status" aria-label="Uruchamianie aplikacji" out:fade={{ duration: 300 }}>
	<video
		bind:this={videoElement}
		src={splashVideo}
		autoplay
		muted
		playsinline
		preload="auto"
		aria-hidden="true"
		onended={finish}
		onerror={finish}
	></video>
	<button class="skip-btn" type="button" onclick={finish}>Pomiń</button>
</div>

<style>
	.splash {
		position: absolute;
		z-index: 100;
		inset: 0;
		background: var(--kolor-tla-ekranu-startowego);
	}

	video {
		width: 100%;
		height: 100%;
		object-fit: cover;
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
