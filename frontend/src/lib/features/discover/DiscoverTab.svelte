<script lang="ts">
	import { goto } from '$app/navigation';
	import { tick } from 'svelte';
	import type {
		AccessibilityDetails,
		AmenityIconType,
		Facility,
		FacilityBadge,
		FacilityCategory
	} from './types/facility';
	import { navigationRequest } from '#lib/state/navigation.svelte.ts';
	import { tabHref } from '#lib/config/navigation.ts';
	import CardProgramsView from './components/CardProgramsView.svelte';

	type View = 'places' | 'cards';
	type SectionIcon = AmenityIconType | 'door' | 'hanger';

	let {
		onNavigate,
		onOpenDetails
	}: {
		onNavigate?: (facility: Facility) => void;
		onOpenDetails?: (facility: Facility) => void;
	} = $props();

	const CATEGORIES = ['Wszystkie', 'Muzea', 'Sport', 'Zabytki'] as const satisfies readonly (
		'Wszystkie' | FacilityCategory
	)[];
	type CategoryFilter = (typeof CATEGORIES)[number];

	const FACILITIES: Facility[] = [
		{
			id: 'tauron-arena',
			name: 'TAURON Arena Kraków',
			category: 'Sport',
			distance: '110 m',
			address: 'ul. Stanisława Lema 7',
			verified: true,
			verifiedSource: 'Audyt Miejski UMK & Operator Areny 2026',
			badges: [
				{ label: 'Wejście bezprogowe', iconType: 'wheelchair' },
				{ label: "Windy z Braille'em", iconType: 'lift' },
				{ label: 'Parking OzN', iconType: 'parking' },
				{ label: 'Toalety z SOS', iconType: 'restroom' }
			],
			image: '',
			alt: 'Hala widowiskowo-sportowa TAURON Arena Kraków',
			coordinates: [50.06757, 19.99149],
			details: {
				parking:
					'Dedykowany parking podziemny (wjazd bramą nr 2) z oznakowanymi kopertami bezpośrednio przy windach.',
				entrance:
					'Wejścia bezprogowe przez bramę 1 i 3, automatyczne drzwi przesuwne, obniżone barierki kontroli biletowej.',
				verticalTransport:
					"Szybkie windy towarowo-osobowe z zapowiedziami głosowymi i oznaczeniami w alfabecie Braille'a.",
				restrooms:
					'Dostosowane toalety na każdym poziomie z systemem powiadamiania ratunkowego SOS.',
				notes:
					'Widownia: specjalne platformy dla wózków inwalidzkich na poziomie płyty oraz sektora A z asystą stewardów.'
			}
		},
		{
			id: 'mnk-gmach-glowny',
			name: 'Gmach Główny (Muzeum Narodowe w Krakowie)',
			category: 'Muzea',
			distance: '4,8 km',
			address: 'al. 3 Maja 1',
			verified: true,
			verifiedSource: 'Wydział Polityki Społecznej UMK & Audytor MNK',
			badges: [
				{ label: 'Windy i platformy', iconType: 'lift' },
				{ label: 'Komfortka', iconType: 'komfortka' },
				{ label: 'Parking OzN', iconType: 'parking' },
				{ label: 'Wypożyczalnia wózków', iconType: 'wheelchair' }
			],
			image: '',
			alt: 'Gmach Główny Muzeum Narodowego w Krakowie',
			coordinates: [50.06036, 19.92353],
			details: {
				parking:
					'Płatny parking podziemny z miejscami dla OzN bezpośrednio przy wejściu oraz 2 dodatkowe koperty w pobliżu Błoń.',
				verticalTransport:
					'Winda zewnętrzna przy wejściu głównym, windy wewnętrzne, platformy schodowe oraz szyny przenośne (dostęp do niemal całego budynku z wyjątkiem antresoli na 2. piętrze).',
				cloakroom:
					'Dedykowana szatnia na parterze przy sklepiku (alternatywa dla szatni na poziomie -1 dostępnej po schodach).',
				restrooms:
					'Przystosowane toalety na każdym piętrze; na 1. piętrze dostępna komfortka (łóżko do przewijania dorosłych).',
				equipmentRental: 'Wózki dla zwiedzających dostępne na parterze.'
			}
		},
		{
			id: 'sukiennice',
			name: 'Sukiennice (Galeria Sztuki Polskiej XIX wieku)',
			category: 'Zabytki',
			distance: '3,8 km',
			address: 'Rynek Główny 1–3',
			verified: true,
			verifiedSource: 'Audyt Dostępności Historycznej UMK',
			badges: [
				{ label: 'Wejście bezprogowe', iconType: 'wheelchair' },
				{ label: 'Winda na taras', iconType: 'lift' },
				{ label: 'Toaleta dostosowana', iconType: 'restroom' }
			],
			image: '',
			alt: 'Sukiennice na Rynku Głównym w Krakowie',
			coordinates: [50.06168, 19.93732],
			details: {
				entrance:
					'Bezprogowe wejście do budynku, bezprogowe przejścia między salami oraz łagodny podjazd prowadzący na taras.',
				verticalTransport: 'Winda zapewniająca dostęp do galerii i tarasów.',
				cloakroom:
					'Obniżone lady recepcji, sklepu muzealnego i stanowiska strażnika dostosowane do osób na wózkach. Dedykowana szatnia z szafkami bagażowymi przy sklepie na parterze (omijająca schody do szatni głównej).',
				restrooms:
					'W pełni dostosowana (opuszczane uchwyty, specjalna armatura, pochylone lustro, elementy dla osób ze spastycznością rąk); do pokonania schodów przed toaletą obsługa rozkłada mobilne rampy aluminiowe.'
			}
		},
		{
			id: 'kamienica-szolayskich',
			name: 'Kamienica Szołayskich im. Feliksa Jasieńskiego',
			category: 'Muzea',
			distance: '3,7 km',
			address: 'pl. Szczepański 9',
			verified: true,
			verifiedSource: 'Zespół ds. Dostępności MNK',
			badges: [
				{ label: 'Wejście z asystą', iconType: 'wheelchair' },
				{ label: 'Winda', iconType: 'lift' },
				{ label: '2 dostosowane toalety', iconType: 'restroom' }
			],
			image: '',
			alt: 'Kamienica Szołayskich przy placu Szczepańskim',
			coordinates: [50.06475, 19.93859],
			details: {
				entrance:
					'Wejście alternatywne: dedykowane wejście od ul. Szczepańskiej z domofonem do wezwania asysty pracownika muzeum przy pokonywaniu zabytkowego progu.',
				verticalTransport: 'Winda.',
				restrooms: 'Dwie dostosowane toalety (na parterze przy wejściu oraz na 1. piętrze).'
			}
		},
		{
			id: 'willa-atma',
			name: 'Muzeum Karola Szymanowskiego w willi „Atma” (Zakopane)',
			category: 'Muzea',
			distance: '86 km',
			address: 'ul. Kasprusie 19, Zakopane',
			verified: false,
			verifiedSource: 'Deklaracja dostępności obiektu (wymaga asysty)',
			badges: [
				{ label: 'Wjazd na posesję', iconType: 'parking' },
				{ label: 'Podjazdy wewnątrz', iconType: 'wheelchair' },
				{ label: 'Dostępna toaleta', iconType: 'restroom' }
			],
			image: '',
			alt: 'Willa „Atma” w Zakopanem',
			coordinates: [49.28997, 19.96433],
			details: {
				parking:
					'Możliwość wjazdu samochodem na posesję po wcześniejszym kontakcie z pracownikami.',
				entrance: 'Szerokie drzwi oraz podjazdy wewnątrz budynku.',
				restrooms: 'Dostępna toaleta.',
				notes: 'Wejście na teren posesji wymaga asysty ze względu na stromy zjazd i wysoki próg.'
			}
		},
		{
			id: 'dom-mehoffera',
			name: 'Dom Józefa Mehoffera',
			category: 'Muzea',
			distance: '4,4 km',
			address: 'ul. Krupnicza 26',
			verified: false,
			verifiedSource: 'Częściowa dostępność architektoniczna',
			badges: [{ label: 'Pochylnia do ogrodu', iconType: 'wheelchair' }],
			image: '',
			alt: 'Dom Józefa Mehoffera przy ulicy Krupniczej',
			coordinates: [50.06288, 19.92818],
			details: {
				entrance:
					'Po pokonaniu dwóch stopni przy wejściu dostępny jest parter (salon, sklepik) oraz ogród wraz z kawiarnią, do którego prowadzi pochylnia z poręczą.',
				verticalTransport: 'Brak windy na piętro.'
			}
		},
		{
			id: 'palac-ciolka',
			name: 'Pałac Biskupa Erazma Ciołka',
			category: 'Zabytki',
			distance: '3,9 km',
			address: 'ul. Kanonicza 17',
			verified: true,
			verifiedSource: 'Certyfikat Małopolska Bez Barier',
			badges: [
				{ label: 'Wejście bezprogowe', iconType: 'wheelchair' },
				{ label: 'Winda i schodołaz', iconType: 'lift' },
				{ label: 'Toaleta przy windzie', iconType: 'restroom' }
			],
			image: '',
			alt: 'Pałac Biskupa Erazma Ciołka przy ulicy Kanoniczej',
			coordinates: [50.05637, 19.93769],
			details: {
				entrance: 'Wejście bezprogowe.',
				verticalTransport: 'Winda na 1. piętro.',
				equipmentRental:
					'Schodołaz, platformy schodowe i przenośne szyny aluminiowe obsługiwane przez pracowników do pokonywania schodów do bocznych sal, galerii oraz poziomu -1.',
				restrooms: 'Dostępna toaleta usytuowana obok windy.'
			}
		},
		{
			id: 'muzeum-wyspianskiego',
			name: 'Muzeum Stanisława Wyspiańskiego',
			category: 'Muzea',
			distance: '4,3 km',
			address: 'pl. Sikorskiego 6',
			verified: true,
			verifiedSource: 'Kompleksowy Audyt Dostępności UMK 2025',
			badges: [
				{ label: 'Wejście bezprogowe', iconType: 'wheelchair' },
				{ label: 'Winda', iconType: 'lift' },
				{ label: 'Spacer wirtualny z AD i ETR', iconType: 'digital' },
				{ label: 'Toaleta przy windzie', iconType: 'restroom' }
			],
			image: '',
			alt: 'Muzeum Stanisława Wyspiańskiego przy placu Sikorskiego',
			coordinates: [50.06176, 19.93062],
			details: {
				entrance:
					'Bezprogowe wejście główne poprzedzone niewielką pochylnią zabezpieczoną guzami. Bezprogowe przejścia pomiędzy salami.',
				verticalTransport: 'Winda obsługująca ekspozycję.',
				cloakroom:
					'Lady recepcji, kasy, sklepu oraz szafki depozytowe przystosowane do wysokości wózków.',
				restrooms: 'Dostępna toaleta zlokalizowana w pobliżu windy.',
				digitalAccess:
					'Wirtualny spacer po wystawie z audiodeskrypcją oraz w tekście łatwym do czytania (ETR).'
			}
		}
	];

	interface SponsoredOffer {
		kind: 'hotel' | 'event';
		title: string;
		description: string;
		cta: string;
	}

	const SPONSORED_OFFERS: SponsoredOffer[] = [
		{
			kind: 'hotel',
			title: 'Hotel bez barier w centrum',
			description: 'Pokoje bez progów i parking tuż przy wejściu.',
			cta: 'Sprawdź ofertę'
		},
		{
			kind: 'event',
			title: 'Koncert plenerowy dla wszystkich',
			description: 'Strefa dla wózków i tłumacz PJM na scenie.',
			cta: 'Zobacz wydarzenie'
		}
	];

	/* Kolejnosc sekcji w oknie szczegolow; wypozyczalnia i dostepnosc cyfrowa dziela jedna sekcje */
	const DETAIL_SECTIONS: {
		title: string;
		icon: SectionIcon;
		keys: (keyof AccessibilityDetails)[];
	}[] = [
		{ title: 'Parking i dojazd', icon: 'parking', keys: ['parking'] },
		{ title: 'Wejście i ciągi komunikacyjne', icon: 'door', keys: ['entrance'] },
		{ title: 'Komunikacja pionowa (windy / platformy)', icon: 'lift', keys: ['verticalTransport'] },
		{ title: 'Szatnie i obsługa klienta', icon: 'hanger', keys: ['cloakroom'] },
		{ title: 'Toalety i komfortki', icon: 'restroom', keys: ['restrooms'] },
		{
			title: 'Wypożyczalnia sprzętu i udogodnienia cyfrowe',
			icon: 'digital',
			keys: ['equipmentRental', 'digitalAccess']
		}
	];

	const CHIP_LIMIT = 2;

	let ad = $state<SponsoredOffer | null>(null);

	/* Symulacja pobierania reklamy - do tego czasu widac szkielet karty */
	$effect(() => {
		const timer = setTimeout(() => {
			ad = SPONSORED_OFFERS[Math.floor(Math.random() * SPONSORED_OFFERS.length)];
		}, 900);
		return () => clearTimeout(timer);
	});

	let view = $state<View>('places');
	let category = $state<CategoryFilter>('Wszystkie');
	let verifiedOnly = $state(false);
	let tooltipId = $state<string | null>(null);
	let modalFacility = $state<Facility | null>(null);
	let dialogEl = $state<HTMLDialogElement>();
	let returnFocusEl: HTMLElement | null = null;

	const visibleFacilities = $derived(
		FACILITIES.filter(
			(item) =>
				(category === 'Wszystkie' || item.category === category) && (!verifiedOnly || item.verified)
		)
	);

	function resetFilters() {
		category = 'Wszystkie';
		verifiedOnly = false;
	}

	function verifyLabel(item: Facility) {
		return item.verified ? 'Zweryfikowane przez miasto' : 'Weryfikacja w toku';
	}

	function verifySource(item: Facility) {
		return item.verified
			? `Zweryfikowano przez: ${item.verifiedSource}`
			: `${item.verifiedSource} – oczekuje na weryfikację UMK`;
	}

	function sectionText(details: AccessibilityDetails, keys: (keyof AccessibilityDetails)[]) {
		return keys
			.map((key) => details[key])
			.filter(Boolean)
			.join(' ');
	}

	async function handleNavigate(facility: Facility) {
		closeDetailsModal(false);
		if (onNavigate) {
			onNavigate(facility);
			return;
		}
		await goto(tabHref('map'));
		const [lat, lng] = facility.coordinates;
		navigationRequest.target = { name: facility.name, lat, lng };
	}

	async function openDetailsModal(facility: Facility, trigger: HTMLElement) {
		if (onOpenDetails) {
			onOpenDetails(facility);
			return;
		}
		returnFocusEl = trigger;
		tooltipId = null;
		modalFacility = facility;
		await tick();
		dialogEl?.querySelector<HTMLElement>('.modal-close')?.focus();
	}

	function closeDetailsModal(restoreFocus = true) {
		if (!modalFacility) return;
		modalFacility = null;
		if (restoreFocus) returnFocusEl?.focus();
		returnFocusEl = null;
	}

	function handleDialogKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			closeDetailsModal();
			return;
		}
		if (event.key !== 'Tab' || !dialogEl) return;
		const focusable = [
			...dialogEl.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex="0"]')
		];
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

	$effect(() => {
		if (!modalFacility || !dialogEl) return;
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

	function handleTooltipKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && tooltipId) {
			event.stopPropagation();
			tooltipId = null;
		}
	}
</script>

{#snippet categoryIcon(name: string)}
	<svg viewBox="0 0 24 24" aria-hidden="true" class="thumb-icon">
		{#if name === 'Muzea'}
			<path d="M3 21h18M5 21V10m4 11V10m6 11V10m4 11V10M2 10l10-6 10 6z" />
		{:else if name === 'Sport'}
			<ellipse cx="12" cy="9" rx="9" ry="4" />
			<path d="M3 9v6c0 2.2 4 4 9 4s9-1.8 9-4V9M7 12.5v5M12 13v6M17 12.5v5" />
		{:else if name === 'Zabytki'}
			<path d="M4 21V9l2-2 2 2v3h2V5l2-2 2 2v7h2V9l2-2 2 2v12zM10 21v-4a2 2 0 014 0v4" />
		{:else if name === 'hotel'}
			<path d="M3 19V6M3 15h18v4M21 15v-3a3 3 0 00-3-3h-7v6M7 12.5a1.5 1.5 0 100-.01" />
		{:else}
			<path
				d="M9 18V6l11-2v12M9 18a3 3 0 11-6 0 3 3 0 016 0zM20 16a3 3 0 11-6 0 3 3 0 016 0zM9 10l11-2"
			/>
		{/if}
	</svg>
{/snippet}

<!-- Kazde udogodnienie ma wlasna ikone zamiast ogolnego "ptaszka" -->
{#snippet amenitySvg(icon: SectionIcon, className = 'chip-icon')}
	<svg viewBox="0 0 24 24" aria-hidden="true" class={className}>
		{#if icon === 'wheelchair'}
			<circle cx="11" cy="4" r="1.6" />
			<path d="M11 7v6h5l2.5 5M11 10h4.5M8.5 10.5a5.5 5.5 0 107.3 7.3" />
		{:else if icon === 'lift'}
			<rect x="4" y="3" width="16" height="18" rx="2" />
			<path d="M9 10l3-3 3 3M9 14l3 3 3-3" />
		{:else if icon === 'parking'}
			<rect x="4" y="3" width="16" height="18" rx="3" />
			<path d="M10 17V8h3a2.5 2.5 0 010 5h-3" />
		{:else if icon === 'restroom'}
			<circle cx="7" cy="4.5" r="1.5" />
			<circle cx="17" cy="4.5" r="1.5" />
			<path d="M7 8v13M5 9h4v6H5zM17 8l-3 8h6l-3-8zM17 16v5M12 3v18" />
		{:else if icon === 'komfortka'}
			<circle cx="6" cy="9" r="1.8" />
			<path d="M9 10h11v3H3v-3M4 13v6M20 13v6M3 17h18" />
		{:else if icon === 'ear'}
			<path d="M7 9a5 5 0 0110 0c0 3-3 4-3 7a3 3 0 01-5.6 1.4M10 9a2 2 0 014 0" />
			<path d="M3.5 6.5a8 8 0 000 5" />
		{:else if icon === 'digital'}
			<rect x="6" y="2.5" width="12" height="19" rx="2.5" />
			<path d="M10.5 9.5v5l4-2.5-4-2.5zM11 18.5h2" />
		{:else if icon === 'door'}
			<path d="M5 21V4a1 1 0 011-1h9a1 1 0 011 1v17M3 21h18M13 12h.01M16 7h3v14" />
		{:else}
			<path d="M12 6a2 2 0 112 2c-1 .5-2 1-2 2.5M12 10.5L3 17h18z" />
		{/if}
	</svg>
{/snippet}

{#snippet chipList(badges: FacilityBadge[], limit = Infinity)}
	<ul class="chip-list" aria-label="Udogodnienia">
		{#each badges.slice(0, limit) as badge (badge.label)}
			<li class="micro-chip">{@render amenitySvg(badge.iconType)}{badge.label}</li>
		{/each}
		{#if badges.length > limit}
			<li class="micro-chip micro-chip--more">
				+{badges.length - limit}<span class="visually-hidden"> więcej udogodnień</span>
			</li>
		{/if}
	</ul>
{/snippet}

{#snippet verifyGlyph(verified: boolean)}
	<svg viewBox="0 0 24 24" aria-hidden="true">
		{#if verified}
			<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z" />
			<path d="M8.5 12l2.5 2.5 4.5-5" />
		{:else}
			<path d="M9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2.2M12 17h.01" />
		{/if}
	</svg>
{/snippet}

{#snippet verifyBadge(item: Facility)}
	{@const tipId = `verify-tip-${item.id}`}
	<span
		class="verify"
		role="presentation"
		onkeydown={handleTooltipKeydown}
		onpointerenter={(event) => event.pointerType === 'mouse' && (tooltipId = item.id)}
		onpointerleave={(event) => event.pointerType === 'mouse' && (tooltipId = null)}
	>
		<button
			type="button"
			class="verify-badge"
			class:verify-badge--ok={item.verified}
			aria-label={verifyLabel(item)}
			aria-describedby={tipId}
			onfocus={() => (tooltipId = item.id)}
			onblur={() => (tooltipId = null)}
			onclick={() => (tooltipId = tooltipId === item.id ? null : item.id)}
		>
			{@render verifyGlyph(item.verified)}
		</button>
		<span id={tipId} role="tooltip" class="tooltip" class:tooltip--open={tooltipId === item.id}>
			<strong>{verifyLabel(item)}</strong>
			{verifySource(item)}
		</span>
	</span>
{/snippet}

<section class="hub" aria-labelledby="hub-title">
	<header class="hub-header">
		<p class="eyebrow">Kraków bez barier</p>
		<h1 id="hub-title">Udogodnienia</h1>
		<p class="intro">Odkrywaj miejsca i infrastrukturę dostosowaną do Twoich potrzeb.</p>
	</header>

	<div class="segmented" role="group" aria-label="Rodzaj udogodnień">
		<button type="button" aria-pressed={view === 'places'} onclick={() => (view = 'places')}>
			Miejsca
		</button>
		<button type="button" aria-pressed={view === 'cards'} onclick={() => (view = 'cards')}>
			Zniżki
		</button>
	</div>

	{#if view === 'places'}
		<section class="filters" aria-label="Filtry">
			<div class="chips" role="group" aria-label="Kategoria">
				{#each CATEGORIES as name (name)}
					<button
						type="button"
						class="chip"
						aria-pressed={category === name}
						onclick={() => (category = name)}
					>
						{name}
					</button>
				{/each}
			</div>

			<button
				type="button"
				class="switch-row"
				role="switch"
				aria-checked={verifiedOnly}
				onclick={() => (verifiedOnly = !verifiedOnly)}
			>
				<svg viewBox="0 0 24 24" aria-hidden="true" class="shield-icon">
					<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z" />
					<path d="M8.5 12l2.5 2.5 4.5-5" />
				</svg>
				<span class="switch-label">Tylko zweryfikowane</span>
				<span class="switch-track" aria-hidden="true"><span class="switch-thumb"></span></span>
			</button>
		</section>

		<section class="feed" aria-label="Lista miejsc">
			<p class="result-count" role="status">Znaleziono: {visibleFacilities.length}</p>

			<section class="ad" aria-label="Partner dostępności - treść sponsorowana" aria-busy={!ad}>
				{#if ad}
					<article class="tile tile--ad" aria-labelledby="ad-title">
						<div class="thumb thumb--ad">
							<div class="thumb-fallback" aria-hidden="true">{@render categoryIcon(ad.kind)}</div>
						</div>
						<div class="card-body">
							<p class="card-meta">
								<span class="ad-label" title="Treść sponsorowana partnera miasta">
									<svg viewBox="0 0 24 24" aria-hidden="true">
										<path
											d="M3 10.5v3l13 5V5.5l-13 5zM16 8.5h2a3 3 0 010 6h-2M7 14.5l1.2 4.5h3l-1-3.4"
										/>
									</svg>
									Sponsorowane
								</span>
							</p>
							<h2 id="ad-title" class="card-title">{ad.title}</h2>
							<p class="card-sub card-sub--wrap">{ad.description}</p>
							<p class="ad-partner">Partner dostępności</p>
						</div>
						<div class="card-actions card-actions--single">
							<button type="button" class="details-btn">
								{ad.cta}<span class="visually-hidden">: {ad.title}</span>
								<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
							</button>
						</div>
					</article>
				{:else}
					<div class="tile" aria-hidden="true">
						<span class="thumb sk"></span>
						<div class="card-body sk-body">
							<span class="sk sk-line sk-short"></span>
							<span class="sk sk-line"></span>
						</div>
					</div>
					<span class="visually-hidden">Ładowanie treści sponsorowanej</span>
				{/if}
			</section>

			{#each visibleFacilities as item (item.id)}
				<article class="tile" aria-labelledby="facility-{item.id}">
					<div class="thumb">
						{#if item.image}
							<img src={item.image} alt={item.alt} loading="lazy" decoding="async" />
						{:else}
							<div class="thumb-fallback" role="img" aria-label={item.alt}>
								{@render categoryIcon(item.category)}
							</div>
						{/if}
					</div>

					<div class="card-body">
						<p class="card-meta">
							<span class="card-kind">{item.category}</span>
							<span class="distance">
								<svg viewBox="0 0 24 24" aria-hidden="true">
									<path d="M12 21s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12z" />
									<circle cx="12" cy="9" r="2.5" />
								</svg>
								<span class="visually-hidden">Odległość:</span>
								{item.distance}
							</span>
						</p>
						<div class="title-row">
							<h2 id="facility-{item.id}" class="card-title">{item.name}</h2>
							{@render verifyBadge(item)}
						</div>
						<p class="card-sub">{item.address}</p>
						{@render chipList(item.badges, CHIP_LIMIT)}
					</div>

					<div class="card-actions">
						<button type="button" class="nav-btn" onclick={() => handleNavigate(item)}>
							<svg viewBox="0 0 24 24" aria-hidden="true">
								<path d="M3 11l18-8-8 18-2-8-8-2z" />
							</svg>
							Nawiguj<span class="visually-hidden">: {item.name}</span>
						</button>
						<button
							type="button"
							class="details-btn"
							aria-haspopup="dialog"
							aria-expanded={modalFacility?.id === item.id}
							onclick={(event) => openDetailsModal(item, event.currentTarget)}
						>
							Szczegóły<span class="visually-hidden"> dostępności: {item.name}</span>
							<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
						</button>
					</div>
				</article>
			{:else}
				<div class="empty" role="status">
					<svg viewBox="0 0 24 24" aria-hidden="true" class="empty-icon">
						<circle cx="11" cy="11" r="6.5" />
						<path d="M16 16l4.5 4.5M8.5 11h5" />
					</svg>
					<h2>Brak pasujących miejsc</h2>
					<p>Żadne miejsce nie spełnia wybranych filtrów. Spróbuj poszerzyć wyszukiwanie.</p>
					<button type="button" class="cta" onclick={resetFilters}>Wyczyść filtry</button>
				</div>
			{/each}
		</section>
	{:else}
		<!-- Karty i znizki: osobny komponent, bez tresci sponsorowanych -->
		<CardProgramsView />
	{/if}

	<!-- Okno nad calym ekranem telefonu (pozycjonowane wzgledem widoku aplikacji, nie listy) -->
	{#if modalFacility}
		{@const item = modalFacility}
		<div class="overlay">
			<div class="backdrop" aria-hidden="true" onclick={() => closeDetailsModal()}></div>
			<dialog
				open
				bind:this={dialogEl}
				class="modal"
				aria-modal="true"
				aria-labelledby="modal-title"
				aria-describedby="modal-source"
				onkeydown={handleDialogKeydown}
			>
				<header class="modal-header">
					<div class="modal-heading">
						<p class="card-kind">{item.category}</p>
						<h2 id="modal-title">{item.name}</h2>
						<p class="modal-address">{item.address} · {item.distance}</p>
					</div>
					<button
						type="button"
						class="modal-close"
						aria-label="Zamknij szczegóły"
						onclick={() => closeDetailsModal()}
					>
						<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
					</button>
				</header>

				<p id="modal-source" class="modal-source" class:modal-source--ok={item.verified}>
					<span class="modal-source-icon">{@render verifyGlyph(item.verified)}</span>
					<span><strong>{verifyLabel(item)}</strong>{verifySource(item)}</span>
				</p>

				<div class="modal-body">
					{#each DETAIL_SECTIONS as section (section.title)}
						{@const text = sectionText(item.details, section.keys)}
						<section class="spec" class:spec--empty={!text}>
							{@render amenitySvg(section.icon, 'spec-icon')}
							<div>
								<h3>{section.title}</h3>
								<p>{text || 'Brak danych w deklaracji dostępności.'}</p>
							</div>
						</section>
					{/each}
					{#if item.details.notes}
						<section class="spec spec--note">
							<svg viewBox="0 0 24 24" aria-hidden="true" class="spec-icon">
								<circle cx="12" cy="12" r="9" />
								<path d="M12 8v5M12 16.5h.01" />
							</svg>
							<div>
								<h3>Ważne informacje</h3>
								<p>{item.details.notes}</p>
							</div>
						</section>
					{/if}
				</div>

				<footer class="modal-footer">
					<button type="button" class="nav-btn" onclick={() => handleNavigate(item)}>
						<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l18-8-8 18-2-8-8-2z" /></svg>
						Nawiguj
					</button>
				</footer>
			</dialog>
		</div>
	{/if}
</section>

<style>
	.hub {
		display: flex;
		flex-direction: column;
		gap: var(--odstep-duzy);
		color: var(--kolor-tekstu-podstawowego);
	}

	.hub-header h1 {
		margin: 2px 0 var(--odstep-bardzo-maly);
		font-size: 1.75rem;
		font-weight: 800;
		line-height: 1.15;
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

	/* Jednolity, wyrazny fokus tylko przy nawigacji klawiatura */
	button:focus-visible {
		outline: 3px solid var(--kolor-wyroznienia);
		outline-offset: 2px;
	}

	/* Reklama w tym samym ukladzie co karta miejsca; wyroznia ja tylko etykieta i plaskie tlo miniatury */
	.tile--ad .thumb--ad {
		background: var(--kolor-tla-reklamy);
	}

	.tile--ad .thumb--ad .thumb-icon {
		stroke: var(--kolor-reklamy);
	}

	.ad-label {
		display: inline-flex;
		flex-shrink: 0;
		align-items: center;
		gap: 3px;
		padding: 1px 6px;
		border: 1px solid var(--kolor-reklamy);
		border-radius: var(--zaokraglenie-pelne);
		background: var(--kolor-tla-reklamy);
		color: var(--kolor-reklamy);
		font-size: 0.625rem;
		font-weight: 800;
		letter-spacing: 0.04em;
		line-height: 1.4;
		text-transform: uppercase;
	}

	.ad-label svg {
		width: 12px;
		height: 12px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.ad-partner {
		margin: 2px 0 0;
		color: var(--kolor-tekstu-drugorzednego);
		font-size: 0.6875rem;
		font-weight: 600;
	}

	.card-actions.card-actions--single {
		grid-template-columns: 1fr;
	}

	.segmented {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--odstep-bardzo-maly);
		padding: var(--odstep-bardzo-maly);
		background: var(--kolor-tla-elementu-drugorzednego);
		border-radius: var(--zaokraglenie-duze);
	}

	.segmented button {
		min-height: 44px;
		padding: var(--odstep-maly);
		border: none;
		border-radius: var(--zaokraglenie-srednie);
		background: transparent;
		color: var(--kolor-tekstu-drugorzednego);
		font-size: 0.875rem;
		font-weight: 600;
	}

	.segmented button[aria-pressed='true'] {
		background: var(--kolor-tla-karty);
		color: var(--kolor-tekstu-podstawowego);
		box-shadow: var(--cien-panelu-mapy);
	}

	.filters {
		display: flex;
		flex-direction: column;
		gap: var(--odstep-sredni);
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.chip {
		min-height: 40px;
		padding: 0 var(--odstep-sredni);
		border: 1px solid var(--kolor-obramowania);
		border-radius: var(--zaokraglenie-pelne);
		background: var(--kolor-tla-karty);
		color: var(--kolor-tekstu-listy);
		font-size: 0.875rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.chip[aria-pressed='true'] {
		border-color: var(--kolor-wyroznienia);
		background: var(--kolor-wyroznienia);
		color: var(--kolor-tekstu-na-wyroznieniu);
	}

	.switch-row {
		display: flex;
		align-items: center;
		gap: var(--odstep-sredni);
		width: 100%;
		min-height: 52px;
		padding: var(--odstep-sredni) var(--odstep-duzy);
		border: 1px solid var(--kolor-obramowania);
		border-radius: var(--zaokraglenie-duze);
		background: var(--kolor-tla-karty);
		color: var(--kolor-tekstu-podstawowego);
		text-align: left;
	}

	.switch-label {
		flex: 1;
		font-size: 0.9375rem;
		font-weight: 600;
	}

	.shield-icon {
		width: 22px;
		height: 22px;
		flex-shrink: 0;
		fill: none;
		stroke: var(--kolor-wyroznienia);
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.switch-track {
		position: relative;
		width: 46px;
		height: 28px;
		flex-shrink: 0;
		border-radius: var(--zaokraglenie-pelne);
		background: var(--kolor-tla-wylaczonego-przelacznika);
		transition: background 0.2s;
	}

	.switch-thumb {
		position: absolute;
		top: 3px;
		left: 3px;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: var(--kolor-galki-przelacznika);
		box-shadow: var(--cien-znacznika-mapy);
		transition: transform 0.2s;
	}

	.switch-row[aria-checked='true'] .switch-track {
		background: var(--kolor-wyroznienia);
	}

	.switch-row[aria-checked='true'] .switch-thumb {
		transform: translateX(18px);
	}

	.feed {
		display: flex;
		flex-direction: column;
		gap: var(--odstep-sredni);
	}

	.result-count {
		margin: 0;
		color: var(--kolor-tekstu-drugorzednego);
		font-size: 0.8125rem;
	}

	/* Karta: miniatura 96x96 obok tresci, przyciski na calej szerokosci pod spodem */
	.tile {
		display: grid;
		grid-template-columns: 96px minmax(0, 1fr);
		gap: var(--odstep-sredni);
		padding: var(--odstep-sredni);
		border: 1px solid var(--kolor-obramowania);
		border-radius: var(--zaokraglenie-duze);
		background: var(--kolor-tla-karty);
		box-shadow: var(--cien-panelu-mapy);
	}

	.thumb {
		position: relative;
		width: 96px;
		height: 96px;
		overflow: hidden;
		border-radius: var(--zaokraglenie-srednie);
		background: var(--kolor-delikatnego-wyroznienia);
	}

	.thumb img,
	.thumb-fallback {
		width: 100%;
		height: 100%;
	}

	.thumb img {
		object-fit: cover;
	}

	.thumb-fallback {
		display: grid;
		place-items: center;
	}

	.thumb-icon {
		width: 38px;
		height: 38px;
		fill: none;
		stroke: var(--kolor-wyroznienia);
		stroke-width: 1.6;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.card-body {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.card-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 6px;
		margin: 0;
	}

	.card-kind {
		min-width: 0;
		margin: 0;
		overflow: hidden;
		color: var(--kolor-wyroznienia);
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		line-height: 1.3;
		text-overflow: ellipsis;
		text-transform: uppercase;
		white-space: nowrap;
	}

	.title-row {
		display: flex;
		align-items: flex-start;
		gap: 6px;
	}

	/* Nazwa maksymalnie w 2 liniach, zeby karta nie rosla */
	.card-title {
		display: -webkit-box;
		flex: 1;
		overflow: hidden;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		margin: 0;
		font-size: 0.9375rem;
		font-weight: 700;
		line-height: 1.25;
	}

	.card-sub {
		margin: 0;
		overflow: hidden;
		color: var(--kolor-tekstu-drugorzednego);
		font-size: 0.8125rem;
		line-height: 1.3;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.card-sub--wrap {
		white-space: normal;
	}

	.verify {
		position: relative;
		flex-shrink: 0;
	}

	/* Plakietka wieksza niz mikro-chip, ale z obszarem dotyku zblizonym do 32px */
	.verify-badge {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		padding: 0;
		border: 2px solid var(--kolor-tekstu-uwagi);
		border-radius: 50%;
		background: var(--kolor-tla-uwagi);
		color: var(--kolor-tekstu-uwagi);
	}

	.verify-badge--ok {
		border-color: var(--kolor-sukcesu);
		background: var(--kolor-tla-sukcesu);
		color: var(--kolor-sukcesu);
	}

	.verify-badge svg,
	.modal-source-icon svg {
		width: 18px;
		height: 18px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2.4;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.tooltip {
		position: absolute;
		top: calc(100% + 6px);
		right: -4px;
		z-index: 5;
		display: none;
		width: max-content;
		max-width: 220px;
		padding: var(--odstep-maly) var(--odstep-sredni);
		border-radius: var(--zaokraglenie-srednie);
		background: var(--kolor-tekstu-podstawowego);
		color: var(--kolor-tla-karty);
		box-shadow: var(--cien-panelu-mapy);
		font-size: 0.75rem;
		line-height: 1.4;
	}

	.tooltip::before {
		position: absolute;
		top: -5px;
		right: 14px;
		width: 10px;
		height: 10px;
		background: inherit;
		transform: rotate(45deg);
		content: '';
	}

	.tooltip strong {
		display: block;
	}

	.tooltip--open {
		display: block;
	}

	.chip-list {
		display: flex;
		flex-wrap: wrap;
		gap: var(--odstep-bardzo-maly);
		margin: var(--odstep-bardzo-maly) 0 0;
		padding: 0;
		list-style: none;
	}

	.micro-chip {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		padding: 2px 6px;
		border-radius: var(--zaokraglenie-pelne);
		background: var(--kolor-tla-elementu-drugorzednego);
		color: var(--kolor-tekstu-listy);
		font-size: 0.6875rem;
		font-weight: 600;
		line-height: 1.3;
	}

	.micro-chip--more {
		color: var(--kolor-wyroznienia);
	}

	.distance {
		display: inline-flex;
		flex-shrink: 0;
		align-items: center;
		gap: 3px;
		color: var(--kolor-tekstu-podstawowego);
		font-size: 0.75rem;
		font-weight: 700;
		white-space: nowrap;
	}

	.distance svg {
		width: 13px;
		height: 13px;
		fill: none;
		stroke: var(--kolor-wyroznienia);
		stroke-width: 2.2;
	}

	.card-actions {
		display: grid;
		grid-column: 1 / -1;
		grid-template-columns: 1fr 1fr;
		gap: var(--odstep-maly);
	}

	.nav-btn,
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
	}

	.nav-btn {
		border: none;
		background: var(--kolor-wyroznienia);
		color: var(--kolor-tekstu-na-wyroznieniu);
	}

	.details-btn {
		border: 1px solid var(--kolor-obramowania);
		background: var(--kolor-tla-elementu-drugorzednego);
		color: var(--kolor-tekstu-listy);
	}

	.nav-btn svg,
	.details-btn svg {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
		fill: none;
		stroke: currentColor;
		stroke-width: 2.2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.chip-icon {
		width: 12px;
		height: 12px;
		flex-shrink: 0;
		fill: none;
		stroke: var(--kolor-wyroznienia);
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	/* Nakladka liczona wzgledem widoku telefonu - przykrywa tez pasek nawigacji */
	.overlay {
		position: absolute;
		inset: 0;
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		/* Odstep od gory omija wyspe i zaokraglenie ekranu telefonu */
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
		padding: var(--odstep-duzy) var(--odstep-duzy) var(--odstep-maly);
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

	.modal-address {
		margin: 0;
		color: var(--kolor-tekstu-drugorzednego);
		font-size: 0.8125rem;
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
		fill: none;
		stroke: currentColor;
		stroke-width: 2.4;
		stroke-linecap: round;
	}

	.modal-source {
		display: flex;
		align-items: flex-start;
		gap: var(--odstep-maly);
		margin: 0 var(--odstep-duzy) var(--odstep-sredni);
		padding: var(--odstep-maly) var(--odstep-sredni);
		border-radius: var(--zaokraglenie-srednie);
		background: var(--kolor-tla-uwagi);
		color: var(--kolor-tekstu-uwagi);
		font-size: 0.8125rem;
		line-height: 1.35;
	}

	.modal-source--ok {
		background: var(--kolor-tla-sukcesu);
		color: var(--kolor-sukcesu);
	}

	.modal-source strong {
		display: block;
	}

	.modal-source-icon {
		flex-shrink: 0;
		margin-top: 1px;
	}

	.modal-body {
		display: flex;
		flex-direction: column;
		gap: var(--odstep-sredni);
		padding: var(--odstep-bardzo-maly) var(--odstep-duzy) var(--odstep-duzy);
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-width: none;
	}

	.modal-body::-webkit-scrollbar {
		display: none;
	}

	.spec {
		display: flex;
		gap: var(--odstep-sredni);
	}

	.spec h3 {
		margin: 0 0 2px;
		font-size: 0.875rem;
		font-weight: 700;
		line-height: 1.3;
	}

	.spec p {
		margin: 0;
		color: var(--kolor-tekstu-listy);
		font-size: 0.8125rem;
		line-height: 1.45;
	}

	.spec--empty p {
		color: var(--kolor-tekstu-drugorzednego);
		font-style: italic;
	}

	.spec-icon {
		width: 32px;
		height: 32px;
		flex-shrink: 0;
		padding: 6px;
		border-radius: var(--zaokraglenie-srednie);
		background: var(--kolor-delikatnego-wyroznienia);
		fill: none;
		stroke: var(--kolor-wyroznienia);
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.spec--empty .spec-icon {
		background: var(--kolor-tla-elementu-drugorzednego);
		stroke: var(--kolor-tekstu-pomocniczego);
	}

	.spec--note {
		padding: var(--odstep-maly);
		border-radius: var(--zaokraglenie-srednie);
		background: var(--kolor-tla-uwagi);
	}

	.spec--note .spec-icon {
		background: transparent;
		stroke: var(--kolor-tekstu-uwagi);
	}

	.spec--note h3,
	.spec--note p {
		color: var(--kolor-tekstu-uwagi);
	}

	.modal-footer {
		display: grid;
		padding: var(--odstep-sredni) var(--odstep-duzy);
		border-top: 1px solid var(--kolor-obramowania);
	}

	.sk-body {
		gap: var(--odstep-maly);
	}

	.sk-line {
		height: 12px;
	}

	.sk-short {
		width: 45%;
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

	.empty h2 {
		margin: 0;
		font-size: 1.125rem;
	}

	.empty p {
		margin: 0;
		color: var(--kolor-tekstu-drugorzednego);
		font-size: 0.875rem;
		line-height: 1.45;
	}

	.empty-icon {
		width: 44px;
		height: 44px;
		fill: none;
		stroke: var(--kolor-tekstu-pomocniczego);
		stroke-width: 1.8;
		stroke-linecap: round;
	}

	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}

	.sk {
		display: block;
		border-radius: var(--zaokraglenie-male);
		background: var(--kolor-tla-elementu-drugorzednego);
		animation: sk-pulse 1.2s ease-in-out infinite;
	}

	@keyframes sk-pulse {
		50% {
			opacity: 0.5;
		}
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
		.switch-track,
		.switch-thumb {
			transition: none;
		}

		.sk,
		.backdrop,
		.modal {
			animation: none;
		}
	}
</style>
