import type { CareContactKind } from '../data/patients'

// Line icons for map markers and the legend, 16×16, drawn in currentColor.
// The no-pictogram rule has one exception: map markers, where a label would not fit.
export type MapIconKind = CareContactKind | 'home' | 'origin'

const PATHS: Record<MapIconKind, string> = {
  home: '<path d="M2 8 8 2.7 14 8M4 6.6v6.9h8V6.6M6.7 13.5v-3.7h2.6v3.7"/>',
  // Reference point when browsing without a patient
  origin: '<circle cx="8" cy="8" r="4.5"/><circle cx="8" cy="8" r="1"/><path d="M8 1v2.5M8 12.5V15M1 8h2.5M12.5 8H15"/>',
  healthCentre: '<path d="M6 2.5h4v3.5h3.5v4H10v3.5H6V10H2.5V6H6z"/>',
  mentalHealth: '<path d="M2.5 3h11v7.5h-6l-3 2.8v-2.8h-2z"/>',
  specialist: '<path d="M3 2.5h10v11H3zM6 5.5v5M10 5.5v5M6 8h4"/>',
  social: '<circle cx="5.5" cy="5" r="2"/><circle cx="11" cy="5.5" r="1.7"/><path d="M1.8 13.2c0-2.4 1.6-4 3.7-4s3.7 1.6 3.7 4M9.6 9.4c.4-.2.9-.3 1.4-.3 1.8 0 3.2 1.4 3.2 3.6"/>',
  school: '<path d="M8 4.5C6.5 3.3 4.5 3 2 3v9.5c2.5 0 4.5.3 6 1.5 1.5-1.2 3.5-1.5 6-1.5V3c-2.5 0-4.5.3-6 1.5zM8 4.5V14"/>',
  studentHealth: '<path d="M1.5 6 8 3l6.5 3L8 9zM4 7.4v3.3c1 1 2.5 1.6 4 1.6s3-.6 4-1.6V7.4"/>',
}

export const iconSvg = (kind: MapIconKind) =>
  `<svg class="map-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round">${PATHS[kind]}</svg>`
