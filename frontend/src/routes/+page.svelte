<script lang="ts">
  type Tab = 'map' | 'help' | 'chatbot' | 'facilities';

  let activeTab = $state<Tab>('map');
  let selectedProfile = $state('Wózek manualny');

  // Konfiguracja dolnego paska nawigacji
  const navItems: { id: Tab; label: string; icon: string }[] = [
    { id: 'map', label: 'Trasa', icon: 'M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2V5z' },
    { id: 'help', label: 'Tłumacz', icon: 'M8 13V6a1.5 1.5 0 013 0v6M11 4a1.5 1.5 0 013 0v8M14 6a1.5 1.5 0 013 0v7' },
    { id: 'chatbot', label: 'Chatbot', icon: 'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3z' },
    { id: 'facilities', label: 'Miejsca', icon: 'M20 5a5 5 0 00-8 2 5 5 0 00-8-2c-5 5 8 15 8 15s17-10 8-15z' }
  ];

  function setTab(tab: Tab) {
    activeTab = tab;
  }
</script>

<main class="presentation">
  <aside class="desktop-side-panel">
    <div class="brand-title">kraków<span class="dot">.</span></div>
    <h1>Kraków Dostępny</h1>
    <p>Mobilny panel miejski wspierający dostępność i poruszanie się po mieście bez barier architektonicznych.</p>
    <div class="badge">Wersja testowa PWA</div>
  </aside>

  <div class="mobile-viewport">
    
    <header class="status-bar">
      <span>12:47</span>
      <div class="island"></div>
      <div class="indicators">
        <span class="sig">●●●</span>
        <span>T-Mobile</span>
        <span>84%</span>
      </div>
    </header>

    <section class="top-nav">
      <div class="brand">
        <svg viewBox="0 0 24 24" class="logo-icon" fill="currentColor">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/>
        </svg>
        <div>
          <span class="name">Kraków <strong>Dostępny</strong></span>
          <small>Profil: {selectedProfile}</small>
        </div>
      </div>
      <button class="icon-btn" aria-label="Ustawienia">Ustawienia</button>
    </section>

    <section class="screen-body">
      {#if activeTab === 'map'}
        <div class="card alert-card">
          <div class="card-icon" aria-hidden="true">!</div>
          <div>
            <strong>Awaria windy: Rondo Mogilskie</strong>
            <p>Trasa automatycznie omija przejście podziemne.</p>
          </div>
        </div>

        <div class="map-placeholder">
          <div class="route-info">
            <span class="step-badge">Za 40 m</span>
            <strong>Skręć w ul. Floriańską</strong>
            <small>Nawierzchnia: płyty granitowe, brak krawężników</small>
          </div>
        </div>

        <div class="card">
          <strong>Cel: Sukiennice, Rynek Główny</strong>
          <p>Dystans: 450 m · Szacowany czas: 6 min</p>
        </div>

      {:else if activeTab === 'help'}
        <div class="card">
          <h2>Tłumacz PJM na żywo</h2>
          <p>Połącz się z miejskim wideotłumaczem języka migowego online.</p>
          <button class="action-btn">Rozpocznij połączenie</button>
        </div>

      {:else if activeTab === 'chatbot'}
        <div class="card">
          <h2>Asystent Dostępności</h2>
          <p>Zadaj pytanie o dostępne wejścia, windy i zniżki MPK.</p>
          <div class="chat-mock">
            <div class="bubble bot">Dzień dobry! W czym mogę dziś pomóc?</div>
          </div>
        </div>

      {:else if activeTab === 'facilities'}
        <div class="card">
          <h2>Miejsca i udogodnienia</h2>
          <p>Zweryfikowane punkty na mapie Krakowa.</p>
          <ul class="facility-list">
            <li>Muzeum Narodowe (Pochylnia &lt; 5%)</li>
            <li>Teatr Bagatela (Pętla indukcyjna)</li>
            <li>Urząd Miasta Krakowa (Tłumacz PJM)</li>
          </ul>
        </div>
      {/if}
    </section>

    <nav class="bottom-bar">
      {#each navItems as item}
        <button 
          class="nav-tab" 
          class:active={activeTab === item.id}
          onclick={() => setTab(item.id)}
        >
          <svg viewBox="0 0 24 24" class="tab-icon" fill="none" stroke="currentColor" stroke-width="2">
            <path d={item.icon} stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span>{item.label}</span>
        </button>
      {/each}
    </nav>

  </div>
</main>

<style>
  :global(*) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: var(--font-family-sans);
  }

  :global(body) {
    background-color: var(--color-black);
  }

  .presentation {
    width: 100vw;
    height: 100dvh;
    display: flex;
    overflow: hidden;
    background: var(--color-background-dark);
  }

  .desktop-side-panel {
    display: none; /* Ukryte na telefonach */
  }

  .mobile-viewport {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--color-background);
    position: relative;
    overflow: hidden;
  }

  /* Status Bar */
  .status-bar {
    height: 44px;
    padding: 0 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    font-weight: 600;
  }

  .island {
    width: 90px;
    height: 22px;
    background: var(--color-black);
    border-radius: 12px;
  }

  .indicators {
    display: flex;
    gap: 6px;
    font-size: 11px;
  }

  /* Górny pasek aplikacji */
  .top-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .logo-icon {
    width: 28px;
    height: 28px;
    fill: var(--color-primary);
  }

  .name {
    display: block;
    font-size: 15px;
  }

  .brand small {
    display: block;
    font-size: 11px;
    color: var(--color-text-muted);
  }

  .icon-btn {
    border: none;
    background: none;
    font-size: 18px;
    cursor: pointer;
  }

  /* Główny kontener treści */
  .screen-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .card {
    background: var(--color-surface);
    padding: 14px;
    border-radius: var(--radius-large);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-card);
  }

  .alert-card {
    display: flex;
    gap: 12px;
    background: var(--color-danger-background);
    border-color: var(--color-danger-border);
    color: var(--color-danger-text);
  }

  .map-placeholder {
    height: 240px;
    background: var(--color-border);
    border-radius: var(--radius-large);
    display: flex;
    align-items: flex-end;
    padding: 12px;
    position: relative;
  }

  .route-info {
    background: var(--color-surface-overlay);
    padding: 12px;
    border-radius: 12px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .step-badge {
    align-self: flex-start;
    font-size: 11px;
    background: var(--color-primary);
    color: var(--color-primary-contrast);
    padding: 2px 6px;
    border-radius: var(--radius-small);
    font-weight: 600;
  }

  .action-btn {
    margin-top: 10px;
    width: 100%;
    padding: 12px;
    background: var(--color-primary);
    color: var(--color-primary-contrast);
    border: none;
    border-radius: var(--radius-medium);
    font-weight: 600;
    cursor: pointer;
  }

  .chat-mock .bubble {
    background: var(--color-surface-muted);
    padding: 10px 14px;
    border-radius: 14px;
    font-size: 14px;
    margin-top: 8px;
    display: inline-block;
  }

  .facility-list {
    margin-top: 8px;
    padding-left: 18px;
    font-size: 14px;
    color: var(--color-text-strong);
    line-height: 1.6;
  }

  /* Pasek nawigacyjny na dole */
  .bottom-bar {
    height: 64px;
    background: var(--color-surface);
    border-top: 1px solid var(--color-border);
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  .nav-tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    border: none;
    background: none;
    color: var(--color-text-subtle);
    font-size: 11px;
    cursor: pointer;
  }

  .nav-tab.active {
    color: var(--color-primary);
    font-weight: 600;
  }

  .tab-icon {
    width: 22px;
    height: 22px;
  }


  @media (min-width: 600px) {
    .presentation {
      justify-content: center;
      align-items: center;
      gap: 50px;
      padding: 30px;
      background: radial-gradient(
        circle at 10% 20%,
        var(--color-surface-dark) 0%,
        var(--color-background-dark) 90%
      );
    }

    /* Pokaż boczny opis makiety */
    .desktop-side-panel {
      display: flex;
      flex-direction: column;
      max-width: 320px;
      color: var(--color-primary-contrast);
      gap: 12px;
    }

    .brand-title {
      font-size: 32px;
      font-weight: 800;
    }

    .brand-title .dot {
      color: var(--color-primary);
    }

    .desktop-side-panel p {
      color: var(--color-text-subtle);
      font-size: 14px;
      line-height: 1.5;
    }

    .badge {
      align-self: flex-start;
      background: var(--color-primary-soft);
      color: var(--color-info-text);
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
    }

    .mobile-viewport {
      width: 390px;
      height: 844px; /* format moejgo telefonu: iPhone 13/14 */
      border-radius: 44px;
      box-shadow: 
        0 25px 60px -15px var(--color-shadow-device),
        0 0 0 10px var(--color-surface-dark),
        0 0 0 12px var(--color-text-strong);
    }
  }
</style>