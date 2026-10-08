<script lang="ts">
	import '@fontsource-variable/inter';
	import '#lib/styles/shared.css';
	import '#lib/styles/theme.css';
	import '#lib/styles/brand.css';
	import '#lib/styles/tailwind.css';
	import '#lib/styles/base.css';
	import { onMount } from 'svelte';
	import { settings } from '#lib/features/settings/state/settings.svelte.ts';

	let { children } = $props();

	let restored = $state(false);

	onMount(() => {
		settings.restore(localStorage);
		restored = true;
	});

	$effect(() => {
		if (restored) settings.persist(localStorage);
	});

	$effect(() => {
		document.documentElement.dataset.theme = settings.theme;
		document.documentElement.dataset.contrast = settings.highContrast ? 'high' : 'standard';
		document.documentElement.dataset.textSize = settings.textSize;
	});
</script>

<svelte:head>
	<link rel="icon" type="image/svg+xml" href="/branding/favicon.svg" />
</svelte:head>

{@render children()}
