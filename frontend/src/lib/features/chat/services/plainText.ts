// Odpowiedzi pozostaja zwyklym tekstem, usuwamy typowe znaczniki Markdown zamiast renderowac niezaufany HTML
export function plainChatText(text: string): string {
	return text
		.replace(/```[^\n]*\n([\s\S]*?)```/g, '$1')
		.replace(/\*\*([^*\n]+)\*\*/g, '$1')
		.replace(/__([^_\n]+)__/g, '$1')
		.replace(/`([^`\n]+)`/g, '$1')
		.replace(/^\s{0,3}#{1,6}\s+/gm, '')
		.replace(/^\s*[-*]\s+/gm, '• ')
		.replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1 ($2)');
}
