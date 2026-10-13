import type { Coords } from './geo'

// Reference points for browsing without personal details: municipal centres of the LUVN area
export type Place = { id: string; fi: string; sv: string; coords: Coords }

export const PLACES: Place[] = [
  { id: 'espoo', fi: 'Espoo', sv: 'Esbo', coords: { lat: 60.2052, lon: 24.6522 } },
  { id: 'hanko', fi: 'Hanko', sv: 'Hangö', coords: { lat: 59.8236, lon: 22.9681 } },
  { id: 'inkoo', fi: 'Inkoo', sv: 'Ingå', coords: { lat: 60.0453, lon: 24.0058 } },
  { id: 'karkkila', fi: 'Karkkila', sv: 'Högfors', coords: { lat: 60.5347, lon: 24.2097 } },
  { id: 'kauniainen', fi: 'Kauniainen', sv: 'Grankulla', coords: { lat: 60.21, lon: 24.728 } },
  { id: 'kirkkonummi', fi: 'Kirkkonummi', sv: 'Kyrkslätt', coords: { lat: 60.1236, lon: 24.4385 } },
  { id: 'lohja', fi: 'Lohja', sv: 'Lojo', coords: { lat: 60.2486, lon: 24.0653 } },
  { id: 'raasepori', fi: 'Raasepori', sv: 'Raseborg', coords: { lat: 59.9739, lon: 23.4372 } },
  { id: 'siuntio', fi: 'Siuntio', sv: 'Sjundeå', coords: { lat: 60.1386, lon: 24.2264 } },
  { id: 'vihti', fi: 'Vihti', sv: 'Vichtis', coords: { lat: 60.3326, lon: 24.3264 } },
]

// Lohja lies in the middle of the area
export const DEFAULT_PLACE = PLACES.find(p => p.id === 'lohja')!
