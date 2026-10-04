<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import ChatbotTab from '#lib/components/tabs/ChatbotTab.svelte';
	import FacilitiesTab from '#lib/components/tabs/FacilitiesTab.svelte';
	import MapTab from '#lib/components/tabs/MapTab.svelte';
	import SettingsTab from '#lib/components/tabs/SettingsTab.svelte';
	import SplashScreen from '#lib/components/SplashScreen.svelte';
	import logo from '#lib/assets/KBB/1.svg';
	import type { Component } from 'svelte';
	import { settings } from '../lib/state/settings.svelte';
	import type { Tab } from '../lib/types/navigation';

	const tabs: {
		id: Tab;
		label: string;
		icon: string;
		component: Component;
		fullBleed?: boolean;
	}[] = [
		{
			id: 'map',
			label: 'Trasa',
			icon: 'M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2V5z',
			component: MapTab,
			fullBleed: true
		},
		{
			id: 'facilities',
			label: 'Odkrywaj',
			icon: 'M12 21a9 9 0 100-18 9 9 0 000 18zM15.5 8.5l-2 5-5 2 2-5 5-2z',
			component: FacilitiesTab
		},
		{
			id: 'chatbot',
			label: 'Zapytaj',
			icon: 'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3z',
			component: ChatbotTab,
			fullBleed: true
		},
		{
			id: 'settings',
			label: 'Ustawienia',
			icon: 'M4 6h10M18 6h2M14 6a2 2 0 104 0 2 2 0 10-4 0M4 12h4M12 12h8M8 12a2 2 0 104 0 2 2 0 10-4 0M4 18h12M20 18h0M16 18a2 2 0 104 0 2 2 0 10-4 0',
			component: SettingsTab
		}
	];

	function isTab(value: string | null): value is Tab {
		return tabs.some((tab) => tab.id === value);
	}

	const activeTab: Tab = $derived.by(() => {
		const requestedTab = page.url.searchParams.get('tab');
		return isTab(requestedTab) ? requestedTab : 'map';
	});

	const activeTitle = $derived(tabs.find((tab) => tab.id === activeTab)?.label ?? '');

	let showSplash = $state(true);
	let appName = $state('');

	const logoSrc = `${logo}#svgView(viewBox(147,622,583,572))`;

	async function selectTab(tab: Tab) {
		if (tab === activeTab) return;
		await goto(`?tab=${tab}`, {
			replace: false,
			reset: false
		});
	}

	$effect(() => {
		const styles = getComputedStyle(document.documentElement);
		const readName = (token: string) =>
			styles
				.getPropertyValue(token)
				.trim()
				.replace(/^['"]|['"]$/g, '');
		appName = `${readName('--nazwa-aplikacji')}`;
	});

	$effect(() => {
		document.title = `${appName} | ${activeTitle}`;
	});
</script>

<main class="presentation">
	<aside class="desktop-side-panel">
		<hgroup class="brand-heading">
			<p class="brand-title">
				<span class="appName">{appName}</span><span class="dot">?</span>
			</p>
			<p class="brand-subtitle name-rest"></p>
		</hgroup>
		<p class="description">
			Mobilny panel miejski wspierający dostępność i poruszanie się po Krakowie - bez barier.
		</p>
		<div class="badges" style="display: flex; gap: 0.5rem; flex-wrap: nowrap;">
			<div class="badge">Python</div>
			<div class="badge">SvelteKit</div>
			<div class="badge">QGIS</div>
			<div class="badge">Leaflet</div>
		</div>
	</aside>

	<div class="mobile-viewport">
		{#if showSplash}
			<SplashScreen onfinish={() => (showSplash = false)} />
		{/if}

		<header class="status-bar" inert={showSplash}>
			<span class="clock"
				>{new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</span
			>
			<div class="island"></div>
			<div class="indicators">
				<span class="signal">●●●</span>
				<span class="carrier">T-Mobile</span>
				<span>84%</span>
			</div>
		</header>

		<section class="top-nav" inert={showSplash}>
			<h1 class="brand">
				<img src={logoSrc} alt={appName} class="logo-icon" />
				<span class="appNameTopNav">{appName}</span>
			</h1>
		</section>

		<section class="screen-body" aria-label="Zawartość karty" inert={showSplash}>
			{#each tabs as tab (tab.id)}
				<div class="tab-panel" class:active={activeTab === tab.id} class:full-bleed={tab.fullBleed}>
					<tab.component />
				</div>
			{/each}
		</section>

		<nav class="bottom-bar" aria-label="Główna nawigacja" inert={showSplash}>
			{#each tabs as item (item.id)}
				<button
					class="nav-tab"
					class:active={activeTab === item.id}
					aria-current={activeTab === item.id ? 'page' : undefined}
					onclick={() => selectTab(item.id)}
				>
					<svg
						viewBox="0 0 24 24"
						class="tab-icon"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						aria-hidden="true"
					>
						<path d={item.icon} stroke-linecap="round" stroke-linejoin="round" />
					</svg>
					<span>{item.label}</span>
				</button>
			{/each}
		</nav>
	</div>
</main>

<style>
	:global(*) {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
		font-family: var(--czcionka-podstawowa);
	}

	:global(body) {
		background-color: var(--kolor-czarny);
	}

	.presentation {
		display: flex;
		width: 100vw;
		height: 100dvh;
		min-height: 100vh;
		overflow: hidden;
		background: var(--kolor-tla-pulpitu);
	}

	.desktop-side-panel {
		display: none;
	}

	.mobile-viewport {
		position: relative;
		display: flex;
		width: 100%;
		height: 100%;
		flex-direction: column;
		overflow: hidden;
		background: var(--kolor-tla-strony);
		color: var(--kolor-tekstu-podstawowego);
	}

	/*  pasek telefonu tylko desktop. */
	.status-bar {
		display: none;
		flex-shrink: 0;
		height: 50px;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		column-gap: 8px;
		padding: 8px 30px 0;
		background: var(--kolor-tla-karty);
		font-size: 13px;
		font-weight: 600;
		white-space: nowrap;
	}

	.clock {
		justify-self: start;
	}

	.island {
		width: 92px;
		height: 26px;
		border-radius: var(--zaokraglenie-pelne);
		background: var(--kolor-czarny);
		border: 1px solid var(--kolor-obramowania-telefonu);
		box-shadow: 0 3px 0 var(--kolor-obramowania-telefonu);
		margin-bottom: 6px;
	}

	.indicators {
		display: flex;
		justify-self: end;
		align-items: center;
		gap: 5px;
		font-size: 11px;
	}

	.top-nav {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		row-gap: 6px;
		padding: calc(16px + env(safe-area-inset-top, 0px)) 16px 12px;
		border-bottom: 1px solid var(--kolor-obramowania);
		background: var(--kolor-tla-karty);
	}

	.brand {
		display: flex;
		align-items: center;
	}

	.appNameTopNav {
		margin-left: 12px;
		font-size: 1.625rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		line-height: 1.1;
	}

	.logo-icon {
		width: 44px;
		height: 44px;
		padding: 6px;
		border-radius: var(--zaokraglenie-srednie);
		background: var(--kolor-tla-logo);
	}

	.name-city::before {
		content: var(--nazwa-aplikacji-miasto);
	}

	.name-rest::before {
		content: var(--nazwa-aplikacji-dopisek);
	}

	.screen-body {
		flex: 1;
		overflow-y: auto;
		scrollbar-width: none;
	}

	.screen-body::-webkit-scrollbar {
		display: none;
	}

	.tab-panel {
		display: none;
		padding: var(--odstep-duzy);
	}

	.tab-panel.active {
		display: block;
	}

	.tab-panel.full-bleed {
		height: 100%;
		padding: 0;
	}

	.bottom-bar {
		display: grid;
		min-height: 72px;
		flex-shrink: 0;
		grid-template-columns: repeat(4, 1fr);
		padding-top: 8px;
		padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
		border-top: 2px solid var(--kolor-obramowania-nawigacji);
		background: var(--kolor-tla-karty);
	}

	.nav-tab {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		gap: 4px;
		border: none;
		background: none;
		color: var(--kolor-tekstu-pomocniczego);
		font-size: 0.6875rem;
		cursor: pointer;
	}

	.nav-tab.active {
		color: var(--kolor-wyroznienia);
		font-weight: 600;
	}

	.tab-icon {
		width: 22px;
		height: 22px;
	}

	@media (min-width: 600px) {
		.presentation {
			align-items: center;
			justify-content: center;
			gap: 50px;
			padding: 30px;
			background: radial-gradient(
				circle at 10% 20%,
				var(--kolor-tla-pulpitu-rozjasnione) 50%,
				var(--kolor-tla-pulpitu) 90%
			);
		}

		.status-bar {
			display: grid;
		}

		.top-nav {
			padding-top: 14px;
		}

		.bottom-bar {
			padding-inline: 14px;
			padding-bottom: 14px;
		}

		.desktop-side-panel {
			display: flex;
			max-width: 460px;
			flex-direction: column;
			gap: 20px;
			color: var(--kolor-tytulu-pulpitu);
		}

		.brand-heading {
			display: flex;
			flex-direction: column;
			gap: 8px;
		}

		.brand-title {
			margin: 0;
			font-size: 60px;
			font-weight: 800;
			letter-spacing: -0.03em;
			line-height: 1.05;
		}

		.brand-title .dot {
			color: var(--kolor-kropki-pulpitu);
		}

		.brand-subtitle {
			margin: 0;
			color: var(--kolor-opisu-pulpitu);
			font-size: 28px;
			font-weight: 600;
			letter-spacing: -0.01em;
			line-height: 1.2;
		}

		.description {
			color: var(--kolor-opisu-pulpitu);
			font-size: 20px;
			line-height: 1.5;
		}

		.badge {
			align-self: flex-start;
			padding: 6px 14px;
			border-radius: 10px;
			background: var(--kolor-tla-plakietki-pulpitu);
			color: var(--kolor-plakietki-pulpitu);
			font-size: 15px;
			font-weight: 600;
		}

		.mobile-viewport {
			/* Proporcje ekranu 1170 × 2532 px */
			align-self: center;
			flex-shrink: 0;
			width: auto;
			height: min(844px, calc(100dvh - 60px));
			aspect-ratio: 1170 / 2532;
			border-radius: 44px;
			box-shadow:
				0 25px 60px -15px var(--kolor-cienia-telefonu),
				0 0 0 7px var(--kolor-ramki-telefonu),
				0 0 0 8px var(--kolor-krawedzi-ramki-telefonu);
		}
	}

	@media (min-width: 600px) and (max-height: 760px) {
		.carrier {
			display: none;
		}
	}
</style>
