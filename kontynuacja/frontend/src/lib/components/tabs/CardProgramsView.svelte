<script lang="ts">
	import { tick } from 'svelte';
	import type { CardProgram, CardProgramCategory } from '../../types/cardProgram';

	type CategoryFilter = 'Wszystkie' | CardProgramCategory;
	type BenefitIcon = 'transit' | 'parking' | 'discount' | 'family' | 'qr' | 'id' | 'star';

	const CATEGORIES: CategoryFilter[] = [
		'Wszystkie',
		'Dla osób z orzeczeniem',
		'Dla rodzin (KKR „N”)',
		'Dla seniorów'
	];

	/* Dane z BIP Kraków (usługi SZ-4, SZ-6, SZ-7), uchwały taryfowej ZTP (tekst jednolity z 2.03.2026) i serwisu Kraków bez barier. */
	const PROGRAMS: CardProgram[] = [
		{
			id: 'karta-rodziny-n',
			title: 'Krakowska Karta Rodziny „N”',
			shortName: 'Karta Rodziny „N”',
			category: 'Dla rodzin (KKR „N”)',
			issuer: 'Wydział Polityki Społecznej UMK',
			summary: 'Darmowe MPK i zniżki u partnerów dla całej rodziny.',
			cardDesign: {
				bgGradient: 'linear-gradient(135deg, #0b3d91 0%, #1d6fd8 55%, #4fa3f7 100%)',
				textColor: '#ffffff',
				badgeText: 'Program stały UMK',
				cardNumberMask: 'KKR-N •••• •••• 0425'
			},
			benefits: [
				'Bezpłatne przejazdy MPK dla dziecka i rodziny.',
				'Zniżki u partnerów programu.',
				'Imienna karta od 4. roku życia.'
			],
			eligibility: [
				'Rodziny mieszkające w Krakowie.',
				'Dziecko do 16 lat z orzeczeniem.',
				'16–25 lat: stopień znaczny lub umiarkowany.',
				'Rodzeństwo do 18 lat (uczące się do 24).'
			],
			requiredDocs: [
				'Wniosek (papierowy).',
				'Orzeczenie – oryginał i kopia.',
				'Dowody tożsamości dorosłych.',
				'Zdjęcia (poza dziećmi do 4 lat).'
			],
			officialSourceUrl: 'https://www.bip.krakow.pl/uslugi/SZ-7',
			sourceLabel: 'BIP Kraków – SZ-7',
			applicationSteps: [
				'Pobierz wniosek z BIP (SZ-7).',
				'Przygotuj zdjęcia i kopię orzeczenia.',
				'Złóż wniosek przy ul. Dekerta 24.',
				'Odbierz karty po kontakcie z urzędu.'
			],
			processingTime: 'Do 30 dni (maks. 60). Bezpłatnie.',
			contactInfo: {
				office: 'Referat ds. Osób z Niepełnosprawnościami',
				address: 'ul. Dekerta 24, Kraków',
				phone: '12 616 52 93',
				hours: 'pn.–pt. 7:40–15:00'
			}
		},
		{
			id: 'karta-parkingowa',
			title: 'Karta parkingowa',
			shortName: 'Karta parkingowa',
			category: 'Dla osób z orzeczeniem',
			issuer: 'Miejski Zespół ds. Orzekania (MZON)',
			summary: 'Parkowanie na kopertach w całej Polsce.',
			cardDesign: {
				bgGradient: 'linear-gradient(135deg, #0f2d5c 0%, #1e4f9c 60%, #2f6fd1 100%)',
				textColor: '#ffffff',
				badgeText: 'Uprawnienie ustawowe',
				cardNumberMask: 'PL •••• •••• 2026'
			},
			benefits: [
				'Parkowanie na kopertach.',
				'Zwolnienie z części znaków zakazu (m.in. B-1, B-35).',
				'Ważna w całej Polsce.'
			],
			eligibility: [
				'Stopień znaczny lub umiarkowany z ograniczonym poruszaniem się.',
				'Dzieci do 16 lat z orzeczeniem.',
				'Wymagane wskazanie do karty w orzeczeniu.'
			],
			requiredDocs: [
				'Wniosek.',
				'Zdjęcie 35 × 45 mm.',
				'Potwierdzenie opłaty 21 zł.',
				'Orzeczenie do wglądu.'
			],
			officialSourceUrl: 'https://www.bip.krakow.pl/uslugi/SZ-6',
			sourceLabel: 'BIP Kraków – SZ-6',
			applicationSteps: [
				'Sprawdź wskazanie do karty w orzeczeniu.',
				'Wpłać 21 zł.',
				'Złóż wniosek osobiście w MZON.',
				'Odbierz kartę w podanym terminie.'
			],
			processingTime: 'Do 30 dni. Opłata 21 zł.',
			contactInfo: {
				office: 'MZON',
				address: 'ul. Dekerta 24, Kraków',
				phone: '12 616 50 29',
				hours: 'pn.–pt. 7:40–15:30 (czw. od 8:00)'
			}
		},
		{
			id: 'legitymacja-ozn',
			title: 'Legitymacja osoby niepełnosprawnej',
			shortName: 'Legitymacja OzN',
			category: 'Dla osób z orzeczeniem',
			issuer: 'Miejski Zespół ds. Orzekania (MZON)',
			summary: 'Potwierdza ulgi w MPK, PKP i PKS.',
			cardDesign: {
				bgGradient: 'linear-gradient(135deg, #0f5132 0%, #198754 60%, #3fb27f 100%)',
				textColor: '#ffffff',
				badgeText: 'Dokument urzędowy',
				cardNumberMask: 'OzN •••• •••• 1604'
			},
			benefits: ['Ulgi lub darmowe przejazdy MPK.', 'Ulgi w PKP i PKS.', 'Opcjonalny kod QR.'],
			eligibility: [
				'Osoby 16+ z orzeczeniem o stopniu niepełnosprawności.',
				'Dzieci do 16 lat – usługa SZ-5.'
			],
			requiredDocs: [
				'Wniosek.',
				'Zdjęcie 35 × 45 mm.',
				'Orzeczenie do wglądu.',
				'Dowód tożsamości.'
			],
			officialSourceUrl: 'https://www.bip.krakow.pl/uslugi/SZ-4',
			sourceLabel: 'BIP Kraków – SZ-4',
			applicationSteps: [
				'Przygotuj zdjęcie i orzeczenie.',
				'Złóż wniosek w MZON.',
				'Poczekaj na powiadomienie.',
				'Odbierz legitymację osobiście.'
			],
			processingTime: 'Do 30 dni. Bezpłatnie (duplikat 15 zł).',
			contactInfo: {
				office: 'MZON',
				address: 'ul. Dekerta 24, Kraków',
				phone: '12 616 52 12',
				hours: 'pn.–pt. 7:40–15:30 (czw. od 8:00)'
			}
		},
		{
			id: 'kmk-orzeczenie',
			title: 'Przejazdy KMK z orzeczeniem',
			shortName: 'Przejazdy KMK',
			category: 'Dla osób z orzeczeniem',
			issuer: 'Zarząd Transportu Publicznego',
			summary: 'Darmowe lub ulgowe MPK zależnie od stopnia.',
			cardDesign: {
				bgGradient: 'linear-gradient(135deg, #1f2a44 0%, #2c4a7a 55%, #3c7bd6 100%)',
				textColor: '#ffffff',
				badgeText: 'Ulga taryfowa',
				cardNumberMask: 'KMK •••• •••• 0302'
			},
			benefits: [
				'Stopień znaczny: darmowo z opiekunem.',
				'Niewidomi (04-O): darmowo z przewodnikiem.',
				'Dzieci do 18 lat: darmowo z opiekunem.',
				'Stopień umiarkowany: bilet ulgowy.'
			],
			eligibility: [
				'Stopień znaczny lub I grupa.',
				'Stopień umiarkowany z symbolem 04-O, 01-U, 05-R lub 10-N.',
				'Pozostały stopień umiarkowany – ulga 50%.'
			],
			requiredDocs: [
				'Legitymacja OzN lub orzeczenie z dowodem.',
				'Przy 05-R / 10-N – zaświadczenie lekarskie.'
			],
			officialSourceUrl: 'https://ztp.krakow.pl/kmk/regulacje-prawne',
			sourceLabel: 'ZTP Kraków – taryfa',
			applicationSteps: [
				'Sprawdź stopień i symbol w orzeczeniu.',
				'Miej przy sobie legitymację.',
				'Przy uldze kup bilet ulgowy.',
				'Okaż dokument przy kontroli.'
			],
			processingTime: 'Bez wniosku – działa od razu.',
			contactInfo: {
				office: 'ZTP Kraków',
				address: 'ul. Wielopole 1, Kraków',
				phone: '12 616 86 00',
				hours: 'pn.–pt. 8:30–14:30'
			}
		},
		{
			id: 'kmk-senior',
			title: 'Komunikacja 70+ i ulga dla emerytów',
			shortName: 'Senior w KMK',
			category: 'Dla seniorów',
			issuer: 'Zarząd Transportu Publicznego',
			summary: 'Od 70 lat MPK za darmo, emeryci z ulgą.',
			cardDesign: {
				bgGradient: 'linear-gradient(135deg, #3b1f63 0%, #5b3a9b 55%, #8a6ad1 100%)',
				textColor: '#ffffff',
				badgeText: 'Ulga taryfowa',
				cardNumberMask: '70+ •••• •••• 2026'
			},
			benefits: ['70+: darmowe przejazdy MPK.', 'Emeryci: bilet ulgowy.', 'Bez wniosku i karty.'],
			eligibility: ['Osoby od 70 lat.', 'Emeryci poniżej 70 lat – ulga.'],
			requiredDocs: ['Dowód ze zdjęciem (70+).', 'Legitymacja emeryta lub decyzja ZUS.'],
			officialSourceUrl: 'https://ztp.krakow.pl/kmk/regulacje-prawne',
			sourceLabel: 'ZTP Kraków – taryfa',
			applicationSteps: [
				'Nic nie składasz.',
				'Miej przy sobie dowód.',
				'Emeryt kupuje bilet ulgowy.',
				'Okaż dokument przy kontroli.'
			],
			processingTime: 'Bez wniosku – działa automatycznie.',
			contactInfo: {
				office: 'ZTP Kraków',
				address: 'ul. Wielopole 1, Kraków',
				phone: '12 616 86 00',
				hours: 'pn.–pt. 8:30–14:30'
			}
		}
	];

	let category = $state<CategoryFilter>('Wszystkie');
	let query = $state('');
	let modalProgram = $state<CardProgram | null>(null);
	let dialogEl = $state<HTMLDialogElement | null>(null);
	let returnFocusEl: HTMLElement | null = null;

	/* Wyszukiwanie obejmuje wszystkie teksty programu, więc „opiekun” czy „70 lat” trafiają w kryteria, a nie tylko w tytuł. */
	const visiblePrograms = $derived.by(() => {
		const needle = query.trim().toLocaleLowerCase('pl');
		return PROGRAMS.filter((program) => {
			if (category !== 'Wszystkie' && program.category !== category) return false;
			if (!needle) return true;
			const haystack = [
				program.title,
				program.shortName,
				program.issuer,
				program.summary,
				program.category,
				...program.benefits,
				...program.eligibility,
				...program.requiredDocs
			]
				.join(' ')
				.toLocaleLowerCase('pl');
			return haystack.includes(needle);
		});
	});

	function resetFilters() {
		category = 'Wszystkie';
		query = '';
	}

	function benefitIcon(text: string): BenefitIcon {
		const t = text.toLocaleLowerCase('pl');
		if (t.includes('parkow') || t.includes('znaków')) return 'parking';
		if (t.includes('qr')) return 'qr';
		if (t.includes('mpk') || t.includes('pkp') || t.includes('darmow') || t.includes('przejazd'))
			return 'transit';
		if (t.includes('rodzin')) return 'family';
		if (t.includes('zniżk') || t.includes('ulg') || t.includes('bilet')) return 'discount';
		if (t.includes('karta') || t.includes('dokument')) return 'id';
		return 'star';
	}

	async function openDetails(program: CardProgram, trigger: HTMLElement) {
		returnFocusEl = trigger;
		modalProgram = program;
		await tick();
		dialogEl?.querySelector<HTMLElement>('.modal-close')?.focus();
	}

	function closeDetails() {
		if (!modalProgram) return;
		modalProgram = null;
		returnFocusEl?.focus();
		returnFocusEl = null;
	}

	/* Pułapka fokusu: Tab/Shift+Tab krąży wyłącznie po elementach okna. */
	function handleDialogKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			closeDetails();
			return;
		}
		if (event.key !== 'Tab' || !dialogEl) return;
		const focusable = [...dialogEl.querySelectorAll<HTMLElement>('button:not([disabled]), [href]')];
		if (!focusable.length) return;
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}

	/* Blokada przewijania listy pod oknem - szukamy najbliższego przewijanego przodka. */
	$effect(() => {
		if (!modalProgram || !dialogEl) return;
		let scroller: HTMLElement | null = dialogEl.parentElement;
		while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) {
			scroller = scroller.parentElement;
		}
		if (!scroller) return;
		const previous = scroller.style.overflowY;
		scroller.style.overflowY = 'hidden';
		return () => {
			scroller.style.overflowY = previous;
		};
	});
</script>

{#snippet icon(name: BenefitIcon | 'person' | 'doc' | 'external' | 'search')}
	<svg viewBox="0 0 24 24" aria-hidden="true">
		{#if name === 'transit'}
			<rect x="5" y="3" width="14" height="14" rx="3" />
			<path d="M5 11h14M9 21l-1.5-4M15 21l1.5-4" />
			<circle cx="9" cy="14" r="0.8" />
			<circle cx="15" cy="14" r="0.8" />
		{:else if name === 'parking'}
			<rect x="4" y="3" width="16" height="18" rx="3" />
			<path d="M10 17V7h3.5a3 3 0 0 1 0 6H10" />
		{:else if name === 'discount'}
			<path d="M3 12V4h8l10 10-8 8z" />
			<circle cx="7.5" cy="8.5" r="1.5" />
		{:else if name === 'family'}
			<circle cx="8" cy="7" r="3" />
			<circle cx="17" cy="9" r="2.2" />
			<path d="M3 20c0-3 2.2-5.5 5-5.5s5 2.5 5 5.5M14 20c0-2.4 1.3-4.4 3-4.4s3 2 3 4.4" />
		{:else if name === 'qr'}
			<rect x="4" y="4" width="6" height="6" rx="1" />
			<rect x="14" y="4" width="6" height="6" rx="1" />
			<rect x="4" y="14" width="6" height="6" rx="1" />
			<path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 20v-2M20 14v2" />
		{:else if name === 'id'}
			<rect x="3" y="5" width="18" height="14" rx="2" />
			<circle cx="9" cy="11" r="2" />
			<path d="M6 16c.6-1.4 1.7-2 3-2s2.4.6 3 2M14 10h4M14 13h3" />
		{:else if name === 'person'}
			<circle cx="12" cy="7" r="3.5" />
			<path d="M5 21c0-4 3.1-7 7-7s7 3 7 7" />
		{:else if name === 'doc'}
			<path d="M7 3h7l5 5v13H7z" />
			<path d="M14 3v5h5M10 13h6M10 17h6" />
		{:else if name === 'external'}
			<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
		{:else if name === 'search'}
			<circle cx="11" cy="11" r="6.5" />
			<path d="m16 16 4.5 4.5" />
		{:else}
			<path d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z" />
		{/if}
	</svg>
{/snippet}

<!-- Uproszczony herb Krakowa: tarcza z bramą o trzech wieżach, rysowana w kolorze tekstu karty. -->
{#snippet crest()}
	<svg class="crest" viewBox="0 0 32 36" aria-hidden="true">
		<path class="crest-shield" d="M2 2h28v16c0 8.5-6.6 14-14 16C8.6 32 2 26.5 2 18z" />
		<path
			class="crest-gate"
			d="M7 28V14h3v-3h2v3h1.5V9h2V7h1v2h2v5H20v-3h2v3h3v14h-6v-6a3 3 0 0 0-6 0v6z"
		/>
	</svg>
{/snippet}

<section class="programs" aria-labelledby="programs-title">

	<div class="filters">
		<div class="search">
			<label for="program-search" class="search-label">Szukaj uprawnienia</label>
			<div class="search-field">
				{@render icon('search')}
				<input
					id="program-search"
					type="search"
					placeholder="szukaj"
					autocomplete="off"
					bind:value={query}
				/>
			</div>
		</div>
		<div class="chips" role="group" aria-label="Grupa odbiorców">
			{#each CATEGORIES as item (item)}
				<button
					type="button"
					class="chip"
					aria-label={item}
					title={item}
					aria-pressed={category === item}
					onclick={() => (category = item)}
				>
					{item === 'Dla osób z orzeczeniem'
						? 'Orzeczenie'
						: item === 'Dla rodzin (KKR „N”)'
							? 'Rodziny'
							: item === 'Dla seniorów'
								? 'Seniorzy'
								: item}
				</button>
			{/each}
		</div>
	</div>

	<p class="result-count" aria-live="polite">Znaleziono: {visiblePrograms.length}</p>

	<div class="program-feed">
		{#each visiblePrograms as program (program.id)}
			<article class="program" aria-labelledby="program-{program.id}">
				<div class="showcase">
					<!-- Makieta karty ma charakter poglądowy, więc czytnik dostaje jeden zwięzły opis zamiast ozdobników. -->
					<div
						class="mock-card"
						role="img"
						aria-label="Poglądowy wygląd: {program.shortName}"
						style:background={program.cardDesign.bgGradient}
						style:color={program.cardDesign.textColor}
					>
						<div class="mock-top">
							<span class="mock-brand">
								{@render crest()}
								<span class="mock-wordmark">
									<strong>KRAKÓW</strong>
									<small>Miasto bez barier</small>
								</span>
							</span>
							<svg class="mock-nfc" viewBox="0 0 24 24" aria-hidden="true">
								<path d="M8 8.5a5 5 0 0 1 0 7M11.5 6a8.5 8.5 0 0 1 0 12M15 3.5a12 12 0 0 1 0 17" />
							</svg>
						</div>
						<svg class="mock-chip" viewBox="0 0 40 30" aria-hidden="true">
							<rect x="1" y="1" width="38" height="28" rx="5" />
							<path d="M1 10h12M1 20h12M27 10h12M27 20h12M13 1v28M27 1v28M13 15h14" />
						</svg>
						<div class="mock-bottom">
							<span class="mock-number">{program.cardDesign.cardNumberMask}</span>
							<span class="mock-name">{program.shortName}</span>
						</div>
					</div>
					<p class="status-badge">
						<svg viewBox="0 0 24 24" aria-hidden="true">
							<path d="M12 3 5 6v5c0 4.4 3 8.4 7 10 4-1.6 7-5.6 7-10V6z" />
							<path d="m9 12 2 2 4-4" />
						</svg>
						{program.cardDesign.badgeText}
					</p>
				</div>

				<div class="program-details">
					<p class="program-category">{program.category}</p>
					<h3 id="program-{program.id}">{program.title}</h3>
					<p class="program-issuer">{program.issuer}</p>
					<p class="program-summary">{program.summary}</p>

					<div class="program-actions">
						<a
							class="source-link"
							href={program.officialSourceUrl}
							target="_blank"
							rel="noreferrer"
						>
							{@render icon('external')}
							Źródło
							<span class="visually-hidden"
								>: {program.sourceLabel} (otwiera się w nowej karcie)</span
							>
						</a>
						<button
							type="button"
							class="details-btn"
							aria-haspopup="dialog"
							aria-expanded={modalProgram?.id === program.id}
							onclick={(event) => openDetails(program, event.currentTarget)}
						>
							Szczegóły<span class="visually-hidden">: {program.title}</span>
							<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
						</button>
					</div>
				</div>
			</article>
		{:else}
			<div class="empty" role="status">
				{@render icon('search')}
				<h3>Brak pasujących uprawnień</h3>
				<p>Zmień frazę wyszukiwania lub wybierz inną grupę odbiorców.</p>
				<button type="button" class="cta" onclick={resetFilters}>Wyczyść filtry</button>
			</div>
		{/each}
	</div>

	{#if modalProgram}
		{@const item = modalProgram}
		<div class="overlay">
			<div class="backdrop" aria-hidden="true" onclick={closeDetails}></div>
			<dialog
				open
				bind:this={dialogEl}
				class="modal"
				aria-modal="true"
				aria-labelledby="details-title"
				aria-describedby="details-subtitle"
				onkeydown={handleDialogKeydown}
			>
				<header class="modal-header">
					<div class="modal-heading">
						<p class="eyebrow">{item.category}</p>
						<h2 id="details-title">{item.title}</h2>
						<p id="details-subtitle" class="modal-subtitle">{item.issuer}</p>
					</div>
					<button
						type="button"
						class="modal-close"
						aria-label="Zamknij szczegóły"
						onclick={closeDetails}
					>
						<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
					</button>
				</header>

				<div class="modal-body">
					<section class="info-block" aria-labelledby="details-benefits">
						<h3 id="details-benefits">Uprawnienia i korzyści</h3>
						<ul class="info-list">
							{#each item.benefits as benefit (benefit)}
								<li>
									<span class="info-icon info-icon--accent"
										>{@render icon(benefitIcon(benefit))}</span
									>
									<span>{benefit}</span>
								</li>
							{/each}
						</ul>
					</section>

					<section class="info-block" aria-labelledby="details-eligibility">
						<h3 id="details-eligibility">Kto może skorzystać</h3>
						<ul class="info-list">
							{#each item.eligibility as rule (rule)}
								<li>
									<span class="info-icon">{@render icon('person')}</span>
									<span>{rule}</span>
								</li>
							{/each}
						</ul>
					</section>

					<section class="info-block" aria-labelledby="details-docs">
						<h3 id="details-docs">Wymagane dokumenty</h3>
						<ul class="info-list">
							{#each item.requiredDocs as doc (doc)}
								<li>
									<span class="info-icon">{@render icon('doc')}</span>
									<span>{doc}</span>
								</li>
							{/each}
						</ul>
					</section>

					<section class="info-block" aria-labelledby="details-steps">
						<h3 id="details-steps">Krok po kroku</h3>
						<ol class="steps">
							{#each item.applicationSteps as step, index (step)}
								<li>
									<span class="step-number" aria-hidden="true">{index + 1}</span>
									<span>{step}</span>
								</li>
							{/each}
						</ol>
					</section>

					<section class="modal-box" aria-labelledby="details-contact">
						<h3 id="details-contact">Gdzie załatwić</h3>
						<p><strong>{item.contactInfo.office}</strong>, {item.contactInfo.address}</p>
						{#if item.contactInfo.hours}
							<p>{item.contactInfo.hours}</p>
						{/if}
						{#if item.contactInfo.phone}
							<p>
								Tel.:
								<a href="tel:+48{item.contactInfo.phone.replace(/\s/g, '')}"
									>{item.contactInfo.phone}</a
								>
							</p>
						{/if}
						{#if item.processingTime}
							<p>{item.processingTime}</p>
						{/if}
					</section>
				</div>

				<footer class="modal-footer">
					<a class="source-link" href={item.officialSourceUrl} target="_blank" rel="noreferrer">
						{@render icon('external')}
						Oficjalne źródło: {item.sourceLabel}
						<span class="visually-hidden">(otwiera się w nowej karcie)</span>
					</a>
				</footer>
			</dialog>
		</div>
	{/if}
</section>

<style>
	.programs {
		display: flex;
		flex-direction: column;
		gap: var(--odstep-duzy);
		color: var(--kolor-tekstu-podstawowego);
	}

	.programs-header h2 {
		margin: 2px 0 var(--odstep-bardzo-maly);
		font-size: 1.375rem;
		font-weight: 800;
		line-height: 1.2;
	}

	.eyebrow {
		margin: 0;
		color: var(--kolor-wyroznienia);
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.intro {
		margin: 0;
		color: var(--kolor-tekstu-drugorzednego);
		font-size: 0.9375rem;
		line-height: 1.45;
	}

	button {
		font: inherit;
		cursor: pointer;
	}

	button:focus-visible,
	a:focus-visible,
	input:focus-visible {
		outline: 3px solid var(--kolor-wyroznienia);
		outline-offset: 2px;
	}

	svg {
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.filters {
		display: flex;
		flex-direction: column;
		gap: var(--odstep-sredni);
	}

	.search-label {
		display: block;
		margin-bottom: var(--odstep-bardzo-maly);
		font-size: 0.875rem;
		font-weight: 600;
	}

	.search-field {
		display: flex;
		align-items: center;
		gap: var(--odstep-maly);
		min-height: 48px;
		padding: 0 var(--odstep-sredni);
		border: 1px solid var(--kolor-obramowania);
		border-radius: var(--zaokraglenie-duze);
		background: var(--kolor-tla-karty);
		color: var(--kolor-tekstu-drugorzednego);
	}

	.search-field:focus-within {
		border-color: var(--kolor-wyroznienia);
	}

	.search-field svg {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
	}

	.search-field input {
		flex: 1;
		min-width: 0;
		height: 46px;
		border: none;
		background: transparent;
		color: var(--kolor-tekstu-podstawowego);
		font: inherit;
		font-size: 0.9375rem;
	}

	/* Obwódka fokusu jest na całym polu, więc samo pole nie potrzebuje drugiej. */
	.search-field input:focus-visible {
		outline: none;
	}

	.chips {
		display: flex;
		flex-wrap: nowrap;
		gap: 4px;
		overflow-x: auto;
		scrollbar-width: none;
		padding: 3px;
		margin: -3px;
	}

	.chips::-webkit-scrollbar {
		display: none;
	}

	.chip {
		flex: 1 0 auto;
		min-height: 44px;
		padding: 0 6px;
		border: 1px solid var(--kolor-obramowania);
		border-radius: var(--zaokraglenie-pelne);
		background: var(--kolor-tla-karty);
		color: var(--kolor-tekstu-listy);
		font-size: 0.75rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.chip[aria-pressed='true'] {
		border-color: var(--kolor-wyroznienia);
		background: var(--kolor-wyroznienia);
		color: var(--kolor-tekstu-na-wyroznieniu);
	}

	.result-count {
		margin: 0;
		color: var(--kolor-tekstu-drugorzednego);
		font-size: 0.8125rem;
	}

	/* Kontener zapytań na liście, nie na sekcji - inaczej zawęziłby pozycjonowanie nakładki okna. */
	.program-feed {
		display: flex;
		flex-direction: column;
		gap: var(--odstep-duzy);
		container-type: inline-size;
	}

	/* Panel programu: celowo większy od kart miejsc - makieta karty nad treścią, a na szerokim ekranie obok niej. */
	.program {
		display: grid;
		gap: var(--odstep-duzy);
		padding: var(--odstep-duzy);
		border: 1px solid var(--kolor-obramowania);
		border-radius: var(--zaokraglenie-duze);
		background: var(--kolor-tla-karty);
		box-shadow: var(--cien-karty);
	}

	@container (min-width: 600px) {
		.program {
			grid-template-columns: minmax(220px, 2fr) 3fr;
			align-items: start;
		}
	}

	.showcase {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--odstep-sredni);
	}

	.mock-card {
		position: relative;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		width: 100%;
		max-width: 340px;
		aspect-ratio: 1.586;
		padding: 16px 18px;
		overflow: hidden;
		border-radius: 16px;
		box-shadow:
			inset 0 0 0 1px rgb(255 255 255 / 0.18),
			0 10px 24px -8px rgb(15 23 42 / 0.45);
		isolation: isolate;
	}

	/* Szklany połysk i delikatne pierścienie imitują fakturę plastikowej karty. */
	.mock-card::before,
	.mock-card::after {
		content: '';
		position: absolute;
		z-index: -1;
		pointer-events: none;
	}

	.mock-card::before {
		inset: 0;
		background: linear-gradient(
			115deg,
			rgb(255 255 255 / 0.28) 0%,
			rgb(255 255 255 / 0.06) 38%,
			transparent 40%
		);
	}

	.mock-card::after {
		right: -30%;
		bottom: -55%;
		width: 90%;
		aspect-ratio: 1;
		border: 18px solid rgb(255 255 255 / 0.07);
		border-radius: 50%;
		box-shadow: 0 0 0 26px rgb(255 255 255 / 0.04);
	}

	.mock-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
	}

	.mock-brand {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.crest {
		width: 26px;
		height: 30px;
		stroke: none;
	}

	.crest-shield {
		fill: currentColor;
		opacity: 0.22;
	}

	.crest-gate {
		fill: currentColor;
	}

	.mock-wordmark {
		display: flex;
		flex-direction: column;
		line-height: 1.1;
	}

	.mock-wordmark strong {
		font-size: 0.875rem;
		font-weight: 800;
		letter-spacing: 0.14em;
	}

	.mock-wordmark small {
		font-size: 0.5625rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		opacity: 0.8;
	}

	.mock-nfc {
		width: 24px;
		height: 24px;
		opacity: 0.85;
	}

	.mock-chip {
		width: 44px;
		height: 33px;
		stroke: #8a6d1f;
		stroke-width: 1.2;
	}

	.mock-chip rect {
		fill: #e9c96b;
	}

	.mock-bottom {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.mock-number {
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 0.875rem;
		letter-spacing: 0.08em;
		opacity: 0.9;
	}

	.mock-name {
		font-size: 1rem;
		font-weight: 800;
		letter-spacing: 0.02em;
		text-shadow: 0 1px 2px rgb(0 0 0 / 0.25);
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin: 0;
		padding: 4px 10px;
		border-radius: var(--zaokraglenie-pelne);
		background: var(--kolor-delikatnego-wyroznienia);
		color: var(--kolor-wyroznienia);
		font-size: 0.75rem;
		font-weight: 700;
	}

	.status-badge svg {
		width: 16px;
		height: 16px;
	}

	/* Na liście tylko nagłówek i jedno zdanie - jak karty miejsc; pełne dane w oknie szczegółów. */
	.program-details {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.program-category {
		margin: 0;
		color: var(--kolor-tekstu-drugorzednego);
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.program-details h3 {
		margin: 0;
		font-size: 1.0625rem;
		font-weight: 800;
		line-height: 1.25;
	}

	.program-issuer {
		margin: 0;
		color: var(--kolor-tekstu-drugorzednego);
		font-size: 0.75rem;
		line-height: 1.35;
	}

	.program-summary {
		margin: var(--odstep-bardzo-maly) 0 0;
		color: var(--kolor-tekstu-listy);
		font-size: 0.875rem;
		line-height: 1.4;
	}

	.info-block + .info-block {
		padding-top: var(--odstep-sredni);
		border-top: 1px solid var(--kolor-obramowania);
	}

	.info-block h3 {
		margin: 0 0 var(--odstep-maly);
		font-size: 0.875rem;
		font-weight: 700;
	}

	.info-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.info-list li {
		display: flex;
		align-items: center;
		gap: var(--odstep-maly);
		color: var(--kolor-tekstu-listy);
		font-size: 0.8125rem;
		line-height: 1.4;
	}

	.info-icon {
		display: grid;
		flex-shrink: 0;
		place-items: center;
		width: 24px;
		height: 24px;
		border-radius: var(--zaokraglenie-srednie);
		background: var(--kolor-tla-elementu-drugorzednego);
		color: var(--kolor-tekstu-drugorzednego);
	}

	.info-icon--accent {
		background: var(--kolor-delikatnego-wyroznienia);
		color: var(--kolor-wyroznienia);
	}

	.info-icon svg {
		width: 14px;
		height: 14px;
	}

	.program-actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--odstep-maly);
		margin-top: var(--odstep-sredni);
	}

	.source-link,
	.details-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		min-height: 40px;
		padding: 0 var(--odstep-sredni);
		border-radius: var(--zaokraglenie-srednie);
		font-size: 0.875rem;
		font-weight: 700;
		text-decoration: none;
	}

	.source-link {
		border: none;
		background: var(--kolor-wyroznienia);
		color: var(--kolor-tekstu-na-wyroznieniu);
	}

	.details-btn {
		border: 1px solid var(--kolor-obramowania);
		background: var(--kolor-tla-elementu-drugorzednego);
		color: var(--kolor-tekstu-listy);
	}

	.source-link svg,
	.details-btn svg {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
		stroke-width: 2.2;
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--odstep-maly);
		padding: var(--odstep-duzy);
		border: 1px dashed var(--kolor-obramowania);
		border-radius: var(--zaokraglenie-duze);
		background: var(--kolor-tla-karty);
		text-align: center;
	}

	.empty > svg {
		width: 44px;
		height: 44px;
		stroke: var(--kolor-tekstu-pomocniczego);
		stroke-width: 1.8;
	}

	.empty h3 {
		margin: 0;
		font-size: 1.125rem;
	}

	.empty p {
		margin: 0;
		color: var(--kolor-tekstu-drugorzednego);
		font-size: 0.875rem;
		line-height: 1.45;
	}

	.cta {
		min-height: 44px;
		margin-top: var(--odstep-sredni);
		padding: 0 var(--odstep-duzy);
		border: none;
		border-radius: var(--zaokraglenie-srednie);
		background: var(--kolor-wyroznienia);
		color: var(--kolor-tekstu-na-wyroznieniu);
		font-size: 0.9375rem;
		font-weight: 700;
	}

	/* Nakładka liczona względem widoku telefonu - przykrywa też pasek nawigacji. */
	.overlay {
		position: absolute;
		inset: 0;
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 56px var(--odstep-duzy) var(--odstep-duzy);
	}

	.backdrop {
		position: absolute;
		inset: 0;
		background: var(--kolor-tla-zaciemnienia);
		animation: fade-in 0.2s ease-out;
	}

	.modal {
		position: relative;
		display: flex;
		flex-direction: column;
		width: 100%;
		max-height: 100%;
		margin: 0;
		padding: 0;
		overflow: hidden;
		border: 1px solid var(--kolor-obramowania);
		border-radius: var(--zaokraglenie-duze);
		background: var(--kolor-tla-karty);
		color: var(--kolor-tekstu-podstawowego);
		box-shadow: var(--cien-panelu-mapy);
		animation: pop-in 0.2s ease-out;
	}

	.modal-header {
		display: flex;
		align-items: flex-start;
		gap: var(--odstep-sredni);
		padding: var(--odstep-duzy) var(--odstep-duzy) var(--odstep-sredni);
	}

	.modal-heading {
		flex: 1;
		min-width: 0;
	}

	.modal-heading h2 {
		margin: 2px 0;
		font-size: 1.125rem;
		font-weight: 800;
		line-height: 1.25;
	}

	.modal-subtitle {
		margin: 0;
		color: var(--kolor-tekstu-drugorzednego);
		font-size: 0.8125rem;
		line-height: 1.35;
	}

	.modal-close {
		display: grid;
		flex-shrink: 0;
		place-items: center;
		width: 40px;
		height: 40px;
		padding: 0;
		border: none;
		border-radius: 50%;
		background: var(--kolor-tla-elementu-drugorzednego);
		color: var(--kolor-tekstu-podstawowego);
	}

	.modal-close svg {
		width: 20px;
		height: 20px;
		stroke-width: 2.4;
	}

	.modal-body {
		display: flex;
		flex-direction: column;
		gap: var(--odstep-sredni);
		padding: 0 var(--odstep-duzy) var(--odstep-duzy);
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-width: none;
	}

	.modal-body::-webkit-scrollbar {
		display: none;
	}

	.steps {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.steps li {
		display: flex;
		align-items: center;
		gap: var(--odstep-maly);
		color: var(--kolor-tekstu-listy);
		font-size: 0.8125rem;
		line-height: 1.4;
	}

	.step-number {
		display: grid;
		flex-shrink: 0;
		place-items: center;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: var(--kolor-wyroznienia);
		color: var(--kolor-tekstu-na-wyroznieniu);
		font-size: 0.75rem;
		font-weight: 800;
	}

	.modal-box {
		padding: var(--odstep-sredni);
		border-radius: var(--zaokraglenie-srednie);
		background: var(--kolor-tla-elementu-drugorzednego);
	}

	.modal-box h3 {
		margin: 0 0 4px;
		font-size: 0.875rem;
		font-weight: 700;
	}

	.modal-box p {
		margin: 0;
		color: var(--kolor-tekstu-listy);
		font-size: 0.8125rem;
		line-height: 1.45;
	}

	.modal-box a {
		color: var(--kolor-wyroznienia);
		font-weight: 700;
	}

	.modal-footer {
		display: grid;
		padding: var(--odstep-sredni) var(--odstep-duzy);
		border-top: 1px solid var(--kolor-obramowania);
	}

	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}

	@keyframes fade-in {
		from {
			opacity: 0;
		}
	}

	@keyframes pop-in {
		from {
			opacity: 0;
			transform: translateY(12px) scale(0.98);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.backdrop,
		.modal {
			animation: none;
		}
	}
</style>
