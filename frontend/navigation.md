# Frontend navigation guide

This guide covers `frontend/` only. Backend and older project folders
outside this directory are not part of this refactor.

## Directory layout

```text
frontend/
  README.md                 Setup, environment variables, chat API contract
  navigation.md             This guide
  package.json              Dependencies, scripts and #lib/* import mapping
  prettier.config.js        Formatting and Tailwind stylesheet location
  tsconfig.json             TypeScript rules
  vite.config.ts            SvelteKit, Tailwind and deployment adapter
  src/
    app.html                HTML document template
    app.d.ts                Application and environment variable types
    routes/
      +layout.svelte        Fonts, shared CSS, restoring/persisting settings
      +page.svelte          Application shell and screen/component wiring
    lib/
      config/
        app.ts              Global app names, description and asset URLs
        api.ts              Backend URLs, environment modes and API paths
        navigation.ts       Tab names, icons, order, URLs and placement flags
        navigation.types.ts Stable tab IDs
      components/
        shell/
          SplashScreen.svelte Intro playback, retry and skip
      features/
        map/
          MapTab.svelte     Trasa screen, map lifecycle and route interactions
          map.config.ts     Map tiles, attribution, bounds and demo coordinates
          components/       Address search, planner, route sheet, obstacle report
          services/         Routes and geocoding HTTP clients/helpers
          types/            Route/GeoJSON and address contracts
          data/             Demo route snapshot
        chat/
          ChatbotTab.svelte Asystent screen, history, examples and question form
          components/       AnimatedReply: stationary word-by-word reply fade
          services/         API client, deterministic FAQ, plain-text formatting
          types/            Chat contracts and browser speech recognition types
        discover/
          DiscoverTab.svelte Odkrywaj screen and facility details
          components/       CardProgramsView: benefits/cards and their details
          types/            Facility and card program contracts
        settings/
          SettingsTab.svelte Ustawienia screen
          state/            Reactive settings, defaults and persistence
          types/            Theme, text size and mobility profile
      state/
        navigation.svelte.ts Cross-feature destination handoff to the map
      styles/
        theme.css           Light/dark/high-contrast design tokens
        brand.css           Logo crop and themed app-title presentation
        base.css            Document reset and base body styling
        shared.css          Shared .card and .tab-content primitives
        tailwind.css        Tailwind and its plugins
      assets/
        archive/KBB/        Retained historical SVG, not used by the app
  static/
    branding/
      logo-light.svg        Active light logo (original export 5.svg)
      favicon.svg           Square crop of logo-light.svg for browser tabs
      logo-dark.svg         Active dark logo (original export 9.svg)
      logo-variants/        Other original logo exports, retained for reference
    media/
      intro/
        intro.mp4           Active muted intro (formerly splashNoSound.mp4)
        archive/            Previous videos, GIF and posters; not fallbacks
    robots.txt              Crawler rules
```

## Where to change what

| Change                                                                 | Source of truth                                                                                                        |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| App name, browser title prefix, tagline, description                   | [`src/lib/config/app.ts`](src/lib/config/app.ts)                                                                       |
| Light/dark logo URLs or intro video URL                                | [`src/lib/config/app.ts`](src/lib/config/app.ts)                                                                       |
| Tab labels, icons and order                                            | [`src/lib/config/navigation.ts`](src/lib/config/navigation.ts)                                                         |
| Default tab, tab URL generation and URL validation                     | [`src/lib/config/navigation.ts`](src/lib/config/navigation.ts)                                                         |
| Whether a tab hides the top brand bar or uses full-bleed content       | `showTopNav` and `fullBleed` in [`navigation.ts`](src/lib/config/navigation.ts)                                        |
| Which component renders a tab                                          | `screens` in [`src/routes/+page.svelte`](src/routes/+page.svelte)                                                      |
| Desktop phone frame, notch, top bar and bottom navigation spacing      | Scoped styles in [`src/routes/+page.svelte`](src/routes/+page.svelte)                                                  |
| Global colors, spacing tokens, fonts, radii, contrast and text scaling | [`src/lib/styles/theme.css`](src/lib/styles/theme.css)                                                                 |
| Logo dimensions/cropping and the blue question mark                    | [`src/lib/styles/brand.css`](src/lib/styles/brand.css)                                                                 |
| Ask bar, assistant icon, example questions and chat layout             | [`src/lib/features/chat/ChatbotTab.svelte`](src/lib/features/chat/ChatbotTab.svelte)                                   |
| Assistant-specific light/dark palette                                  | `--chat-*` scoped tokens in `ChatbotTab.svelte`, high contrast uses global tokens                                      |
| Reply reveal animation                                                 | [`src/lib/features/chat/components/AnimatedReply.svelte`](src/lib/features/chat/components/AnimatedReply.svelte)       |
| Preloaded identity, creator and app-use answers                        | [`src/lib/features/chat/services/faq.ts`](src/lib/features/chat/services/faq.ts)                                       |
| Map search bar and planner layout                                      | [`src/lib/features/map/components/RoutePlannerPanel.svelte`](src/lib/features/map/components/RoutePlannerPanel.svelte) |
| Address suggestions and input behavior                                 | [`src/lib/features/map/components/AddressCombobox.svelte`](src/lib/features/map/components/AddressCombobox.svelte)     |
| Map tile provider, attribution and demo coordinates                    | [`src/lib/features/map/map.config.ts`](src/lib/features/map/map.config.ts)                                             |
| Facility entries and accessibility details                             | `FACILITIES` in [`src/lib/features/discover/DiscoverTab.svelte`](src/lib/features/discover/DiscoverTab.svelte)         |
| Benefit/card entries and official source links                         | `PROGRAMS` in [`CardProgramsView.svelte`](src/lib/features/discover/components/CardProgramsView.svelte)                |
| Saved preferences and compatibility with existing local storage        | [`src/lib/features/settings/state/settings.svelte.ts`](src/lib/features/settings/state/settings.svelte.ts)             |
| Backend URLs and endpoint paths                                        | [`src/lib/config/api.ts`](src/lib/config/api.ts); environment setup in [README.md](README.md)                          |

**Configuration is not styling.** `config/app.ts` holds identity/content and asset
links; `config/navigation.ts` holds logical screen placement. Pixel positions,
responsive layout and visual rules remain in CSS. The shell supplies identity
values to `brand.css` through CSS custom properties, so the title is still rendered
with the existing `appNameLightMode` / `appNameDarkMode` classes.

Feature-specific links belong with that feature: map attribution in `map.config.ts`,
and official card-program sources with their program records. API base URLs are
configured through public `VITE_*` environment variables, never by adding secrets
to frontend source.

## Navigation and data flow

The shell reads `?tab=`, validates it against the navigation registry and falls back
to `map`. Existing IDs remain `map`, `facilities`, `chatbot`, and `settings` to
preserve links. `facilities` now renders `DiscoverTab.svelte`; only the source file
name changed.

All four screens stay mounted when switching tabs, preserving map and chat state.
The shell controls visibility. A facility's navigation action stores a destination
in `state/navigation.svelte.ts` and switches to the map; the map consumes it.

The layout restores settings once on mount, persists later changes and applies
theme/contrast/text-size attributes to the document. The shell chooses its logo
from the same reactive theme.

Generated chat uses **frontend → `/api/chat` → backend verifier → responder
→ grounding check → frontend**. Recognized FAQ answers are local and skip the API.
The backend lives in `../backend/chat/`; `../backend/chat_app.py` runs it independently
of map routing. Ollama and system prompts stay on the backend. Model approval is
not authoritative verification of accessibility facts.

**Nowy czat** remounts only the chat component, clears the history and cancels requests
and dictation. AI settings control reply animation and whether earlier turns are
sent as context. The model-improvement preference is stored locally only, it does
not collect conversations or train a model.

During development, `vite.config.ts` proxies `/api/chat` to port 8001 by default.
`CHAT_PROXY_TARGET` changes that destination. Production needs a reverse proxy or
an explicit `VITE_CHAT_API_URL`; see [README.md](README.md).

## Import and naming conventions

- Screen components live directly inside their feature and end in `Tab.svelte`.
- Supporting UI stays in that feature's `components/` directory.
- HTTP clients and reusable domain helpers go in feature `services/`.
- Domain contracts go in feature `types/`; sample fixtures go in feature `data/`.
- Use relative imports within a feature and `#lib/` for shared/cross-feature imports.
  Include the full extension for `#lib/` imports, for example
  `#lib/config/app.ts` or `#lib/state/navigation.svelte.ts`: this project uses
  package import mappings, not an extension-resolving TypeScript alias.
- Use PascalCase for Svelte components and descriptive names for modules.
- Do not put all components in a single global directory. Shared `components/`
  is for application-wide UI, such as the splash screen.
- Keep SvelteKit's special `src/routes/+page.svelte`, `+layout.svelte`, `app.html`
  and `app.d.ts` filenames unchanged.
- Explanatory source comments use Polish with ASCII spelling, without
  sentence-ending periods, commas are allowed. Keep technical syntax such as
  `@type`, `svelte-ignore`, URLs and file extensions intact. This rule does not
  apply to user-facing copy, documentation or runtime AI prompts.

Files in `static/` are served directly: `static/branding/logo-light.svg` becomes
`/branding/logo-light.svg`. Bundled files in `src/lib/assets/` are imported by code.
Historical assets are retained in archive/variant folders, not silently deleted.

## Development commands

Run commands from the frontend directory:

```bash
npm run dev
npm run check
npm run lint
npm run build
```

`node_modules/`, `.svelte-kit/` and build output are generated. They are not source
directories and must not be manually edited or committed. When moving the Tailwind
entry stylesheet, also update `tailwindStylesheet` in `prettier.config.js`.
