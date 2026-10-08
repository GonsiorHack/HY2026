<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import SplashScreen from '#lib/components/shell/SplashScreen.svelte';
	import { APP } from '#lib/config/app.ts';
	import { DEFAULT_TAB, NAVIGATION_TABS, isTab, tabHref } from '#lib/config/navigation.ts';
	import type { Tab } from '#lib/config/navigation.types.ts';
	import { settings } from '#lib/features/settings/state/settings.svelte.ts';
	import ChatbotTab from '#lib/features/chat/ChatbotTab.svelte';
	import DiscoverTab from '#lib/features/discover/DiscoverTab.svelte';
	import MapTab from '#lib/features/map/MapTab.svelte';
	import SettingsTab from '#lib/features/settings/SettingsTab.svelte';
	import type { Component } from 'svelte';

	const screens: Record<Tab, Component> = {
		map: MapTab,
		facilities: DiscoverTab,
		chatbot: ChatbotTab,
		settings: SettingsTab
	};

	const activeTab: Tab = $derived.by(() => {
		const requestedTab = page.url.searchParams.get('tab');
		return isTab(requestedTab) ? requestedTab : DEFAULT_TAB;
	});

	const activeScreen = $derived(
		NAVIGATION_TABS.find((tab) => tab.id === activeTab) ?? NAVIGATION_TABS[0]
	);

	let showSplash = $state(true);
	let chatSession = $state(0);

	async function selectTab(tab: Tab) {
		if (tab === activeTab) return;
		await goto(tabHref(tab), {
			replace: false,
			reset: false
		});
	}
</script>

<svelte:head>
	<title>{APP.title} | {activeScreen.label}</title>
</svelte:head>

<main
	class="presentation"
	style:--nazwa-aplikacji={`'${APP.name}'`}
	style:--nazwa-aplikacji-dopisek={`'${APP.tagline}'`}
	style:--logo-aplikacji={`url('${APP.assets.logos[settings.theme]}')`}
>
	<aside class="desktop-side-panel">
		<hgroup class="brand-heading">
			<p class="brand-title" aria-label={APP.title}>
				<span class="appNameLightMode" aria-hidden="true"></span>
				<span class="appNameDarkMode" aria-hidden="true"></span>
			</p>
			<p class="brand-subtitle name-rest"></p>
		</hgroup>
		<p class="description">{APP.description}</p>
		<div class="badges">
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

		<header class="status-bar" class:status-bar--map={activeTab === 'map'} inert={showSplash}>
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

		{#if activeScreen.showTopNav}
			<section class="top-nav" class:top-nav--chat={activeTab === 'chatbot'} inert={showSplash}>
				<h1 class="brand" aria-label={APP.title}>
					<span class="app-logo" aria-hidden="true"></span>
					<span class="appNameTopNav">
						<span class="appNameLightMode" aria-hidden="true"></span>
						<span class="appNameDarkMode" aria-hidden="true"></span>
					</span>
				</h1>
				{#if activeTab === 'chatbot'}
					<button class="new-chat" type="button" onclick={() => chatSession++}>
						<svg viewBox="0 0 24 24" aria-hidden="true">
							<path d="M12 5v14M5 12h14" />
						</svg>
						Nowy czat
					</button>
				{/if}
			</section>
		{/if}

		<section class="screen-body" aria-label="Zawartość karty" inert={showSplash}>
			{#each NAVIGATION_TABS as tab (tab.id)}
				{@const Screen = screens[tab.id]}
				<div class="tab-panel" class:active={activeTab === tab.id} class:full-bleed={tab.fullBleed}>
					{#if tab.id === 'chatbot'}
						{#key chatSession}
							<ChatbotTab />
						{/key}
					{:else}
						<Screen />
					{/if}
				</div>
			{/each}
		</section>

		<nav class="bottom-bar" aria-label="Główna nawigacja" inert={showSplash}>
			{#each NAVIGATION_TABS as item (item.id)}
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

	/* Pasek telefonu tylko na komputerze */
	.status-bar {
		display: none;
		flex-shrink: 0;
		height: 40px;
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
		width: 72px;
		height: 20px;
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
		flex-shrink: 0;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		row-gap: 6px;
		padding: calc(16px + env(safe-area-inset-top, 0px)) 16px 12px;
		border-bottom: 1px solid var(--kolor-obramowania);
		background: var(--kolor-tla-karty);
	}

	.top-nav--chat {
		border-bottom: 0;
	}

	.new-chat {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 40px;
		padding: 8px 12px;
		border: 1px solid var(--kolor-obramowania);
		border-radius: 20px;
		background: var(--kolor-delikatnego-wyroznienia);
		color: var(--kolor-wyroznienia);
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
	}

	.new-chat:focus-visible {
		outline: 2px solid var(--kolor-wyroznienia);
		outline-offset: 2px;
	}

	.new-chat svg {
		width: 16px;
		height: 16px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
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

	.name-rest::before {
		content: var(--nazwa-aplikacji-dopisek);
	}

	.screen-body {
		flex: 1;
		min-height: 0;
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
		min-height: calc(88px + env(safe-area-inset-bottom, 0px));
		flex-shrink: 0;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		column-gap: 12px;
		padding-top: 12px;
		padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
		border-top: 2px solid var(--kolor-obramowania-nawigacji);
		background: var(--kolor-tla-karty);
	}

	.nav-tab {
		min-width: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		gap: 6px;
		border: none;
		background: none;
		color: var(--kolor-tekstu-pomocniczego);
		font-size: 0.75rem;
		cursor: pointer;
	}

	.nav-tab.active {
		color: var(--kolor-wyroznienia);
		font-weight: 600;
	}

	.tab-icon {
		width: 26px;
		height: 26px;
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

		.status-bar--map {
			position: absolute;
			z-index: 2;
			top: 0;
			right: 0;
			left: 0;
			background: transparent;
			color: #000000;
		}

		.status-bar--map .island {
			background: #000000;
			border-color: #000000;
			box-shadow: 0 3px 0 #000000;
		}

		.mobile-viewport:has(.status-bar--map) {
			--odstep-gorny-mapy: 40px;
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

		.badges {
			display: flex;
			gap: 0.5rem;
			flex-wrap: nowrap;
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
			/* Proporcje ekranu 1170 x 2532 px */
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
