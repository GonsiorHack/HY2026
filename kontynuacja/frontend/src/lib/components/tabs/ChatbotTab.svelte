<script lang="ts">
	const uid = $props.id();
	const suggestedQuestions = [
		'Jak dotrzeć na Wawel bez schodów?',
		'Jakie zniżki przysługują mi w komunikacji miejskiej?'
	];

	let selectedQuestion = $state('');
	let showNotice = $state(false);

	function tryChat(question = '') {
		selectedQuestion = question;
		showNotice = true;
	}
</script>

<section class="ask-page" aria-labelledby="{uid}-title">
	<header>
		<p class="eyebrow">ASYSTENT AI</p>
	</header>

	<div class="conversation">
		<div class="assistant-icon" aria-hidden="true">
			<svg viewBox="0 0 24 24">
				<rect x="6" y="6" width="12" height="12" rx="2" />
				<rect x="10" y="10" width="4" height="4" rx="1" />
				<path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
			</svg>
		</div>
		<div class="greeting">
			<p class="assistant-name">Twój asystent</p>
			<p>Cześć, co robimy?</p>
		</div>
	</div>

	{#if selectedQuestion}
		<p class="user-message">{selectedQuestion}</p>
	{/if}

	<div class="notice" class:notice--visible={showNotice} role="status" aria-live="polite">
		{#if showNotice}
			<p class="notice-title">Jeszcze chwilę!</p>
			<p>Asystent nie jest jeszcze gotowy. Pracujemy nad tą funkcją.</p>
		{/if}
	</div>

	<div class="chat-controls">
		{#if !showNotice}
			<section class="suggestions" aria-labelledby="{uid}-suggestions">
				<h3 id="{uid}-suggestions">Przykładowe pytania</h3>
				{#each suggestedQuestions as question}
					<button class="question-btn" type="button" onclick={() => tryChat(question)}>
						<span>{question}</span>
						<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
					</button>
				{/each}
			</section>
		{/if}
		<button
			class="chat-entry"
			type="button"
			aria-label="Zadaj pytanie — funkcja w przygotowaniu"
			onclick={() => tryChat()}
		>
			<span>Zadaj pytanie…</span>
			<span class="send-icon" aria-hidden="true">
				<svg viewBox="0 0 24 24"><path d="m5 12 7-7 7 7M12 5v14" /></svg>
			</span>
		</button>
	</div>
</section>

<style>
	.ask-page {
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 0;
		min-height: 100%;
		box-sizing: border-box;
		padding: var(--odstep-sredni);
		color: var(--kolor-tekstu-podstawowego);
	}

	p,
	h2,
	h3 {
		margin: 0;
	}

	.eyebrow {
		color: var(--kolor-tekstu-drugorzednego);
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.12em;
	}

	h2 {
		margin: 4px 0;
		font-size: 1.5rem;
		line-height: 1.2;
	}

	.intro {
		color: var(--kolor-tekstu-drugorzednego);
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.conversation {
		display: flex;
		align-items: flex-start;
		gap: 10px;
	}

	.assistant-icon {
		display: grid;
		flex-shrink: 0;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: 12px;
		background: var(--kolor-delikatnego-wyroznienia);
		color: var(--kolor-wyroznienia);
	}

	svg {
		width: 20px;
		height: 20px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.greeting {
		flex: 1;
		min-width: 0;
		padding: 10px 12px;
		border: 1px solid var(--kolor-obramowania);
		border-radius: 4px 16px 16px;
		background: var(--kolor-tla-karty);
		font-size: 0.9375rem;
		line-height: 1.5;
	}

	.assistant-name {
		margin-bottom: 4px;
		color: var(--kolor-tekstu-drugorzednego);
		font-size: 0.75rem;
		font-weight: 600;
	}

	.suggestions {
		display: grid;
		gap: 6px;
	}

	h3 {
		margin-bottom: 2px;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--kolor-tekstu-drugorzednego);
	}

	.chat-controls {
		margin-top: auto;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.question-btn,
	.chat-entry {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		min-height: 44px;
		width: 100%;
		padding: 8px 10px;
		border: 1px solid var(--kolor-obramowania);
		border-radius: var(--zaokraglenie-duze);
		background: var(--kolor-tla-karty);
		color: var(--kolor-tekstu-podstawowego);
		font: inherit;
		font-size: 0.875rem;
		line-height: 1.4;
		text-align: left;
		cursor: pointer;
	}

	.question-btn svg {
		flex-shrink: 0;
		width: 16px;
		height: 16px;
		color: var(--kolor-tekstu-drugorzednego);
	}

	.question-btn:hover,
	.chat-entry:hover {
		border-color: var(--kolor-wyroznienia);
		background: var(--kolor-tla-elementu-drugorzednego);
	}

	button:focus-visible {
		outline: 2px solid var(--kolor-wyroznienia);
		outline-offset: 3px;
	}

	.user-message {
		align-self: flex-end;
		max-width: 100%;
		padding: 8px 10px;
		border-radius: 16px 4px 16px 16px;
		background: var(--kolor-tla-elementu-drugorzednego);
		font-size: 0.875rem;
		line-height: 1.5;
		overflow-wrap: anywhere;
	}

	.notice:empty {
		display: none;
	}

	.notice--visible {
		padding: 10px 12px;
		border: 1px solid var(--kolor-obramowania);
		border-radius: var(--zaokraglenie-duze);
		background: var(--kolor-tla-karty);
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.notice-title {
		margin-bottom: 4px;
		font-weight: 700;
	}

	.chat-entry {
		color: var(--kolor-tekstu-drugorzednego);
		box-shadow: var(--cien-karty);
	}

	.send-icon {
		display: grid;
		flex-shrink: 0;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: var(--kolor-wyroznienia);
		color: var(--kolor-tekstu-na-wyroznieniu);
	}
</style>
