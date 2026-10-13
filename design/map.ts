// Map reference for design/map.html, built on the same basemap module as the app
import 'maplibre-gl/dist/maplibre-gl.css'
import * as maplibregl from 'maplibre-gl'
import { createBaseMap, pinElement } from '../src/lib/basemap.ts'
import { ringPolygon } from '../src/lib/shapes.ts'
import { iconSvg } from '../src/views/mapIcons.ts'

const home = { lat: 60.2128, lon: 23.9951 }
const contacts = [
  { lat: 60.2556, lon: 24.0712, label: 'Terveysasema', kind: 'healthCentre' as const },
  { lat: 60.2491, lon: 24.0598, label: 'Sosiaalityö', kind: 'social' as const },
  { lat: 60.2594, lon: 24.0436, label: 'Sairaala', kind: 'specialist' as const },
]
const nodes = [home, ...contacts]
// Every pair joined: the patient's current care network
const network = {
  type: 'FeatureCollection' as const,
  features: nodes.flatMap((a, i) => nodes.slice(i + 1).map(b => ({
    type: 'Feature' as const, properties: {},
    geometry: { type: 'LineString' as const, coordinates: [[a.lon, a.lat], [b.lon, b.lat]] },
  }))),
}
const contactElement = (kind: typeof contacts[number]['kind'], label: string) => {
  const el = document.createElement('div')
  el.className = 'map-contact'
  el.innerHTML = `<span class="map-contact-icon">${iconSvg(kind)}</span><span class="map-contact-label">${label}</span>`
  return el
}
const homeElement = () => {
  const el = document.createElement('div')
  el.className = 'map-home'
  el.innerHTML = `${iconSvg('home')}Koti`
  return el
}
const pins = [
  { lat: 60.2497, lon: 24.0663, rank: 'A', cls: 'map-pin active' },
  { lat: 60.3336, lon: 24.3251, rank: 'B', cls: 'map-pin' },
  { lat: 59.9739, lon: 23.4381, rank: 'C', cls: 'map-pin' },
  { lat: 60.2563, lon: 24.0451, rank: 'D', cls: 'map-pin full' },
]
const map = createBaseMap(document.getElementById('map')!, 'fi')
map.on('load', () => {
  map.addSource('network', { type: 'geojson', data: network })
  map.addLayer({ id: 'network-line', type: 'line', source: 'network', paint: { 'line-color': '#7d8a86', 'line-width': 1.25, 'line-opacity': 0.8 } })
  contacts.forEach(c => new maplibregl.Marker({ element: contactElement(c.kind, c.label), anchor: 'left', offset: [-11, 0] }).setLngLat([c.lon, c.lat]).addTo(map))
  map.addSource('radius', { type: 'geojson', data: ringPolygon(home, 5, 25)! })
  map.addLayer({ id: 'radius-fill', type: 'fill', source: 'radius', paint: { 'fill-color': '#89cabc', 'fill-opacity': 0.18 } })
  map.addLayer({ id: 'radius-line', type: 'line', source: 'radius', paint: { 'line-color': '#008d70', 'line-width': 1.25, 'line-dasharray': [3, 3] } })
  new maplibregl.Marker({ element: homeElement(), anchor: 'top', offset: [0, 18] }).setLngLat([home.lon, home.lat]).addTo(map)
  pins.forEach(p => new maplibregl.Marker({ element: pinElement(p.rank, p.cls) }).setLngLat([p.lon, p.lat]).addTo(map))
  map.fitBounds([[23.85, 60.13], [24.15, 60.29]], { padding: 24, duration: 0 })
})
