<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import {
		ChatError,
		MAX_CHAT_CONTEXT_MESSAGES,
		MAX_CHAT_MESSAGE_LENGTH,
		sendChatMessage
	} from './services/chat';
	import type { ChatMessage, ChatTurn } from './types/chat';
	import type { SpeechRecognitionInstance } from './types/speech';
	import { APP } from '#lib/config/app.ts';
	import { settings } from '#lib/features/settings/state/settings.svelte.ts';
	import { plainChatText } from './services/plainText';
	import AnimatedReply from './components/AnimatedReply.svelte';

	const suggestedQuestions = [
		'Jak korzystać z aplikacji?',
		'Jak dotrzeć na Wawel bez schodów?',
		'Jakie zniżki są dostępne w MPK?',
		'Gdzie znajdę dostępne muzea?',
		'Gdzie znajdę parking dla osób z niepełnosprawnością?'
	];
	const thinkingPhrases = ['Myślę...', 'Hmm...', 'Zastanawiam się...', 'Chwileczkę...'];
	let thinkingIndex = $state(0);

	$effect(() => {
		if (!isSending) return;
		const timer = setInterval(() => {
			thinkingIndex = (thinkingIndex + 1) % thinkingPhrases.length;
		}, 2800);
		return () => clearInterval(timer);
	});

	// $state sprawia, ze Svelte odswieza widok po zmianie danych
	// Historia pozostaje w pamieci tej karty; odswiezenie strony ja usuwa
	let turns = $state<ChatTurn[]>([]);
	let draft = $state('');
	let pendingQuestion = $state('');
	let isSending = $state(false);
	let errorMessage = $state('');
	let messageList: HTMLDivElement | undefined;
	let activeRequest: AbortController | undefined;
	let recognition: SpeechRecognitionInstance | undefined;
	let isListening = $state(false);
	let voiceStatus = $state('');
	let voiceNotice = $state('');
	let voiceNoticeTimer: ReturnType<typeof setTimeout> | undefined;

	function showVoiceNotice(message: string) {
		clearTimeout(voiceNoticeTimer);
		voiceNotice = message;
		voiceNoticeTimer = setTimeout(() => (voiceNotice = ''), 4000);
	}

	onDestroy(() => {
		clearTimeout(voiceNoticeTimer);
		activeRequest?.abort();
		if (recognition) {
			recognition.onresult = null;
			recognition.onerror = null;
			recognition.onend = null;
			recognition.abort();
		}
	});

	function toggleDictation() {
		if (isListening) {
			recognition?.stop();
			return;
		}
		const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
		if (!Recognition) {
			showVoiceNotice('Dyktowanie niedostępne. Wpisz pytanie.');
			return;
		}
		if (!window.isSecureContext) {
			showVoiceNotice('Dyktowanie wymaga HTTPS lub localhost.');
			return;
		}
		const session = new Recognition();
		recognition = session;
		session.lang = 'pl-PL';
		session.continuous = false;
		session.interimResults = false;
		errorMessage = '';
		voiceNotice = '';
		clearTimeout(voiceNoticeTimer);
		voiceStatus = 'Słucham... Kliknij mikrofon, aby zakończyć.';
		session.onresult = (event) => {
			const transcript = Array.from(event.results)
				.map((result) => result[0]?.transcript ?? '')
				.join(' ')
				.trim();
			if (!transcript) {
				errorMessage = 'Nie rozpoznano mowy. Spróbuj ponownie.';
				return;
			}
			const message = [draft.trim(), transcript].filter(Boolean).join(' ');
			if (message.length > MAX_CHAT_MESSAGE_LENGTH) {
				errorMessage = `Dyktowana wiadomość przekracza limit ${MAX_CHAT_MESSAGE_LENGTH} znaków. Skróć tekst i spróbuj ponownie.`;
				return;
			}
			// Nie wysylamy nagrania do backendu AI; tekst mozna poprawic przed wyslaniem
			draft = message;
			voiceStatus = 'Tekst gotowy. Sprawdź go i naciśnij Enter, aby wysłać.';
		};
		session.onerror = (event) => {
			const messages: Record<string, string> = {
				'not-allowed': 'Brak zgody na mikrofon. Zezwól na dostęp w ustawieniach przeglądarki.',
				'service-not-allowed': 'Przeglądarka nie zezwala na usługę rozpoznawania mowy.',
				'audio-capture': 'Nie można użyć mikrofonu. Sprawdź jego podłączenie.',
				'no-speech': 'Nie wykryto mowy. Spróbuj ponownie.',
				network: 'Nie można połączyć się z usługą rozpoznawania mowy.'
			};
			errorMessage = messages[event.error] ?? 'Dyktowanie zostało przerwane. Spróbuj ponownie.';
			voiceStatus = '';
		};
		session.onend = () => {
			isListening = false;
			recognition = undefined;
			if (voiceStatus.startsWith('Słucham')) voiceStatus = 'Dyktowanie zakończone.';
		};
		isListening = true;
		try {
			session.start();
		} catch (error) {
			isListening = false;
			recognition = undefined;
			voiceStatus = '';
			if (!(error instanceof DOMException)) throw error;
			errorMessage = 'Nie można rozpocząć dyktowania. Sprawdź dostęp do mikrofonu.';
		}
	}

	async function scrollToLatest() {
		// Czekamy, az Svelte doda nowa wiadomosc do HTML, zanim przewiniemy liste
		await tick();
		if (messageList) messageList.scrollTop = messageList.scrollHeight;
	}

	async function followReply() {
		// Nie sciagamy na dol osoby, ktora przewinela do starszych wiadomosci
		if (
			!messageList ||
			messageList.scrollHeight - messageList.scrollTop - messageList.clientHeight > 64
		)
			return;
		await scrollToLatest();
	}

	async function submitQuestion(question = draft) {
		if (isSending || isListening) return;
		const content = question.trim();
		if (!content || content.length > MAX_CHAT_MESSAGE_LENGTH) {
			errorMessage = `Wpisz wiadomość od 1 do ${MAX_CHAT_MESSAGE_LENGTH} znaków.`;
			return;
		}
		draft = content;
		errorMessage = '';
		pendingQuestion = content;
		thinkingIndex = 0;
		isSending = true;
		const controller = new AbortController();
		activeRequest = controller;

		// Wysylamy kontekst, zeby AI moglo rozumiec na przyklad "a jak tam dojechac?"
		// Odrzucone wypowiedzi widac w czacie, ale nie trafiaja ponownie do kontekstu
		// Historia z przegladarki nadal jest niezaufana: backend musi ja sprawdzac
		// Wylaczenie kontekstu pomija historie w zapytaniu, nie usuwa jej z widoku
		// To pamiec biezacej rozmowy, a nie uczenie wag modelu
		const history: ChatMessage[] = (settings.useConversationContext ? turns : [])
			.filter((turn) => turn.response.verification.status !== 'rejected')
			.flatMap((turn): ChatMessage[] => [
				{ role: 'user', content: turn.question },
				{ role: 'assistant', content: turn.response.reply }
			]);
		const messages: ChatMessage[] = [
			...history.slice(-(MAX_CHAT_CONTEXT_MESSAGES - 2)),
			{ role: 'user', content }
		];

		try {
			await scrollToLatest();
			const response = await sendChatMessage({ messages }, controller.signal);
			if (controller.signal.aborted) return;
			turns = [...turns, { question: content, response }];
			draft = '';
		} catch (error) {
			if (error instanceof ChatError && error.kind === 'aborted') return;
			// Nie dopisujemy fikcyjnej odpowiedzi ani nie przelaczamy sie na demo
			// Zachowujemy tekst w formularzu, aby mozna bylo ponowic wyslanie
			errorMessage =
				error instanceof ChatError
					? error.message
					: 'Wystąpił nieoczekiwany błąd czatu. Spróbuj ponownie.';
			if (!(error instanceof ChatError)) console.error('Chat request failed', error);
		} finally {
			pendingQuestion = '';
			isSending = false;
			activeRequest = undefined;
			await scrollToLatest();
		}
	}
</script>

<section
	class="ask-page"
	class:ask-page--empty={turns.length === 0 && !isSending}
	aria-label="Asystent"
>
	<div
		class="message-list"
		bind:this={messageList}
		role="log"
		aria-label="Historia rozmowy"
		aria-live="polite"
	>
		{#each turns as turn}
			<p class="user-message"><span class="message-label">Ty</span>{turn.question}</p>
			<div class="greeting">
				<p class="assistant-name">{APP.assistantName}</p>
				<!-- Svelte wyswietla tekst bez interpretowania HTML z odpowiedzi AI -->
				<p class="message-content">
					<AnimatedReply text={plainChatText(turn.response.reply)} onProgress={followReply} />
				</p>
			</div>
		{/each}
		{#if isSending}
			<p class="user-message"><span class="message-label">Ty</span>{pendingQuestion}</p>
			<p class="thinking" role="status" aria-label="Asystent przygotowuje odpowiedź">
				<span aria-hidden="true">{thinkingPhrases[thinkingIndex]}</span>
			</p>
		{/if}
	</div>

	<div class="chat-controls">
		{#if turns.length === 0 && !isSending}
			<p class="welcome-bubble">Cześć! Jestem {APP.assistantName}, Twój asystent AI.</p>
			<div class="chat-emblem" aria-hidden="true">
				<svg viewBox="0 0 24 24">
					<circle cx="12" cy="6.5" r="3.5" />
					<path d="M4 21v-2a8 6 0 0 1 16 0v2" />
				</svg>
			</div>
		{/if}
		{#if errorMessage}
			<p class="notice" role="alert">{errorMessage} Możesz ponowić wysłanie.</p>
		{/if}
		{#if turns.length === 0 && !isSending}
			<section class="suggestions" aria-label="Przykładowe pytania">
				{#each suggestedQuestions as question}
					<button class="question-btn" type="button" onclick={() => submitQuestion(question)}>
						<span>{question}</span>
					</button>
				{/each}
			</section>
		{/if}
		<!-- Wiadomosc wysyla Enter lub przycisk klawiatury ekranowej -->
		<form
			class="chat-entry"
			onsubmit={(event) => {
				event.preventDefault();
				void submitQuestion();
			}}
		>
			<input
				bind:value={draft}
				aria-label="Twoja wiadomość"
				placeholder={turns.length > 0 ? 'Napisz kolejną wiadomość...' : 'W czym mogę pomóc?'}
				enterkeyhint="send"
				maxlength={MAX_CHAT_MESSAGE_LENGTH}
				disabled={isSending || isListening}
				required
			/>
			<button
				class="mic-btn"
				class:mic-btn--active={isListening}
				type="button"
				aria-label={isListening ? 'Zakończ dyktowanie' : 'Dyktuj wiadomość'}
				title="Dyktowanie może przesyłać audio do usługi dostawcy przeglądarki."
				aria-pressed={isListening}
				disabled={isSending}
				onclick={toggleDictation}
			>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<rect x="9" y="2" width="6" height="12" rx="3" />
					<path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" />
				</svg>
			</button>
		</form>
		{#if voiceStatus}
			<p class="voice-status" role="status">{voiceStatus}</p>
		{/if}
		{#if voiceNotice}
			<p class="voice-status" role="status">{voiceNotice}</p>
		{/if}
		<p class="voice-note">
			<span>Sztuczna Inteligencja może się mylić.</span>
			<span>Sprawdzaj ważne informacje i zachowaj ostrożność.</span>
		</p>
	</div>
</section>

<style>
	.ask-page {
		--chat-background: #f5f8ff;
		--chat-surface: #ffffff;
		--chat-border: #d6e1f0;
		--chat-text: #172b49;
		--chat-muted: #526580;
		--chat-accent: #2563eb;
		--chat-tint: #e8f0ff;
		--chat-hover: #eff5ff;
		--chat-glow: #dce9ff;
		--chat-shadow: 0 3px 14px #264a7910;
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 0;
		height: 100%;
		min-height: 0;
		box-sizing: border-box;
		padding: var(--odstep-sredni);
		color: var(--chat-text);
		background:
			radial-gradient(ellipse at top right, var(--chat-glow), transparent 65%),
			var(--chat-background);
	}

	:global(:root[data-theme='dark']) .ask-page {
		--chat-background: #0b1120;
		--chat-surface: #19263a;
		--chat-border: #30415b;
		--chat-text: #edf3fc;
		--chat-muted: #a1b1c9;
		--chat-accent: #70afff;
		--chat-tint: #1b3555;
		--chat-hover: #23344d;
		--chat-glow: #152844;
		--chat-shadow: 0 3px 14px #00000020;
	}

	p {
		margin: 0;
	}

	.thinking {
		color: var(--chat-muted);
		font-size: 0.875rem;
		line-height: 1.5;
		padding: 8px 4px;
	}

	.thinking span {
		background: linear-gradient(
			110deg,
			var(--chat-muted) 35%,
			var(--chat-accent) 50%,
			var(--chat-muted) 65%
		);
		background-size: 250% 100%;
		background-clip: text;
		color: transparent;
		animation: thinking-glow 2.8s ease-in-out infinite;
	}

	@keyframes thinking-glow {
		from {
			background-position: 100% 0;
		}
		to {
			background-position: 0% 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.thinking span {
			animation: none;
			background: none;
			color: inherit;
		}
	}

	:global(:root[data-contrast='high']) .thinking span {
		animation: none;
		background: none;
		color: inherit;
	}

	.message-list {
		display: flex;
		flex: 1;
		min-height: 0;
		flex-direction: column;
		gap: 12px;
		overflow-y: auto;
		padding: 4px;
		scroll-padding-bottom: 12px;
	}

	.message-list > * {
		flex-shrink: 0;
	}

	.message-list > .greeting {
		flex: none;
	}

	.message-content,
	.user-message {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.message-label {
		display: block;
		margin-top: 6px;
		color: var(--chat-muted);
		font-size: 0.75rem;
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
		align-self: flex-start;
		max-width: 94%;
		min-width: 0;
		padding: 14px 16px;
		border: 1px solid var(--chat-border);
		border-radius: 24px 24px 24px 10px;
		background: var(--chat-surface);
		box-shadow: var(--chat-shadow);
		font-size: 0.9375rem;
		line-height: 1.5;
	}

	.assistant-name {
		margin-bottom: 4px;
		color: var(--chat-accent);
		font-size: 0.75rem;
		font-weight: 600;
	}

	.suggestions {
		display: grid;
		grid-auto-rows: max-content;
		gap: 6px;
	}

	.chat-controls {
		margin-top: auto;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.ask-page--empty .message-list {
		display: none;
	}

	.ask-page--empty .chat-controls {
		flex: 1;
		min-height: 0;
		margin-top: 0;
		padding-top: clamp(24px, 11dvh, 84px);
		overflow-y: auto;
	}

	.ask-page--empty .suggestions {
		order: 2;
		flex-shrink: 0;
		margin-top: auto;
		padding: 40px 4px 4px;
		gap: 6px;
	}

	.ask-page--empty .chat-emblem,
	.ask-page--empty .chat-entry {
		flex-shrink: 0;
	}

	.ask-page--empty .question-btn {
		min-height: 48px;
		padding: 10px 12px;
		font-size: 0.875rem;
	}

	.chat-emblem {
		display: grid;
		align-self: center;
		place-items: center;
		width: 64px;
		height: 64px;
		margin-bottom: 12px;
		border: 1px solid var(--chat-border);
		border-radius: 20px;
		background: linear-gradient(135deg, var(--chat-tint), var(--chat-surface));
		color: var(--chat-accent);
		box-shadow: var(--chat-shadow);
	}

	.chat-emblem svg {
		width: 32px;
		height: 32px;
		stroke-width: 1.5;
	}

	.welcome-bubble {
		position: relative;
		align-self: center;
		max-width: 100%;
		padding: 11px 16px;
		border: 1px solid var(--chat-border);
		border-radius: 18px;
		background: var(--chat-surface);
		box-shadow: var(--chat-shadow);
		font-size: 0.75rem;
		white-space: nowrap;
		line-height: 1.5;
		text-align: center;
	}

	@media (max-width: 360px) {
		.welcome-bubble {
			white-space: normal;
		}
	}

	.welcome-bubble::before {
		position: absolute;
		bottom: -7px;
		left: calc(50% - 6px);
		width: 12px;
		height: 12px;
		border-bottom: 1px solid var(--chat-border);
		border-right: 1px solid var(--chat-border);
		background: var(--chat-surface);
		transform: rotate(45deg);
		content: '';
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
		border: 1px solid var(--chat-border);
		border-radius: var(--zaokraglenie-duze);
		background: var(--chat-surface);
		color: var(--chat-text);
		font: inherit;
		font-size: 0.875rem;
		line-height: 1.4;
		text-align: left;
		cursor: pointer;
	}

	.question-btn:hover {
		border-color: var(--chat-accent);
		background: var(--chat-hover);
	}

	button:focus-visible {
		outline: 2px solid var(--chat-accent);
		outline-offset: 3px;
	}

	.user-message {
		align-self: flex-end;
		max-width: 88%;
		padding: 12px 16px;
		border: 1px solid var(--chat-border);
		border-radius: 24px 24px 10px 24px;
		background: var(--chat-tint);
		font-size: 0.875rem;
		line-height: 1.5;
		overflow-wrap: anywhere;
	}

	.notice {
		padding: 10px 12px;
		border: 1px solid var(--chat-border);
		border-radius: var(--zaokraglenie-duze);
		background: var(--chat-surface);
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.chat-entry {
		min-height: 56px;
		border-radius: 28px;
		background: var(--chat-surface);
		color: var(--chat-muted);
		font-size: 1rem;
		cursor: text;
		box-shadow: var(--chat-shadow);
	}

	.chat-entry:focus-within {
		border-color: var(--chat-muted);
		background: var(--chat-surface);
	}

	.chat-entry input {
		flex: 1;
		min-width: 0;
		border: 0;
		outline: none;
		box-shadow: none;
		background: transparent;
		color: var(--chat-text);
		font: inherit;
		text-align: center;
	}

	.chat-entry input:focus {
		outline: none;
		box-shadow: none;
	}

	.chat-entry input::placeholder {
		color: var(--chat-muted);
		opacity: 1;
	}

	.mic-btn {
		display: grid;
		flex-shrink: 0;
		place-items: center;
		width: 40px;
		height: 40px;
		border: 0;
		border-radius: 50%;
		background: var(--chat-tint);
		color: var(--chat-accent);
		cursor: pointer;
	}

	.mic-btn--active {
		background: var(--kolor-wyroznienia);
		color: var(--kolor-tekstu-na-wyroznieniu);
	}

	.voice-status,
	.voice-note {
		color: var(--chat-muted);
		font-size: 0.6875rem;
		line-height: 1.4;
		text-align: center;
	}

	.voice-note {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		column-gap: 0.35em;
	}

	.voice-note span {
		max-width: 100%;
		text-wrap: pretty;
	}

	.ask-page:not(.ask-page--empty) .chat-entry {
		padding: 12px 18px;
		background: var(--chat-surface);
		border-radius: 24px;
	}

	.ask-page:not(.ask-page--empty) .chat-entry input {
		text-align: left;
	}

	:global(:root[data-contrast='high']) .ask-page {
		--chat-surface: var(--kolor-tla-karty);
		--chat-border: var(--kolor-obramowania);
		--chat-text: var(--kolor-tekstu-podstawowego);
		--chat-muted: var(--kolor-tekstu-drugorzednego);
		--chat-accent: var(--kolor-wyroznienia);
		--chat-tint: var(--kolor-tla-karty);
		--chat-hover: var(--kolor-tla-elementu-drugorzednego);
		--chat-shadow: none;
		background: var(--kolor-tla-strony);
	}

	:global(:root[data-contrast='high']) .user-message {
		border-color: var(--kolor-obramowania);
		background: var(--kolor-tla-karty);
	}

	button:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}
</style>
