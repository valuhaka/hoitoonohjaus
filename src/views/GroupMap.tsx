import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { FeatureCollection } from 'geojson'
import { basemapAvailable, circlePolygon, createBaseMap, pinElement } from '../lib/basemap'
import type { Coords } from '../lib/geo'
import type { Match } from '../lib/match'
import { useT } from '../i18n'

const RADIUS_SOURCE = 'distance-radius'
const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] }

export const GroupMap = ({
  matches,
  home,
  radiusKm,
  activeId,
  onSelect,
}: {
  matches: Match[]
  // null when the patient's location must not be shown (turvakielto)
  home: Coords | null
  radiusKm: number | null
  activeId: string | null
  onSelect: (groupId: string) => void
}) => {
  const { t, lang } = useT()
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markers = useRef<maplibregl.Marker[]>([])
  const onSelectRef = useRef(onSelect)
  const [ready, setReady] = useState(false)
  const [missing, setMissing] = useState(false)
  onSelectRef.current = onSelect

  // Create the map once; label language is fixed at creation
  useEffect(() => {
    if (!container.current) return
    const m = createBaseMap(container.current, lang)
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    m.on('load', () => {
      m.addSource(RADIUS_SOURCE, { type: 'geojson', data: EMPTY })
      m.addLayer({ id: 'radius-fill', type: 'fill', source: RADIUS_SOURCE, paint: { 'fill-color': '#89cabc', 'fill-opacity': 0.14 } })
      m.addLayer({
        id: 'radius-line', type: 'line', source: RADIUS_SOURCE,
        paint: { 'line-color': '#008d70', 'line-width': 1.25, 'line-dasharray': [3, 3] },
      })
      setReady(true)
    })
    map.current = m
    basemapAvailable().then(ok => setMissing(!ok))
    return () => {
      m.remove()
      map.current = null
      setReady(false)
    }
  }, [lang])

  // Markers, radius and bounds follow the visible matches
  const located = matches.flatMap((m, i) => (m.group.coords ? [{ match: m, rank: i + 1, coords: m.group.coords }] : []))
  const pointsKey = JSON.stringify([located.map(l => l.match.group.id), home, radiusKm])

  useEffect(() => {
    const m = map.current
    if (!m || !ready) return
    markers.current.forEach(mk => mk.remove())
    markers.current = [
      ...(home ? [new maplibregl.Marker({ element: pinElement(t.home, 'map-home'), anchor: 'top', offset: [0, 18] }).setLngLat([home.lon, home.lat])] : []),
      ...located.map(({ match, rank, coords }) => {
        const classes = ['map-pin', match.seatsLeft === 0 && 'full', match.group.id === activeId && 'active']
        const el = pinElement(String(rank), classes.filter(Boolean).join(' '))
        el.title = match.group.name
        el.setAttribute('role', 'button')
        el.setAttribute('aria-label', `${rank}. ${match.group.name}`)
        el.addEventListener('click', () => onSelectRef.current(match.group.id))
        return new maplibregl.Marker({ element: el }).setLngLat([coords.lon, coords.lat])
      }),
    ]
    markers.current.forEach(mk => mk.addTo(m))

    const radius = m.getSource<maplibregl.GeoJSONSource>(RADIUS_SOURCE)
    radius?.setData(home && radiusKm !== null ? circlePolygon(home, radiusKm) : EMPTY)
  })

  useEffect(() => {
    const m = map.current
    if (!m || !ready) return
    // Include the distance circle so the whole search area is visible
    const circle = home && radiusKm !== null ? circlePolygon(home, radiusKm, 8).geometry.coordinates[0]! : []
    const points = [
      ...located.map(l => l.coords),
      ...(home ? [home] : []),
      ...circle.map(([lon, lat]) => ({ lon: lon!, lat: lat! })),
    ]
    if (points.length === 0) return
    const bounds = points.reduce(
      (b, p) => b.extend([p.lon, p.lat]),
      new maplibregl.LngLatBounds([points[0]!.lon, points[0]!.lat], [points[0]!.lon, points[0]!.lat]),
    )
    m.fitBounds(bounds, { padding: 48, maxZoom: 12, duration: 600 })
  // Refit only when the set of points changes, not on hover
  }, [ready, pointsKey])

  return (
    <div className="map">
      <div ref={container} className="map-canvas" />
      {missing && <p className="map-missing">{t.mapMissing}</p>}
    </div>
  )
}
