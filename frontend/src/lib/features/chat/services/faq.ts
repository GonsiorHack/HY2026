import { APP } from '#lib/config/app.ts';

const creators =
	'czyPrzejade tworzy GonsiorHack, kolektyw studentów: Franciszek Dawid (@sh3kda), ' +
	'Piotr Gąska (@GaskaPiotr) i Antoni Dawid (@Antoine052). ' +
	'To projekt zespołu, nie urzędu miasta Krakowa.\n\n' +
	'Rozwijamy czyPrzejade, aby pomagać w podróżowaniu bez barier po miastach całej Polski. ' +
	'Szukamy sponsorów, inwestorów, wsparcia infrastruktury i partnerów samorządowych ' +
	'oraz wdrożeniowych. Chcesz wesprzeć projekt? Znajdziesz nas na https://github.com/GonsiorHack.\n\n' +
	'Działajmy razem, krok po kroku!';

export const APP_USAGE_ANSWER =
	'Zacznij od karty Trasa: wpisz cel w Dokąd? i wybierz podpowiedź. ' +
	'W polach Od i Do ustaw start i cel, a potem porównaj dostępne trasy.\n\n' +
	'Odkrywaj pokazuje miejsca i zniżki. Asystent pomaga w obsłudze aplikacji, ' +
	'a w Ustawieniach zmienisz motyw, rozmiar tekstu i kontrast.\n\n' +
	'Obecne przykładowe dane dotyczą głównie Krakowa. Aplikacja nie gwarantuje ' +
	'aktualnej przejezdności — sprawdzaj ważne informacje.\n\nKorzystaj z aplikacji po swojemu!';

export function faqAnswer(question: string): string | undefined {
	const text = question
		.toLocaleLowerCase('pl')
		.replaceAll('ł', 'l')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');
	// Potwierdzone FAQ nie zalezy od Ollamy ani od wersji uruchomionego backendu
	if (
		/\b(kto)\b.{0,60}\b(stworzyl|tworzy|napisal|zrobil|opracowal)\b/.test(text) ||
		/\b(tworca|tworcy|autor|autorzy|gonsiorhack)\b/.test(text) ||
		(/\b(kto|kim|kojarzysz|znasz|napisal|stworzyl)\b/.test(text) &&
			/(sh3kda|gaskapiotr|antoine052|franciszek dawid|piotr gaska|antoni dawid)/.test(text))
	) {
		return creators;
	}
	if (
		/\b(opowiedz|czym jest|co to|o projekcie|sponsor|sponsorow|inwestor|wspolpraca)\b/.test(text) &&
		/\b(projekt|projekcie|czyprzejade|gonsiorhack)\b/.test(text)
	) {
		return creators;
	}
	if (
		/\b(kim jestes|kto jestes|kto ty jestes|jak masz na imie|jak sie nazywasz|przedstaw sie|co potrafisz)\b/.test(
			text
		)
	) {
		return (
			`Jestem ${APP.assistantName}, Twój asystent AI w ${APP.name}! ` +
			'Pomogę Ci w obsłudze aplikacji i przygotowaniu podróży po miastach w całej Polsce. ' +
			'Nie sprawdzam na żywo przejezdności ani nie klikam za Ciebie.\n\nDziałajmy razem, krok po kroku!'
		);
	}
	if (
		/\bjak (korzystac|uzywac|uzyc|obslugiwac)\b.{0,40}\b(aplikacji|aplikacje|apke)\b/.test(text)
	) {
		return APP_USAGE_ANSWER;
	}
}
