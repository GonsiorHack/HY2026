<script lang="ts">
	import '@fontsource-variable/inter';
	import '../lib/components/tabs/tabs.css';
	import '../lib/theme.css';
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { settings } from '../lib/state/settings.svelte';

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
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
