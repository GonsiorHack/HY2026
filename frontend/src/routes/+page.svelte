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

	const tabs: { id: Tab; label: string; icon: string; component: Component }[] = [
		{
			id: 'map',
			label: 'Trasa',
			icon: 'M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2V5z',
			component: MapTab
		},
		{
			id: 'facilities',
			label: 'Miejsca',
			icon: 'M20 5a5 5 0 00-8 2 5 5 0 00-8-2c-5 5 8 15 8 15s17-10 8-15z',
			component: FacilitiesTab
		},
		{
			id: 'chatbot',
			label: 'Chatbot',
			icon: 'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3z',
			component: ChatbotTab
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
		appName = `${readName('--nazwa-aplikacji-miasto')} ${readName('--nazwa-aplikacji-dopisek')}`;
	});

	$effect(() => {
		document.title = `${appName} | ${activeTitle}`;
	});
</script>

<main class="presentation">
	<aside class="desktop-side-panel">
		<p class="brand-title">
			<span class="name-city"></span><span class="dot">,</span> <br>
			<span class="name-rest"></span>
		</p>
		<p class="description">
			Mobilny panel miejski wspierający dostępność i poruszanie się po Krakowie - bez barier.
		</p>
		<div class="badge">HackYeah2026</div>
	</aside>

	<div class="mobile-viewport">
		{#if showSplash}
			<SplashScreen onfinish={() => (showSplash = false)} />
		{/if}

		<header class="status-bar" inert={showSplash}>
			<span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
			<div class="island"></div>
			<div class="indicators">
				<span class="signal">●●●</span>
				<span>T-Mobile</span>
				<span>84%</span>
			</div>
		</header>

		<section class="top-nav" inert={showSplash}>
			<h1 class="brand">
				<img src={logoSrc} alt={appName} class="logo-icon" />
			</h1>
		</section>

		<section class="screen-body" aria-label="Zawartość karty" inert={showSplash}>
			{#each tabs as tab (tab.id)}
				<div class="tab-panel" class:active={activeTab === tab.id}>
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
		overflow: hidden;
		background: var(--kolor-tla-ciemna);
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
		height: 44px;
		align-items: center;
		justify-content: space-between;
		padding: 0 16px;
		font-size: 13px;
		font-weight: 600;
	}

	.island {
		width: 90px;
		height: 22px;
		border-radius: 12px;
		background: var(--kolor-czarny);
	}

	.indicators {
		display: flex;
		gap: 6px;
		font-size: 11px;
	}

	.top-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: calc(10px + env(safe-area-inset-top, 0px)) 16px 10px;
		border-bottom: 1px solid var(--kolor-obramowania);
		background: var(--kolor-tla-karty);
	}

	.brand {
		display: flex;
		align-items: center;
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
		padding: 16px;
	}

	.tab-panel {
		display: none;
	}

	.tab-panel.active {
		display: block;
	}

	.bottom-bar {
		display: grid;
		min-height: 64px;
		grid-template-columns: repeat(4, 1fr);
		padding-bottom: env(safe-area-inset-bottom, 0px);
		border-top: 1px solid var(--kolor-obramowania);
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
				var(--kolor-obudowy-telefonu) 50%,
				var(--kolor-tla-ciemna) 90%
			);
		}

		.status-bar {
			display: flex;
		}

		.top-nav {
			padding-top: 10px;
		}

		.desktop-side-panel {
			display: flex;
			max-width: 460px;
			flex-direction: column;
			gap: 20px;
			color: var(--kolor-jasnego-tekstu);
		}

		.brand-title {
			font-size: 60px;
			font-weight: 800;
			letter-spacing: -0.03em;
			line-height: 1.05;
		}

		.brand-title .dot {
			color: var(--kolor-wyroznienia);
		}

		.description {
			color: var(--kolor-tekstu-pomocniczego);
			font-size: 20px;
			line-height: 1.5;
		}

		.badge {
			align-self: flex-start;
			padding: 6px 14px;
			border-radius: 10px;
			background: var(--kolor-delikatnego-wyroznienia);
			color: var(--kolor-tekstu-informacji);
			font-size: 15px;
			font-weight: 600;
		}

		.mobile-viewport {
			/* Proporcje ekranu 1170 × 2532 px */
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
</style>
