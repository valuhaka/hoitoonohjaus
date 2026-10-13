import * as maplibregl from 'maplibre-gl'
import { Protocol } from 'pmtiles'
import { layers, namedFlavor, type Flavor } from '@protomaps/basemaps'
import type { Feature, Polygon } from 'geojson'
import type { Coords } from './geo'
// MapLibre finds its worker relative to its own file, which bundling moves; point at it explicitly
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'

// Offline basemap: one PMTiles extract plus fonts and sprites, all served from public/maps.
// Recreate the extract with the command in README.md.
const ASSETS = '/maps'
export const PMTILES_PATH = `${ASSETS}/uusimaa.pmtiles`

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

export const createBaseMap = (container: HTMLElement, lang: string): maplibregl.Map => {
  initialise()
  return new maplibregl.Map({
    container,
    center: DEFAULT_CENTER,
    zoom: 8,
    maxZoom: 16,
    attributionControl: { compact: true },
    cooperativeGestures: false,
    scrollZoom: false,
    style: {
      version: 8,
      glyphs: absolute(`${ASSETS}/fonts/{fontstack}/{range}.pbf`),
      sprite: absolute(`${ASSETS}/sprites/light`),
      sources: {
        protomaps: {
          type: 'vector',
          url: `pmtiles://${absolute(PMTILES_PATH)}`,
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://protomaps.com">Protomaps</a>',
        },
      },
      layers: layers('protomaps', PSYYKKERI_FLAVOR, { lang }),
    },
  })
}

// Tells whether the offline map file is present, so the UI can say so instead of showing a blank map
export const basemapAvailable = async (): Promise<boolean> => {
  try {
    const res = await fetch(PMTILES_PATH, { method: 'HEAD' })
    return res.ok
  } catch {
    return false
  }
}

// Polygon approximating a circle of `radiusKm` around `center`, as GeoJSON
export const circlePolygon = (center: Coords, radiusKm: number, steps = 64): Feature<Polygon> => {
  const latRad = (center.lat * Math.PI) / 180
  const dLat = radiusKm / 110.574
  const dLon = radiusKm / (111.32 * Math.cos(latRad))
  const ring = Array.from({ length: steps + 1 }, (_, i) => {
    const a = (i / steps) * 2 * Math.PI
    return [center.lon + dLon * Math.cos(a), center.lat + dLat * Math.sin(a)]
  })
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } }
}

export const pinElement = (label: string, className: string): HTMLDivElement => {
  const el = document.createElement('div')
  el.className = className
  el.textContent = label
  return el
}
