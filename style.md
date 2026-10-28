# Psyykkeri style guide

Single source of styling: `src/styles.css`. The React app imports it, and the static component files in `design/` link to it. Do not add per-file styles; add or change rules in `src/styles.css` and update this guide in the same change.

## Brand

- **Name:** Psyykkeri. The name is the same in every UI language.
- **Font:** [Cabin](https://fonts.google.com/specimen/Cabin), weights 400/500/600/700, loaded via `@import` at the top of `src/styles.css`. Fallback: `system-ui`.
- **Wordmark:** "Psyykkeri" set in The Seasons Bold, `--green-dark`, centred in the top bar. The Seasons is a licensed font and is not committed. An installed copy is used, otherwise `public/fonts/the-seasons-bold.woff2` (or `.otf`) once added (see README.md). Until then the wordmark falls back to Georgia/serif. Everything else stays in Cabin.
- **Logo:** the doctor cat (`public/logo/doctorcat.png`, transparent background) sits left of the wordmark (`.brand-logo`). It is 3.4rem tall, and negative margins trim the file's empty margins so the top bar keeps its height. It is decorative (`alt=""`), because the name stands next to it.

## Colour

| Token | Value | Use |
|---|---|---|
| `--green-light` | `#89CABC` | Rank squares, tag borders, hover borders, done steps and phrases on dark green |
| `--green` | `#008D70` | Accent lines (top bar, card left edge, dialog top), focus rings, active map pin, primary-button hover |
| `--green-dark` | `#015742` | Primary buttons, patient banner, processing panel, map pins, wordmark, all green **text** |
| `--tint` | `#E8F5F1` | Light backgrounds: matched tags, suggested filters, identity box, contact box, table row hover |
| `--bg` / `--surface` | `#F5F8F7` / `#FFFFFF` | Page / panels |
| `--text` / `--muted` | `#1A2A26` / `#52645F` | Body text / secondary text |
| `--border` | `#D3E2DD` | All 1px borders |
| `--danger` / `--danger-bg` | `#B42318` / `#FDECEA` | Errors, non-disclosure (turvakielto), full groups |
| network grey | `#7D8A86` | Map only: the patient's care contacts and the lines between them. Kept grey so groups stay the green focus |

**Contrast rule:** `#008D70` on white is about 4.2:1, which fails WCAG AA for normal-size text. Use it for lines, fills and large or decorative elements only. Green text and white-on-green buttons use `#015742` (about 8.6:1). `#015742` on `#89CABC` is about 4.6:1, which is fine for the bold rank number.

## Depth: the Windows 7 / OS X feel

Depth comes from light, never from decoration. Raised surfaces are slightly lit from above; editable fields are slightly recessed. Gradients stay within a few percent of brightness. No gloss, reflections, textures or rounded "candy" shapes.

| Token / element | Use |
|---|---|
| `--shadow-raised` | Panels, cards, filters, map panel: a faint 1px edge plus a soft, wide shadow |
| `--shadow-window` | Dialogs |
| `--shadow-inset` | Inputs and selects: a 1px inner top shadow ("type here") |
| `--highlight` | 1px white inner top line on raised fills (buttons, banner, rank squares, pins) |
| `--chrome-top` → `--chrome-bottom` | Window chrome gradient: dialog title bars and the status bar |
| Buttons | Vertical gradient from `--btn-top` (86% fill + white) to `--btn-bg`; the border layer darkens towards the bottom; pressed (`:active`) flips the gradient and adds an inner shadow |
| Top bar | Frosted glass: 78% white with `backdrop-filter: blur(14px)`, sticky |
| Dialog backdrop | Dimmed green with a 3px blur |
| Selection | Table row hover and the active card use a soft green gradient instead of a flat tint |

## Shape and layout

- **Boxes are rectangular:** `border-radius: 0` globally. The only exception is the small loading spinner inside buttons.
- **Buttons have a straight left edge and a slanted right edge:** `|Varaa paikka/`. The slant width is `--slant` (0.55rem).
  - The shape is drawn by two clipped pseudo-elements (`::before` for the border, `::after` for the fill) that follow `--shape`. Buttons set colours through `--btn-bg`, `--btn-border` and `--btn-fg`, never through `background` directly.
  - **Joined groups** (`.lang-switch`): the first segment is the same trapezoid, and each following segment is a parallelogram nested into the previous slant: `|FI/ /SV/ /EN/`.
  - **Text-only buttons** (`.link`, `.tag-remove`) have no shape.
  - Links that act as buttons use `class="button primary"`.
- Panels: white, 1px `--border`, 1.5rem padding.
- Accent edges: 3px `--green` bottom border on the top bar and top border on dialogs, 4px `--green` left border on group cards. The active (hovered or map-selected) card gets a `--green-light` outline.
- Content column max width 960px (`.content`). The results page uses `.content.wide` (1280px): `.results-main` (topics, filters, cards) on the left and the sticky map on the right, both starting right under the patient banner. 1rem side gutter.
- The top bar (`--topbar-h`) is sticky and the status bar (`--statusbar-h`) is fixed; the map panel's height is derived from both so it always fits the window. On short landscape screens (height ≤ 500px, phones on their side) both bars scroll with the page instead, so they don't take a quarter of the height.
- **Responsive layout:**
  - Up to 720px wide, the top bar shows a menu button, the logo and the wordmark. The controls move into a panel under the bar (see Top bar).
  - Single column: list and map stack, map first, in portrait up to 900px wide and in any orientation up to 560px. Landscape keeps them side by side, and the results map is never taller than the window.
  - Up to 640px wide, cards stack their seats and button under the text, filters wrap two per row and the search button goes under the input.
  - Dialogs use the dynamic viewport height (`100dvh`), so the phone's browser bars don't hide their buttons. No page may scroll sideways at 360px.
- Top bar layout, three columns: left the "Etusivu" button (signed in only; returns to the screen right after login) and the data source switch, centre the wordmark "Psyykkeri" alone (the organisation name lives in the status bar), right the language switch and sign out.
- Spacing: cards are 1.5rem apart with 1.5rem padding.
- Checkboxes and radios use the native control with `accent-color: --green-dark`. A checkbox row is `label.check` (box left, text wrapping beside it).

## Content rules

- **No emojis or pictograms** in the UI. Use text labels. The exceptions are the brand logo in the top bar, the menu button on narrow screens (three bars, labelled for screen readers), and map markers and the map legend, which use the line icons in `src/views/mapIcons.ts` (home, health centre, mental health services, hospital, social work, school, student health care): 16×16, 1.5px strokes in `currentColor`, no fills.
- **No hashtag notation.** Topics are shown as plain words with an initial capital (Yksinäisyys, Krooninen kipu). The `#` ids exist only in data and the extraction prompt.
- **No explanatory subtitles** that repeat what the screen already shows (result counts, "update instantly" hints, data source lines, eyebrow labels above dialog titles). Keep notices with legal or safety meaning (the access log notice, identity confirmation).
- **Distances:** number and unit only (`17 km`). Remote groups say "Etäryhmä".
- **Languages:** Finnish (default), Swedish, English. Dates, times and fees are formatted per locale (`fi-FI`, `sv-FI`, `en-GB`), and municipalities use their Swedish names in Swedish (`placeName`; every municipality in the data needs one). The chosen language is remembered in the browser (`localStorage`, Finnish if storage is blocked). No language may leak into another (see below).
- **Explanations go in tooltips:** extracted topics and suggested filters show their evidence sentence in a `title` tooltip, not as visible text.

## Language rule: no leaks between languages

**Must come from `src/i18n.ts`, in all three languages:** every string the app itself writes, whether visible or announced. That covers:
- JSX text, button labels and `<option>` texts;
- `aria-label`, `title` and `placeholder` attributes, including tooltips built from evidence;
- MapLibre's own control texts (`t.map.controls`, passed as the map `locale`);
- codes the UI words: professional titles (`t.titles`), listing kinds (`t.kinds`), derived evidence such as the age (`ageEvidence`), enrolment states and criteria.

Data must not carry UI wording. Store a key or a value (`{ age: 68 }`, `title: 'psychologist'`, `kind: 'peerGroup'`) and let the view word it with `t`. Remote services leave address and municipality empty; the format makes the UI say "Etäryhmä".

**Stays as written:** text that organisers or records publish. That means group names, organisers, addresses, the organisers' own method names and criteria notes, contact names and roles, and patient record texts. Proper nouns (Psyykkeri, Terapianavigaattori, OpenStreetMap) and language codes (FI / SV) are the same in every language.

**Enforced by:**
1. **Types.** `sv` and `en` are typed as `Dict = typeof fi`, so a key missing from any language fails `tsc`.
2. **`src/lib/i18n.test.ts`,** run by `npm test`. It fails on words written directly between JSX tags and on words in quoted `aria-label`, `title`, `placeholder` or `alt` attributes in `src/**/*.tsx`. It also checks that all three dictionaries have the same keys and that every municipality in the data has a Swedish name. Write `{t.x}` instead; a sample rank letter uses `rankLabel(0)`.
3. **A sweep before release,** `npm run sweep` with `npm run dev` running (first time: `npx playwright install chromium`). It signs in as each role in FI, SV and EN, goes from login to the booking dialog, and lists text that the Finnish run also shows and that is neither listing or record data nor in that language's dictionary. It exits non-zero on a leak. By hand, the same means: switch the running app to SV and then EN and go through every screen and dialog. Collect the text nodes plus `aria-label`, `title` and `placeholder` values, and compare them with the dictionaries. Anything that is neither in that language's dictionary nor listing or record data is a leak. The static checks can't see strings built in `.ts` files, so the sweep is what catches those.

## Screens and components

### Top bar

Wide screens: home button left (`.topbar-left`), logo and wordmark centred (`.brand`), language switch and logout right (`.topbar-right`). The two control groups sit in a wrapper (`.topbar-menu`) that is `display: contents` here, so they take the bar's outer grid columns.

Up to 720px wide, a square menu button (`.menu-toggle`, three 2px bars in `--green-dark`, `aria-expanded`, labelled "Avaa valikko"/"Sulje valikko") takes the left column, and the wordmark stays centred. The wrapper opens as a panel under the bar (`.menu-open .topbar-menu`): white, a 3px `--green` bottom border and the window shadow. Its first row is the full-width home button; the second has the language switch on the left and logout on the right. Choosing anything, pressing Escape or clicking outside closes it; Escape returns focus to the menu button. Before login the panel holds only the language switch.

### Login

Three joined role boxes (`.role-choice`, `.role-option`): Potilas, Toisen puolesta, Ammattilainen, with no subtitles. The chosen one is filled dark green. Below: the "Vahva tunnistautuminen" button, for show only (it answers with a hint), then "tai" and the username form. No demo-account hint.
- Patients see only themselves and proxies only the persons they act for (`src/lib/auth.ts`); neither gets the patient search.

### Access dialog and data sources

Opening a record (professional) reveals one stage at a time, so the dialog starts short:
1. **Consent and basis.** At first the dialog shows only the identity, a checkbox acknowledging that access is logged (`.acknowledge`, tinted box), and the access basis select (greyed until the box is checked).
2. **Registers (mandatory)**, once a basis is chosen (`DataSources.tsx`, `section.sources`): "Kaikki rekisterit" with one sub-checkbox per register that holds entries for this patient, each with its entry count. At least one is required; Kanta starts unchecked and says it needs the patient's consent.
3. **Optional extras** (`section.sources.optional`): a dashed, lighter box titled "Valinnaiset lisätiedot", each field tagged `.optional-tag` "valinnainen":
   - own description, chat style: a prompt bubble (`.chat-prompt`) above an empty textarea (`.chat-input`) whose grey placeholder ("Potilas on…") disappears when typing.
   - navigator code (`.navigator-row`): Terapianavigaattori or Interventionavigaattori (chosen by age), the 8-digit code, and links to terapianavigaattori.fi and interventionavigaattori.fi.
A `.summary` box lists exactly what the search will use and states the purpose. Patients and proxies get stages 2–3 on a page (`.self-service`).

### Patient search

One field with no title or label text (the label is visually hidden). Name parts, the identity code and the date of birth (DDMMYY) can be given in any order and any subset; name parts match from the start, ignoring case and accents. A full identity code is enough alone; otherwise at least two pieces are needed, so one name cannot browse the register.

### Processing

A dark green panel (`.processing`) with animated white strings (`.waves`, drawn by `src/lib/waves.ts`), the two main steps, and a rotating process phrase (`.phrase`, a new one every 650 ms, with a fade-in). Phrases are per step and per language in `i18n.ts` (`phrases`). With `prefers-reduced-motion`, the strings are drawn once and phrases appear without animation. Only the steps are announced to screen readers.

### Filters

`.filters` bar above the results: start, time of day, session type and gender as selects; cost and distance as two-handle sliders (`.range-filter`, `.range`) like in online stores, with the chosen span drawn on the track and the value in an `output` (`0–25 km`, `Kaikki`). The minimum starts at 0; the right end of the scale means no upper limit. The cost scale ends at the highest fee among the current listings (`feeScale`), and the slider is hidden when every listing is free; distance moves in 1 km steps. Session type "Paikan päällä" and "Etänä" both include hybrid services. Slider handles are small rectangles. Filters guessed from the patient record (`guessFilters` in `src/lib/filters.ts`) are marked `.suggested` (green label, tinted select) while they keep the guessed value; the tooltip names the evidence. "Clear filters" appears only when any filter is active.

### Treatment browser

The home page after login (`.content.wide.home`) has the patient search (professionals) or the own-data panel (patients, proxies) on top. The search is the focus. The hero (`.home-hero`) fills the first screen, using `100svh` so phone browser bars don't push it off. Its rows are 2fr / 1fr / auto: the search panel is centred in the upper two thirds, at about a third of the height, and the browse button sits at the bottom, just above the status bar. The search panel (`.search-panel`) has a taller input and button.
- **Browse button:** "Selaa hoitoja vapaasti" (`button.primary.browse-button`) has the same green and sheen as Hae, and the same face, size and weight as the text in the search field (Cabin 400, 1.1rem).
- **Browser:** "Selaa hoitoja vapaasti" (`.browser`) is always rendered, starting just below the first screen after the 2.5rem gap, so it is out of sight until scrolled to.
- **On press:** the button scrolls the page there (it jumps with reduced motion; `scroll-margin-top` clears the sticky top bar) and moves focus to the browser's heading.

A panel taller than the screen, such as the patients' own-data panel, simply grows. It browses every listing without personal details: there is no reference point, so there are no distances, no distance filter and no fit.
- Layout (`.browser-layout`): the listings take the left two thirds (`.browser-main`); the square map (`.map-panel`, not sticky here) and "Uudet hoidot" (`.news`) share the right third. Below 900px wide, the order is map, news, listings.
- The filter bar is the same `FilterBar` with `location={false}`, which hides the distance slider. "Järjestys" comes first: A–Ö (default), Ö–A, cheapest, most expensive (`src/lib/sort.ts`; the distance orders need a reference point). Unknown fees go last in either direction.
- The cards are the same `GroupCard` with `location={false}`, and their letters match the map pins. Every site of a multi-site service is listed, since none is nearest.
- News (`.news`) is a single card with a bulleted list (`.news-list`): the name as a link button (`.news-title`) that opens the information dialog, with "address, organiser" (`.news-meta`) under it. A service appears once. Three items are shown; "Näytä lisää" (`button.secondary.wide`) shows ten.
- The map shows only the pins: no home, no distance rings and no care network. It shows every listing and does not zoom in.
- "Lisätietoja" opens the same information dialog without distance. Seats can't be reserved from it, because there is no patient; a hint says seats are booked from the search results.

### Group card

`GroupCard` is used on the results page and in the browser. The title, organiser and facts are on the left; the seats and "Lisätietoja" are on the right. The tags run across the full card width below both. The letter (`.card-rank`) sits in the bottom right corner, and the tags keep room for it. Below 640px, seats and button go under the text. The `location` switch is on for the results page, where the facts include the distance from home. In the browser it is off: no distance, only "Etäryhmä" for remote listings.

### Map

MapLibre GL, set up in `src/lib/basemap.ts`. The basemap is the offline Protomaps extract when `public/maps/uusimaa.pmtiles` is present, otherwise OpenFreeMap's online vector tiles (see README.md). Both are recoloured towards the palette (mint water, green-grey land and parks): the Protomaps "light" flavour offline, and OpenFreeMap "positron" online with the same colours swapped in. Map labels follow the UI language. The map is square and sits sticky to the right of the cards (`.results-layout`, `.map-panel`). Below 900px wide, it moves above the cards. "Suurenna kartta" (`.map-expand`) opens it as a window over the page (`.map.expanded` with a `.map-backdrop`); Escape or the backdrop closes it. A small legend (`.map-legend`) sits bottom left.
- Opening animation: the map first shows every matching treatment, then zooms in to a 15 km radius around the patient's home.
- The distance filter is drawn as a donut: dashed circles at the minimum and maximum distance, with the band between them tinted. Without an upper limit only the inner circle is drawn.
- Results are labelled with letters, the same on cards and pins: A–Z, then AA–ZZ (`src/lib/rank.ts`). Rank squares and pins widen for two letters.
- Care network: the patient's current care contacts (health centre, school, social work, hospital) are white squares with a grey line icon (`.map-contact`, `.map-contact-icon`); home is the dark-green-bordered box with a house icon and "Koti". The legend lists the icons present. Home and every contact are joined by straight grey lines. Contact labels appear from zoom 11 or on hover, so they don't overlap. If the map file is missing, a red notice says so instead of showing a blank panel.
- Pins (`.map-pin`) are dark green squares carrying the card's rank. Full groups are grey; the active pin is `--green`, enlarged, with a `--green-light` outline.
- Pins are MapLibre markers, which MapLibre positions with `transform`. Pin states must change size, never `transform`.
- Home (`.map-home`) is a white box with a dark green border, anchored just below the point so it doesn't hide a pin at the same place.
- **Patients with a non-disclosure order (turvakielto) get no home marker, no circle and no care network**, except when the patients themselves are signed in.
- Hovering a card highlights its pin, and clicking a pin scrolls to its card. Coordinates are WGS84.

### Real listings

The app shows only the real services (`src/data/listings.ts`). The synthetic groups in `src/data/groups.ts` are test fixtures. Real listings often lack seat counts, start dates or prices. Cards then show the organiser's enrolment status ("Ryhmä käynnissä", "Täynnä", "Lähetteellä"), the free-text schedule, or "Hinta ei tiedossa"; unknown values never filter a listing out.

### Dialogs

Every dialog is a window (`Modal.tsx`): a `.titlebar` with the title and a text-only close `×`, then `.modal-body`. Escape and clicking the backdrop also close it.

### Status bar

`.statusbar`, fixed to the bottom on every screen, 2.25rem tall with 0.9rem text: the organisation name ("Länsi-Uudenmaan hyvinvointialue"), then once signed in a small green light with "Yhdistetty: LUVN", the last sync time, and the signed-in user. Segments are separated by grooves (a border plus a white line). Up to 720px wide only the organisation (shortened with an ellipsis) and the connection show, on one line. The user's name appears only here, not in the top bar.

### Information dialog

Opened from a card's "Lisätietoja" button. `.modal.wide` with group details (`.details`), the inclusion criteria (`.criteria`: referral, age, residence, excluding topics, organiser notes; for real services the referral flag and the target group text, or a note to check with the organiser), the contact person (`.contact`), and actions that depend on the listing's `booking.type`:
- **contact:** Close.
- **external:** Close, plus a link button to the organiser's booking system.
- **integrated:** Cancel and Confirm. On success, a `.success` box shows the reference.

### Component files

Each component has a static reference file in `design/` (open `design/index.html` for the list). The React views in `src/views/` are the source of truth for behaviour; the HTML files are the visual spec and must use the same class names. `processing.html` and `map.html` (with `map.ts`) import from `src/` and work only when served by `npm run dev`.

| File | React source | Key classes |
|---|---|---|
| `topbar.html` | `src/views/TopBar.tsx` | `.topbar`, `.menu-toggle`, `.menu-bars`, `.topbar-menu`, `.topbar-left`, `.home-button`, `.brand`, `.brand-logo`, `.lang-switch`, `.segment` |
| `login.html` | `src/views/Login.tsx` | `.login`, `.role-choice`, `.role-option`, `.strong-auth`, `.divider` |
| `patient-search.html` | `src/views/PatientSearch.tsx` | `.search-row`, `.results-table` |
| `access-dialog.html` | `src/views/PatientSearch.tsx`, `DataSources.tsx`, `Modal.tsx` | `.modal`, `.titlebar`, `.modal-body`, `.identity`, `.acknowledge`, `.sources`, `.sub-checks`, `.chat-prompt`, `.chat-input`, `.navigator-row`, `.summary` |
| `patient-banner.html` | `src/views/PatientBanner.tsx` | `.patient-banner` |
| `processing.html` | `src/views/Processing.tsx` | `.processing`, `.waves`, `.steps`, `.step-icon`, `.phrase` |
| `topic-list.html` | `src/views/Results.tsx` | `.tags.editable`, `.tag.matched`, `.tag-remove` |
| `filters.html` | `src/views/FilterBar.tsx` | `.filters`, `label.suggested`, `.range-filter`, `.range` |
| `group-card.html` (LOCATION on and off) | `src/views/GroupCard.tsx` | `.card`, `.card.active`, `.card.full`, `.card-rank`, `.seats` |
| `treatment-browser.html` | `src/views/TreatmentBrowser.tsx` | `.home`, `.home-hero`, `.search-panel`, `.browse-button`, `.browser`, `.browser-layout`, `.browser-main`, `.news`, `.news-list`, `.news-title`, `.news-meta` |
| `map.html` | `src/views/GroupMap.tsx`, `src/lib/basemap.ts` | `.results-layout`, `.map-panel`, `.map`, `.map-canvas`, `.map-pin`, `.map-home`, `.map-contact`, `.map-expand`, `.map-legend` |
| `booking-dialog.html` | `src/views/BookingDialog.tsx` | `.modal.wide`, `.details`, `.criteria`, `.contact`, `.success`, `a.button` |
| `statusbar.html` | `src/views/StatusBar.tsx` | `.statusbar`, `.status-light` |

## Buttons

- `.primary`: `--green-dark` fill with white text, hover `--green`. One per view region.
- `.secondary`: white-to-pale-green gradient with a `#C5D6D0` outline, hover border `--green-light`.
- `.segment`: language switch segments; the active one is filled `--green-dark`. Their light is a quarter softer than on other buttons: a smaller top-to-bottom fade and a dimmer highlight line.
- `.link`: text-only, `--green-dark`.
- Focus: the shape's border turns `--green` (`--green-light` on primary buttons) and thickens to 2px.
