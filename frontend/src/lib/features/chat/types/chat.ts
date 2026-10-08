// To kontrakt API: frontend i backend musza uzywac tych samych nazw pol
// Nie wysylamy roli "system" z przegladarki, instrukcje dla AI ustala backend
export interface ChatMessage {
	role: 'user' | 'assistant';
	content: string;
}

export interface ChatRequest {
	messages: ChatMessage[];
}

export interface ChatResponse {
	reply: string;
	verification: {
		// pending = brak weryfikacji
		// accepted = zaakceptowane przez weryfikator,
		// rejected = backend nie przekazal wiadomosci do modelu odpowiadajacego
		// accepted NIE jest gwarancja prawdziwosci informacji ani bezpieczenstwa trasy
		status: 'pending' | 'accepted' | 'rejected';
		reason?: string;
	};
}

export interface ChatTurn {
	question: string;
	response: ChatResponse;
}
