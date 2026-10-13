// Map reference for design/map.html, built on the same basemap module as the app
import 'maplibre-gl/dist/maplibre-gl.css'
import * as maplibregl from 'maplibre-gl'
import { circlePolygon, createBaseMap, pinElement } from '../src/lib/basemap.ts'

const home = { lat: 60.249, lon: 24.065 }
const pins = [
  { lat: 60.2497, lon: 24.0663, rank: 1, cls: 'map-pin active' },
  { lat: 60.3336, lon: 24.3251, rank: 2, cls: 'map-pin' },
  { lat: 59.9739, lon: 23.4381, rank: 3, cls: 'map-pin' },
  { lat: 60.2563, lon: 24.0451, rank: 4, cls: 'map-pin full' },
]
const map = createBaseMap(document.getElementById('map')!, 'fi')
map.on('load', () => {
  map.addSource('radius', { type: 'geojson', data: circlePolygon(home, 25) })
  map.addLayer({ id: 'radius-fill', type: 'fill', source: 'radius', paint: { 'fill-color': '#89cabc', 'fill-opacity': 0.14 } })
  map.addLayer({ id: 'radius-line', type: 'line', source: 'radius', paint: { 'line-color': '#008d70', 'line-width': 1.25, 'line-dasharray': [3, 3] } })
  new maplibregl.Marker({ element: pinElement('Koti', 'map-home'), anchor: 'top', offset: [0, 18] }).setLngLat([home.lon, home.lat]).addTo(map)
  pins.forEach(p => new maplibregl.Marker({ element: pinElement(String(p.rank), p.cls) }).setLngLat([p.lon, p.lat]).addTo(map))
  map.fitBounds([[23.4, 59.95], [24.5, 60.45]], { padding: 32, duration: 0 })
})
