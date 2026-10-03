<script lang="ts">
	import { mobilityProfiles, settings, textSizes, themes } from '../../state/settings.svelte';

	const uid = $props.id();
	let vibrationMessage = $state('');

	function testVibration() {
		if (!('vibrate' in navigator)) {
			vibrationMessage = 'To urządzenie nie obsługuje wibracji.';
			return;
		}
		vibrationMessage = '';
		navigator.vibrate(settings.vibrationIntensity * 4);
	}
</script>

<div class="tab-content settings">
	<section class="card settings-group" aria-labelledby="{uid}-appearance">
		<h2 id="{uid}-appearance">Wygląd</h2>
		<fieldset class="field">
			<legend class="field-label">Motyw</legend>
			<div class="segmented">
				{#each themes as option (option.value)}
					<label class="segment">
						<input
							type="radio"
							name="{uid}-theme"
							value={option.value}
							bind:group={settings.theme}
						/>
						<span>{option.label}</span>
					</label>
				{/each}
			</div>
		</fieldset>
	</section>

	<section class="card settings-group" aria-labelledby="{uid}-accessibility">
		<h2 id="{uid}-accessibility">Dostępność</h2>
		<label class="switch-row">
			<span class="switch-text">
				<span class="field-label">Wysoki kontrast</span>
				<small>Wzmacnia kolory tekstu, obramowań i przycisków w wybranym motywie.</small>
			</span>
			<input class="switch" type="checkbox" role="switch" bind:checked={settings.highContrast} />
		</label>
	</section>

	<section class="card settings-group" aria-labelledby="{uid}-mobility">
		<h2 id="{uid}-mobility">Profil mobilności</h2>
		<fieldset class="field profile-list">
			<legend class="visually-hidden">Wybierz profil mobilności</legend>
			{#each mobilityProfiles as profile (profile.value)}
				<label class="profile-option">
					<input
						type="radio"
						name="{uid}-mobility-profile"
						value={profile.value}
						bind:group={settings.mobilityProfile}
					/>
					<span class="profile-text">
						<strong>{profile.label}</strong>
						<small>{profile.description}</small>
					</span>
				</label>
			{/each}
		</fieldset>
	</section>

	<section class="card settings-group" aria-labelledby="{uid}-alerts">
		<h2 id="{uid}-alerts">Wibracje i alerty</h2>
		<label class="switch-row">
			<span class="switch-text">
				<span class="field-label">Wizualne alerty komunikacji</span>
				<small>Pokazuj ostrzeżenia o awariach wind i utrudnieniach w MPK.</small>
			</span>
			<input
				class="switch"
				type="checkbox"
				role="switch"
				bind:checked={settings.visualTransitAlerts}
			/>
		</label>
	</section>
</div>

<style>
	.settings-group {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	h2 {
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

	.field-label {
		font-size: 0.875rem;
		font-weight: 600;
	}

	small,
	.hint {
		color: var(--kolor-tekstu-drugorzednego);
		font-size: 0.75rem;
		line-height: 1.4;
	}

	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	.segmented {
		display: grid;
		grid-auto-columns: 1fr;
		grid-auto-flow: column;
		gap: 4px;
		padding: 4px;
		border-radius: var(--zaokraglenie-srednie);
		background: var(--kolor-tla-elementu-drugorzednego);
	}

	.segment input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.segment span {
		display: block;
		padding: 8px 4px;
		border-radius: var(--zaokraglenie-male);
		font-size: 0.8125rem;
		font-weight: 600;
		text-align: center;
		cursor: pointer;
	}

	.segment input:checked + span {
		background: var(--kolor-wyroznienia);
		color: var(--kolor-tekstu-na-wyroznieniu);
	}

	.segment input:focus-visible + span,
	.switch:focus-visible,
	.profile-option input:focus-visible,
	.slider:focus-visible,
	.secondary-btn:focus-visible {
		outline: 2px solid var(--kolor-wyroznienia);
		outline-offset: 2px;
	}

	.switch-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		cursor: pointer;
	}

	.switch-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
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

	.profile-list {
		gap: 8px;
	}

	.profile-option {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 12px;
		border: 1px solid var(--kolor-obramowania);
		border-radius: var(--zaokraglenie-srednie);
		cursor: pointer;
	}

	.profile-option:has(input:checked) {
		border-color: var(--kolor-wyroznienia);
		background: var(--kolor-delikatnego-wyroznienia);
	}

	.profile-option input {
		flex-shrink: 0;
		width: 20px;
		height: 20px;
		margin-top: 1px;
		border: 2px solid var(--kolor-tekstu-drugorzednego);
		border-radius: 50%;
		background: var(--kolor-tla-karty);
		appearance: none;
		cursor: pointer;
	}

	.profile-option input:checked {
		border-color: var(--kolor-wyroznienia);
		background: var(--kolor-wyroznienia);
		box-shadow: inset 0 0 0 3px var(--kolor-tla-karty);
	}

	.profile-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-size: 0.875rem;
	}

	.slider-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	output {
		color: var(--kolor-wyroznienia);
		font-size: 0.875rem;
		font-weight: 700;
	}

	.slider {
		width: 100%;
		accent-color: var(--kolor-wyroznienia);
	}

	.secondary-btn {
		align-self: flex-start;
		padding: 8px 12px;
		border: 1px solid var(--kolor-wyroznienia);
		border-radius: var(--zaokraglenie-srednie);
		background: transparent;
		color: var(--kolor-wyroznienia);
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
	}

	.secondary-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
