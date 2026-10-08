<script lang="ts">
	import { settings } from '#lib/features/settings/state/settings.svelte.ts';

	let { text, onProgress }: { text: string; onProgress: () => void } = $props();
	const words = $derived(text.match(/\S+\s*|\s+/g) ?? []);
	const step = $derived(Math.min(35, 2400 / Math.max(1, words.length)));

	$effect(() => {
		const notifyProgress = onProgress;
		const frame = requestAnimationFrame(() => notifyProgress());
		return () => cancelAnimationFrame(frame);
	});
</script>

<span class="sr-only">{text}</span>
<span class="reply" class:animated={settings.animateReplies} aria-hidden="true">
	<!-- Kolejne slowa lagodnie sie przenikaja w kolejnosci czytania, bez przesuwania tekstu -->
	{#each words as word, index}
		<span class="word" style:animation-delay={`${index * step}ms`}>{word}</span>
	{/each}
</span>

<style>
	.reply {
		display: block;
	}

	.animated .word {
		animation: appear 600ms cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	@keyframes appear {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
