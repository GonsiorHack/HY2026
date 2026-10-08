<script lang="ts">
	import { settings, textSizes, themes } from './state/settings.svelte';

	const uid = $props.id();
</script>

<div class="tab-content settings">
	<header class="settings-heading">
		<h2>Ustawienia</h2>
		<p>Dostosuj aplikację do siebie.</p>
	</header>
	<section class="card settings-group" aria-labelledby="{uid}-appearance">
		<h3 id="{uid}-appearance">Wygląd</h3>
		<fieldset class="field">
			<legend class="field-label">Motyw aplikacji</legend>
			<div class="segmented">
				{#each themes as option (option.value)}
					<label class="segment">
						<input
							type="radio"
							name="{uid}-theme"
							value={option.value}
							bind:group={settings.theme}
						/>
						<span>
							<svg viewBox="0 0 24 24" aria-hidden="true">
								{#if option.value === 'light'}
									<circle cx="12" cy="12" r="4" />
									<path
										d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"
									/>
								{:else}
									<path d="M20 15.5A9 9 0 0 1 8.5 4 9 9 0 1 0 20 15.5Z" />
								{/if}
							</svg>
							{option.label}
						</span>
					</label>
				{/each}
			</div>
		</fieldset>
	</section>

	<section class="card settings-group" aria-labelledby="{uid}-accessibility">
		<h3 id="{uid}-accessibility">Dostępność</h3>
		<fieldset class="field">
			<legend class="field-label">Rozmiar tekstu</legend>
			<div class="segmented">
				{#each textSizes as option (option.value)}
					<label class="segment">
						<input
							type="radio"
							name="{uid}-text-size"
							value={option.value}
							bind:group={settings.textSize}
						/>
						<span>{option.label}</span>
					</label>
				{/each}
			</div>
		</fieldset>
		<label class="switch-row">
			<span class="switch-text">
				<span class="field-label">Wysoki kontrast</span>
				<small>Wzmacnia kolory tekstu, obramowań i przycisków.</small>
			</span>
			<input class="switch" type="checkbox" role="switch" bind:checked={settings.highContrast} />
		</label>
	</section>

	<section class="card settings-group" aria-labelledby="{uid}-alerts">
		<h3 id="{uid}-alerts">Powiadomienia</h3>
		<label class="switch-row">
			<span class="switch-text">
				<span class="field-label">Wizualne alerty komunikacji</span>
				<small>Zapisz preferencję ostrzeżeń o utrudnieniach w MPK.</small>
			</span>
			<input
				class="switch"
				type="checkbox"
				role="switch"
				bind:checked={settings.visualTransitAlerts}
			/>
		</label>
		<p class="settings-note">Alerty MPK będą dostępne po podłączeniu źródła danych.</p>
	</section>
	<section class="card settings-group" aria-labelledby="{uid}-ai">
		<h3 id="{uid}-ai">Asystent AI - Cypek</h3>
		<label class="switch-row">
			<span class="switch-text">
				<span class="field-label">Animowane odpowiedzi</span>
				<small>
					Ta opcja ma pierwszeństwo przed systemowym ograniczeniem animacji. Wyłącz ją, aby pokazywać odpowiedzi
					od razu.
				</small>
			</span>
			<input class="switch" type="checkbox" role="switch" bind:checked={settings.animateReplies} />
		</label>
		<label class="switch-row">
			<span class="switch-text">
				<span class="field-label">Kontekst rozmowy</span>
				<small>Uwzględniaj poprzednie pytania w tej rozmowie (to nie trening modelu).</small>
			</span>
			<input
				class="switch"
				type="checkbox"
				role="switch"
				bind:checked={settings.useConversationContext}
			/>
		</label>
		<label class="switch-row">
			<span class="switch-text">
				<span class="field-label">Chcę pomagać w ulepszaniu modelu AI</span>
				<small>Zapisz dobrowolną preferencję udziału w przyszłym programie.</small>
			</span>
			<input
				class="switch"
				type="checkbox"
				role="switch"
				bind:checked={settings.aiImprovementOptIn}
			/>
		</label>
		<p class="settings-note">
			Obecnie nie zbieramy rozmów do treningu. Ta preferencja pozostaje na urządzeniu i nie
			uruchamia udostępniania danych.
		</p>
	</section>
</div>

<style>
	.settings {
		gap: 16px;
		padding-bottom: 8px;
	}

	.settings-heading {
		padding: 4px 4px 0;
	}

	.settings-heading h2 {
		margin-bottom: 4px;
		font-size: 1.375rem;
		letter-spacing: -0.03em;
	}

	.settings-heading p,
	.save-note,
	.settings-note {
		color: var(--kolor-tekstu-drugorzednego);
		font-size: 0.8125rem;
		line-height: 1.5;
	}

	.save-note {
		text-align: center;
		padding-inline: 8px;
	}

	.settings-group {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 18px;
		border-radius: 24px;
	}

	h3 {
		font-size: 1rem;
		font-weight: 700;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-inline-size: 0;
		border: 0;
	}

	legend {
		margin-bottom: 10px;
	}

	.field-label {
		font-size: 0.875rem;
		font-weight: 600;
	}

	small {
		color: var(--kolor-tekstu-drugorzednego);
		font-size: 0.75rem;
		line-height: 1.4;
	}

	.segmented {
		display: grid;
		grid-auto-columns: 1fr;
		grid-auto-flow: column;
		gap: 4px;
		padding: 4px;
		border: 1px solid var(--kolor-obramowania);
		border-radius: 20px;
		background: var(--kolor-tla-elementu-drugorzednego);
	}

	.segment {
		position: relative;
		min-width: 0;
	}

	.segment input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.segment span {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		min-height: 44px;
		padding: 10px 4px;
		border-radius: 16px;
		font-size: 0.8125rem;
		font-weight: 600;
		text-align: center;
		cursor: pointer;
		transition:
			background-color 0.2s,
			color 0.2s;
	}

	.segment svg {
		flex-shrink: 0;
		width: 18px;
		height: 18px;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.8;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.segment:hover span {
		background: var(--kolor-delikatnego-wyroznienia);
	}

	.segment input:checked + span {
		background: var(--kolor-wyroznienia);
		color: var(--kolor-tekstu-na-wyroznieniu);
	}

	.segment input:focus-visible + span,
	.switch:focus-visible {
		outline: 2px solid var(--kolor-wyroznienia);
		outline-offset: 2px;
	}

	.switch-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 4px 0;
		cursor: pointer;
	}

	.switch-text {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.switch {
		position: relative;
		flex-shrink: 0;
		width: 48px;
		height: 28px;
		border: 1px solid var(--kolor-obramowania);
		border-radius: 999px;
		background: var(--kolor-tla-wylaczonego-przelacznika);
		appearance: none;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.switch::before {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: var(--kolor-galki-przelacznika);
		box-shadow: var(--cien-karty);
		content: '';
		transition: transform 0.2s;
	}

	.switch:checked {
		border-color: var(--kolor-wyroznienia);
		background: var(--kolor-wyroznienia);
	}

	.switch:checked::before {
		transform: translateX(20px);
	}

	@media (prefers-reduced-motion: reduce) {
		.segment span,
		.switch,
		.switch::before {
			transition: none;
		}
	}
</style>
