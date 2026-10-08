// Minimalny kontrakt rozpoznawania mowy w przegladarce, uwzglednia API z prefiksem w Safari/Chrome
export interface SpeechRecognitionInstance {
	lang: string;
	continuous: boolean;
	interimResults: boolean;
	onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
	onerror: ((event: { error: string }) => void) | null;
	onend: (() => void) | null;
	start(): void;
	stop(): void;
	abort(): void;
}

declare global {
	interface Window {
		SpeechRecognition?: new () => SpeechRecognitionInstance;
		webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
	}
}
