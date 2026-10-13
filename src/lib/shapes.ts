import type { Feature, Polygon } from 'geojson'
import type { Coords } from './geo'

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

// The distance filter as a donut: the band between `minKm` and `maxKm`.
// Without an upper limit only the inner edge is drawn (`fill: false`); with neither limit, nothing.
export const ringPolygon = (center: Coords, minKm: number, maxKm: number | null): Feature<Polygon> | null => {
  const ring = (km: number) => circlePolygon(center, km).geometry.coordinates[0]!
  if (maxKm === null) {
    return minKm > 0 ? { type: 'Feature', properties: { fill: false }, geometry: { type: 'Polygon', coordinates: [ring(minKm)] } } : null
  }
  // The hole runs the other way round, as GeoJSON requires
  const hole = minKm > 0 ? [ring(minKm).slice().reverse()] : []
  return { type: 'Feature', properties: { fill: true }, geometry: { type: 'Polygon', coordinates: [ring(maxKm), ...hole] } }
}
