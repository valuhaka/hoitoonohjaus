# Psyykkeri style guide

Single source of styling: `src/styles.css`. The React app imports it, and the static component files in `design/` link to it. Do not add per-file styles; add or change rules in `src/styles.css` and update this guide in the same change.

## Brand

- **Name:** Psyykkeri. The name is the same in every UI language.
- **Font:** [Cabin](https://fonts.google.com/specimen/Cabin), weights 400/500/600/700, loaded via `@import` at the top of `src/styles.css`. Fallback: `system-ui`.
- **Wordmark:** "Psyykkeri" set in Cabin 700, `--green-dark`. No logo mark yet.

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
| `--warning` / `--warning-bg` | `#7A5600` / `#FFF4D6` | Data source switch while it shows synthetic data |
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
- The top bar (`--topbar-h`) is sticky and the status bar (`--statusbar-h`) is fixed; the map panel's height is derived from both so it always fits the window.
- Spacing: cards are 1.5rem apart with 1.5rem padding.
- Checkboxes and radios use the native control with `accent-color: --green-dark`. A checkbox row is `label.check` (box left, text wrapping beside it).

## Content rules

- **No emojis or pictograms** in the UI. Use text labels.
- **No hashtag notation.** Topics are shown as plain words with an initial capital (Yksinäisyys, Krooninen kipu). The `#` ids exist only in data and the extraction prompt.
- **No explanatory subtitles** that repeat what the screen already shows (result counts, "update instantly" hints, data source lines, eyebrow labels above dialog titles). Keep notices with legal or safety meaning (the access log notice, identity confirmation).
- **Distances:** number and unit only (`17 km`). Remote groups say "Etäryhmä".
- **Languages:** Finnish (default), Swedish, English. All strings live in `src/i18n.ts`; dates, times and fees are formatted per locale (`fi-FI`, `sv-FI`, `en-GB`). Group names and methods are listing data and stay in the language the organiser wrote them in.
- **Explanations go in tooltips:** extracted topics and suggested filters show their evidence sentence in a `title` tooltip, not as visible text.

## Screens and components

### Login

Three joined role boxes (`.role-choice`, `.role-option`): Potilas, Toisen puolesta, Ammattilainen. The chosen one is filled dark green. Below: the strong authentication button (`.strong-auth`, a primary button with the method on a second line: Suomi.fi for citizens, the professional card for professionals). It is for show only and answers with a hint. Then "tai" and the username form, with the demo account as a hint.
- Patients see only themselves and proxies only the persons they act for (`src/lib/auth.ts`); neither gets the patient search.

### Access dialog and data sources

Opening a record (professional) is three explicit steps in one dialog:
1. A checkbox acknowledging that access is logged (`.acknowledge`, tinted box).
2. The access basis select, disabled and greyed until step 1 is checked.
3. The data sources (`DataSources.tsx`, `fieldset.sources`), disabled until a basis is chosen:
   - health records: a parent checkbox with one sub-checkbox per register that holds entries for this patient, each with its entry count. Kanta starts unchecked and says it needs the patient's consent.
   - own description, chat style: a prompt bubble (`.chat-prompt`) above a textarea (`.chat-input`) prefilled with a starting phrase ("Potilas on "). The phrase alone does not count as data.
   - navigator code (`.navigator-row`): Terapianavigaattori or Interventionavigaattori (chosen by age), the 8-digit code, and links to the services.
A `.summary` box lists exactly what the search will use and states the purpose. The main button stays disabled until at least one source is chosen. Patients and proxies get the same sources on a page (`.self-service`) without steps 1–2.

### Processing

A dark green panel (`.processing`) with animated white strings (`.waves`, drawn by `src/lib/waves.ts`), the two main steps, and a rotating process phrase (`.phrase`, a new one every 650 ms, with a fade-in). Phrases are per step and per language in `i18n.ts` (`phrases`). With `prefers-reduced-motion`, the strings are drawn once and phrases appear without animation. Only the steps are announced to screen readers.

### Filters

`.filters` bar above the results: start and time of day as selects; cost and distance as two-handle sliders (`.range-filter`, `.range`) like in online stores, with the chosen span drawn on the track and the value in an `output` (`0–25 km`, `Kaikki`). The minimum starts at 0; the right end of the scale means no upper limit. Slider handles are small rectangles. Filters guessed from the patient record (`guessFilters` in `src/lib/filters.ts`) are marked `.suggested` (green label, tinted select) while they keep the guessed value; the tooltip names the evidence. "Clear filters" appears only when any filter is active.

### Map

MapLibre GL with an offline Protomaps basemap (`public/maps/`, see README.md), set up in `src/lib/basemap.ts`. The Protomaps "light" flavour is recoloured towards the palette (mint water, green-grey land and parks). Map labels follow the UI language. The map is square and sits sticky to the right of the cards (`.results-layout`, `.map-panel`). Below 900px wide, it moves above the cards. "Suurenna kartta" (`.map-expand`) opens it as a window over the page (`.map.expanded` with a `.map-backdrop`); Escape or the backdrop closes it. A small legend (`.map-legend`) sits bottom left.
- Opening animation: the map first shows every matching treatment, then zooms in to a 15 km radius around the patient's home.
- Care network: the patient's current care contacts (health centre, school, social work, hospital) are grey squares (`.map-contact`). Home and every contact are joined by straight grey lines. Contact labels appear from zoom 11 or on hover, so they don't overlap. If the map file is missing, a red notice says so instead of showing a blank panel.
- Pins (`.map-pin`) are dark green squares carrying the card's rank. Full groups are grey; the active pin is `--green`, enlarged, with a `--green-light` outline.
- Pins are MapLibre markers, which MapLibre positions with `transform`. Pin states must change size, never `transform`.
- Home (`.map-home`) is a white box with a dark green border, anchored just below the point so it doesn't hide a pin at the same place. The distance filter is drawn as a dashed `--green` circle, and the view fits the whole circle.
- **Patients with a non-disclosure order (turvakielto) get no home marker, no circle and no care network**, except when the patients themselves are signed in.
- Hovering a card highlights its pin, and clicking a pin scrolls to its card. Coordinates are WGS84.

### Data source switch

`.data-switch` sits next to the wordmark, in the slot of the former demo badge. It is a badge-sized `role="switch"` with a small rectangular track and knob, and switches the listings between the synthetic demo groups and the real services (`src/data/listings.ts`). Showing synthetic data it keeps the warning colours and reads "DEMO · synteettinen data"; showing real data it turns `--tint` with `--green-dark` text. The tooltip says that patients are always synthetic. It has no slanted button shape.

Real listings often lack seat counts, start dates or prices. Cards then show the organiser's enrolment status ("Ryhmä käynnissä", "Täynnä", "Lähetteellä"), the free-text schedule, or "Hinta ei tiedossa"; unknown values never filter a listing out.

### Dialogs

Every dialog is a window (`Modal.tsx`): a `.titlebar` with the title and a text-only close `×`, then `.modal-body`. Escape and clicking the backdrop also close it.

### Status bar

`.statusbar`, fixed to the bottom while signed in: a small green light with "Yhdistetty: LUVN", the last sync time, and the signed-in user. Segments are separated by grooves (a border plus a white line). On narrow screens the user segment is hidden. The user's name appears only here, not in the top bar.

### Information dialog

Opened from a card's "Lisätietoja" button. `.modal.wide` with group details (`.details`), the inclusion criteria (`.criteria`: referral, age, residence, excluding topics, organiser notes; for real services the referral flag and the target group text, or a note to check with the organiser), the contact person (`.contact`), and actions that depend on the listing's `booking.type`:
- **contact:** Close.
- **external:** Close, plus a link button to the organiser's booking system.
- **integrated:** Cancel and Confirm. On success, a `.success` box shows the reference.

### Component files

Each component has a static reference file in `design/` (open `design/index.html` for the list). The React views in `src/views/` are the source of truth for behaviour; the HTML files are the visual spec and must use the same class names. `processing.html` and `map.html` (with `map.ts`) import from `src/` and work only when served by `npm run dev`.

| File | React source | Key classes |
|---|---|---|
| `topbar.html` | `src/App.tsx` | `.topbar`, `.brand`, `.lang-switch`, `.segment`, `.data-switch` |
| `login.html` | `src/views/Login.tsx` | `.login`, `.role-choice`, `.role-option`, `.strong-auth`, `.divider` |
| `patient-search.html` | `src/views/PatientSearch.tsx` | `.search-row`, `.results-table` |
| `access-dialog.html` | `src/views/PatientSearch.tsx`, `DataSources.tsx`, `Modal.tsx` | `.modal`, `.titlebar`, `.modal-body`, `.identity`, `.acknowledge`, `.sources`, `.sub-checks`, `.chat-prompt`, `.chat-input`, `.navigator-row`, `.summary` |
| `patient-banner.html` | `src/views/PatientBanner.tsx` | `.patient-banner` |
| `processing.html` | `src/views/Processing.tsx` | `.processing`, `.waves`, `.steps`, `.step-icon`, `.phrase` |
| `topic-list.html` | `src/views/Results.tsx` | `.tags.editable`, `.tag.matched`, `.tag-remove` |
| `filters.html` | `src/views/FilterBar.tsx` | `.filters`, `label.suggested`, `.range-filter`, `.range` |
| `group-card.html` | `src/views/Results.tsx` | `.card`, `.card.active`, `.card.full`, `.card-rank`, `.fit`, `.seats` |
| `map.html` | `src/views/GroupMap.tsx`, `src/lib/basemap.ts` | `.results-layout`, `.map-panel`, `.map`, `.map-canvas`, `.map-pin`, `.map-home`, `.map-contact`, `.map-expand`, `.map-legend` |
| `booking-dialog.html` | `src/views/BookingDialog.tsx` | `.modal.wide`, `.details`, `.criteria`, `.contact`, `.success`, `a.button` |
| `statusbar.html` | `src/views/StatusBar.tsx` | `.statusbar`, `.status-light` |

## Buttons

- `.primary`: `--green-dark` fill with white text, hover `--green`. One per view region.
- `.secondary`: white-to-pale-green gradient with a `#C5D6D0` outline, hover border `--green-light`.
- `.segment`: language switch segments; the active one is filled `--green-dark`.
- `.link`: text-only, `--green-dark`.
- Focus: the shape's border turns `--green` (`--green-light` on primary buttons) and thickens to 2px.
