import * as maplibregl from 'maplibre-gl'
import { Protocol } from 'pmtiles'
import { layers, namedFlavor, type Flavor } from '@protomaps/basemaps'
// MapLibre finds its worker relative to its own file, which bundling moves; point at it explicitly
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'

// Two basemaps:
// - offline: one PMTiles extract plus fonts and sprites served from public/maps (see README.md).
//   It is not committed; when it is present it is used.
// - online: OpenFreeMap vector tiles (OpenStreetMap data, no key), recoloured towards the palette.
const ASSETS = '/maps'
export const PMTILES_PATH = `${ASSETS}/uusimaa.pmtiles`
const ONLINE_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'

// Fallback view: LUVN and HUS area
export const DEFAULT_CENTER: [number, number] = [24.5, 60.25]

// Protomaps "light" recoloured towards the Psyykkeri palette
const PSYYKKERI_FLAVOR: Flavor = {
  ...namedFlavor('light'),
  background: '#e8eeec',
  earth: '#f4f6f3',
  water: '#c3e2db',
  park_a: '#dcebe3',
  park_b: '#d4e7dc',
  wood_a: '#dceadf',
  wood_b: '#d3e5d8',
  scrub_a: '#e3eee6',
  scrub_b: '#dde9e0',
  buildings: '#e2e7e5',
  boundaries: '#9fb3ad',
  city_label: '#2f423d',
  city_label_halo: '#ffffff',
  subplace_label: '#52645f',
}

let initialised = false
const initialise = () => {
  if (initialised) return
  maplibregl.setWorkerUrl(workerUrl)
  maplibregl.addProtocol('pmtiles', new Protocol().tile)
  initialised = true
}

// Plain concatenation: URL() would escape the {fontstack} and {range} placeholders
const absolute = (path: string) => `${window.location.origin}${path}`

const ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

const offlineStyle = (lang: string): maplibregl.StyleSpecification => ({
  version: 8,
  glyphs: absolute(`${ASSETS}/fonts/{fontstack}/{range}.pbf`),
  sprite: absolute(`${ASSETS}/sprites/light`),
  sources: {
    protomaps: {
      type: 'vector',
      url: `pmtiles://${absolute(PMTILES_PATH)}`,
      attribution: `${ATTRIBUTION} · <a href="https://protomaps.com">Protomaps</a>`,
    },
  },
  layers: layers('protomaps', PSYYKKERI_FLAVOR, { lang }),
})

// The online style's own greys swapped for the offline flavour's colours
const ONLINE_COLOURS: Record<string, [property: string, colour: string]> = {
  background: ['background-color', PSYYKKERI_FLAVOR.background],
  park: ['fill-color', PSYYKKERI_FLAVOR.park_a],
  water: ['fill-color', PSYYKKERI_FLAVOR.water],
  waterway: ['line-color', PSYYKKERI_FLAVOR.water],
  landcover_wood: ['fill-color', PSYYKKERI_FLAVOR.wood_a],
  landuse_residential: ['fill-color', PSYYKKERI_FLAVOR.earth],
  building: ['fill-color', PSYYKKERI_FLAVOR.buildings],
  boundary_3: ['line-color', PSYYKKERI_FLAVOR.boundaries],
  boundary_2: ['line-color', PSYYKKERI_FLAVOR.boundaries],
}

// Place and street names in the UI language where OpenStreetMap has one (Raasepori / Raseborg)
const localName = (lang: string) => ['coalesce', ['get', `name:${lang}`], ['get', 'name:latin'], ['get', 'name']]

const NAME_SOURCES = new Set(['place', 'water_name', 'waterway', 'transportation_name', 'aerodrome_label'])

// The tiles' own attribution is long enough to cover the legend on the small map
const ONLINE_ATTRIBUTION = `<a href="https://openfreemap.org">OpenFreeMap</a> · ${ATTRIBUTION}`

const recolour = (style: maplibregl.StyleSpecification, lang: string): maplibregl.StyleSpecification => ({
  ...style,
  sources: Object.fromEntries(Object.entries(style.sources).map(([id, source]) =>
    [id, source.type === 'vector' ? { ...source, attribution: ONLINE_ATTRIBUTION } : source])),
  layers: style.layers.map(layer => {
    const colour = ONLINE_COLOURS[layer.id]
    const named = layer.type === 'symbol' && NAME_SOURCES.has(layer['source-layer'] ?? '') && !layer.id.includes('shield')
    return {
      ...layer,
      ...(colour && { paint: { ...layer.paint, [colour[0]]: colour[1] } }),
      ...(named && { layout: { ...layer.layout, 'text-field': localName(lang) } }),
    } as maplibregl.LayerSpecification
  }),
})

// The dev server and the Cloudflare SPA fallback answer a missing file with index.html and 200,
// so the file is checked by its magic bytes, not by the status
const offlineAvailable = async (): Promise<boolean> => {
  try {
    const res = await fetch(PMTILES_PATH, { headers: { Range: 'bytes=0-6' } })
    return res.ok && (await res.text()).startsWith('PMTiles')
  } catch {
    return false
  }
}

const onlineStyle = async (): Promise<maplibregl.StyleSpecification | null> => {
  try {
    const res = await fetch(ONLINE_STYLE_URL)
    return res.ok ? await res.json() : null
  } catch {
    return null
  }
}

let offline: Promise<boolean> | null = null
let online: Promise<maplibregl.StyleSpecification | null> | null = null

// The offline map when its file is present, otherwise the online one; null when neither can be had
export const loadBasemapStyle = async (lang: string): Promise<maplibregl.StyleSpecification | null> => {
  offline ??= offlineAvailable()
  if (await offline) return offlineStyle(lang)
  online ??= onlineStyle()
  const style = await online
  // A failed download is tried again with the next map
  if (!style) online = null
  return style && recolour(style, lang)
}

// `locale` translates MapLibre's own control texts
export const createBaseMap = (
  container: HTMLElement,
  style: maplibregl.StyleSpecification,
  locale: Record<string, string>,
): maplibregl.Map => {
  initialise()
  return new maplibregl.Map({
    container,
    center: DEFAULT_CENTER,
    zoom: 8,
    maxZoom: 16,
    attributionControl: { compact: true },
    cooperativeGestures: false,
    scrollZoom: false,
    style,
    locale,
  })
}

export const pinElement = (label: string, className: string): HTMLDivElement => {
  const el = document.createElement('div')
  el.className = className
  el.textContent = label
  return el
}
