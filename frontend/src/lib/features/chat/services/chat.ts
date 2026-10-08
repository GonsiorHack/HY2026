import type { ChatRequest, ChatResponse } from '../types/chat';
import { CHAT_API_URL, CHAT_MODE } from '#lib/config/api.ts';
import { faqAnswer } from './faq';

export const MAX_CHAT_MESSAGE_LENGTH = 2000;
// Ograniczamy kontekst wysylany do modelu, ale nie usuwamy widocznej historii
// Backend powinien miec wlasne limity - ograniczenia frontendu da sie ominac
export const MAX_CHAT_CONTEXT_MESSAGES = 20;
export { CHAT_MODE };
// Weryfikacja i odpowiedz to dwa wywolania lokalnego modelu, szczegolnie wolne przy zimnym starcie
const CHAT_TIMEOUT_MS = 120_000;

export class ChatError extends Error {
	constructor(
		readonly kind: 'configuration' | 'network' | 'timeout' | 'aborted' | 'server' | 'response',
		message: string
	) {
		super(message);
		this.name = 'ChatError';
	}
}

// TypeScript sprawdza nasz kod, ale NIE sprawdza JSON-a otrzymanego z sieci
// Ten warunek chroni widok przed niezgodna odpowiedzia przyszlego backendu
function isChatResponse(value: unknown): value is ChatResponse {
	if (typeof value !== 'object' || value === null) return false;
	if (!('reply' in value) || typeof value.reply !== 'string' || !value.reply.trim()) return false;
	if (!('verification' in value)) return false;
	const verification = value.verification;
	return (
		typeof verification === 'object' &&
		verification !== null &&
		'status' in verification &&
		(verification.status === 'pending' ||
			verification.status === 'accepted' ||
			verification.status === 'rejected') &&
		(!('reason' in verification) || typeof verification.reason === 'string')
	);
}

export async function sendChatMessage(
	request: ChatRequest,
	signal?: AbortSignal
): Promise<ChatResponse> {
	if (signal?.aborted) throw new ChatError('aborted', 'Anulowano zapytanie.');
	const question = request.messages.at(-1);
	if (question?.role === 'user') {
		const reply = faqAnswer(question.content);
		if (reply) {
			// Krotkie przygotowanie odpowiedzi utrzymuje ten sam wskaznik oczekiwania co API
			await new Promise<void>((resolve, reject) => {
				const finish = () => {
					signal?.removeEventListener('abort', cancel);
					resolve();
				};
				const timer = setTimeout(finish, 2200);
				const cancel = () => {
					clearTimeout(timer);
					signal?.removeEventListener('abort', cancel);
					reject(new ChatError('aborted', 'Anulowano zapytanie.'));
				};
				signal?.addEventListener('abort', cancel, { once: true });
				if (signal?.aborted) cancel();
			});
			return { reply, verification: { status: 'accepted' } };
		}
	}

	// Demo sprawdza tylko obsluge rozmowy, nie korzysta z AI, nie ocenia faktow
	// i nie wykonuje zadnego polaczenia sieciowego, to nie tryb zapasowy po awarii API
	if (CHAT_MODE === 'mock') {
		return {
			reply: 'To demo. Odpowiedzi AI będą dostępne po podłączeniu backendu.',
			verification: {
				status: 'pending',
				reason: 'Ollama nie jest jeszcze podłączona; treść nie została zweryfikowana.'
			}
		};
	}
	if (CHAT_MODE !== 'api') {
		throw new ChatError('configuration', 'VITE_CHAT_MODE musi mieć wartość mock lub api.');
	}
	if (!CHAT_API_URL) {
		throw new ChatError('configuration', 'Ustaw VITE_CHAT_API_URL na adres endpointu czatu.');
	}

	// POST przesyla JSON w ciele zapytania zamiast umieszczac rozmowe w adresie URL
	// Backend: walidacja danych -> Ollama (weryfikator) -> model odpowiadajacy
	// Przy odrzuceniu backend zwraca reply z wyjasnieniem i status rejected
	// Frontend jedynie wyswietla decyzje; nie wywoluje Ollamy bezposrednio
	const controller = new AbortController();
	let timedOut = false;
	const timer = setTimeout(() => {
		timedOut = true;
		controller.abort();
	}, CHAT_TIMEOUT_MS);
	const forwardAbort = () => controller.abort();
	signal?.addEventListener('abort', forwardAbort, { once: true });

	try {
		let response: Response;
		try {
			response = await fetch(CHAT_API_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					'ngrok-skip-browser-warning': 'true'
				},
				body: JSON.stringify(request),
				signal: controller.signal
			});
		} catch (error) {
			if (signal?.aborted) throw new ChatError('aborted', 'Anulowano zapytanie.');
			if (timedOut) throw new ChatError('timeout', 'Backend nie odpowiedział w ciągu 120 sekund.');
			if (error instanceof TypeError) {
				throw new ChatError(
					'network',
					'Nie można połączyć się z backendem czatu. Sprawdź adres API i CORS.'
				);
			}
			throw error;
		}

		// fetch nie rzuca bledu dla HTTP 404/500 - status musimy sprawdzic sami
		if (!response.ok) {
			if (response.headers.get('content-type')?.includes('application/json')) {
				let errorBody: unknown;
				try {
					errorBody = await response.json();
				} catch (error) {
					if (signal?.aborted) throw new ChatError('aborted', 'Anulowano zapytanie.');
					if (timedOut)
						throw new ChatError('timeout', 'Backend nie odpowiedział w ciągu 120 sekund.');
					if (error instanceof SyntaxError) {
						throw new ChatError('response', 'Backend czatu zwrócił błąd z niepoprawnym JSON-em.');
					}
					throw error;
				}
				if (
					typeof errorBody === 'object' &&
					errorBody !== null &&
					'detail' in errorBody &&
					typeof errorBody.detail === 'string' &&
					errorBody.detail.trim()
				) {
					throw new ChatError('server', errorBody.detail);
				}
			}
			throw new ChatError('server', `Backend czatu zwrócił błąd HTTP ${response.status}.`);
		}
		let body: unknown;
		try {
			body = await response.json();
		} catch (error) {
			if (signal?.aborted) throw new ChatError('aborted', 'Anulowano zapytanie.');
			if (timedOut) throw new ChatError('timeout', 'Backend nie odpowiedział w ciągu 120 sekund.');
			if (error instanceof SyntaxError) {
				throw new ChatError('response', 'Backend czatu nie zwrócił poprawnego JSON-a.');
			}
			if (error instanceof TypeError) {
				throw new ChatError('network', 'Przerwano pobieranie odpowiedzi z backendu czatu.');
			}
			throw error;
		}
		if (!isChatResponse(body)) {
			throw new ChatError('response', 'Odpowiedź backendu nie pasuje do kontraktu czatu.');
		}
		return body;
	} finally {
		// Sprzatamy timer i nasluchiwanie niezaleznie od sukcesu lub bledu
		clearTimeout(timer);
		signal?.removeEventListener('abort', forwardAbort);
	}
}
