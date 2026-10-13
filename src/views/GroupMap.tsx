import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { Feature, FeatureCollection, LineString } from 'geojson'
import type { CareContact } from '../data/patients'
import { basemapAvailable, circlePolygon, createBaseMap, pinElement } from '../lib/basemap'
import type { Coords } from '../lib/geo'
import type { Match } from '../lib/match'
import { useT } from '../i18n'

const RADIUS_SOURCE = 'distance-radius'
const NETWORK_SOURCE = 'care-network'
const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] }

// Opening animation: show every listed treatment, then zoom in to the patient's surroundings
const OVERVIEW_PAUSE_MS = 900
const ZOOM_IN_MS = 2400
const HOME_RADIUS_KM = 15
// Contact labels overlap when zoomed out; below this zoom they show on hover only
const CONTACT_LABEL_ZOOM = 11

type Point = Coords

const boundsOf = (points: Point[]) =>
  points.reduce(
    (b, p) => b.extend([p.lon, p.lat]),
    new maplibregl.LngLatBounds([points[0]!.lon, points[0]!.lat], [points[0]!.lon, points[0]!.lat]),
  )

const circlePoints = (center: Point, radiusKm: number): Point[] =>
  circlePolygon(center, radiusKm, 16).geometry.coordinates[0]!.map(([lon, lat]) => ({ lon: lon!, lat: lat! }))

// Every pair of home and care contacts joined by a straight line: the patient's current care network
const networkLines = (nodes: Point[]): FeatureCollection<LineString> => ({
  type: 'FeatureCollection',
  features: nodes.flatMap((a, i) =>
    nodes.slice(i + 1).map((b): Feature<LineString> => ({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: [[a.lon, a.lat], [b.lon, b.lat]] },
    })),
  ),
})

const contactElement = (label: string, name: string) => {
  const el = document.createElement('div')
  el.className = 'map-contact'
  el.title = name
  el.setAttribute('aria-label', name)
  const dot = document.createElement('span')
  const text = document.createElement('span')
  text.textContent = label
  el.append(dot, text)
  return el
}

export const GroupMap = ({
  matches,
  all,
  home,
  contacts,
  radiusKm,
  activeId,
  onSelect,
}: {
  // Visible (filtered) matches get pins; `all` sets the opening overview
  matches: Match[]
  all: Match[]
  // null and [] when the patient's locations must not be shown (turvakielto)
  home: Coords | null
  contacts: CareContact[]
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
  const [expanded, setExpanded] = useState(false)
  const [labels, setLabels] = useState(false)
  onSelectRef.current = onSelect

  // Create the map once; label language is fixed at creation
  useEffect(() => {
    if (!container.current) return
    const m = createBaseMap(container.current, lang)
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    m.on('load', () => {
      m.addSource(NETWORK_SOURCE, { type: 'geojson', data: EMPTY })
      m.addLayer({ id: 'network-line', type: 'line', source: NETWORK_SOURCE, paint: { 'line-color': '#7d8a86', 'line-width': 1.25, 'line-opacity': 0.8 } })
      m.addSource(RADIUS_SOURCE, { type: 'geojson', data: EMPTY })
      m.addLayer({ id: 'radius-fill', type: 'fill', source: RADIUS_SOURCE, paint: { 'fill-color': '#89cabc', 'fill-opacity': 0.14 } })
      m.addLayer({
        id: 'radius-line', type: 'line', source: RADIUS_SOURCE,
        paint: { 'line-color': '#008d70', 'line-width': 1.25, 'line-dasharray': [3, 3] },
      })
      setReady(true)
    })
    m.on('zoomend', () => setLabels(m.getZoom() >= CONTACT_LABEL_ZOOM))
    map.current = m
    basemapAvailable().then(ok => setMissing(!ok))
    return () => {
      m.remove()
      map.current = null
      setReady(false)
    }
  }, [lang])

  const located = matches.flatMap((m, i) => (m.group.coords ? [{ match: m, rank: i + 1, coords: m.group.coords }] : []))

  // Markers, network and radius follow the visible matches
  useEffect(() => {
    const m = map.current
    if (!m || !ready) return
    markers.current.forEach(mk => mk.remove())
    markers.current = [
      ...contacts.map(c =>
        new maplibregl.Marker({ element: contactElement(t.map.kinds[c.kind], c.name), anchor: 'left', offset: [-5, 0] })
          .setLngLat([c.coords.lon, c.coords.lat])),
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

    m.getSource<maplibregl.GeoJSONSource>(NETWORK_SOURCE)
      ?.setData(home ? networkLines([home, ...contacts.map(c => c.coords)]) : EMPTY)
    m.getSource<maplibregl.GeoJSONSource>(RADIUS_SOURCE)
      ?.setData(home && radiusKm !== null ? circlePolygon(home, radiusKm) : EMPTY)
  })

  // Opening animation; `ready` turns true once per map
  useEffect(() => {
    const m = map.current
    if (!m || !ready) return
    const overview = [
      ...all.flatMap(x => (x.group.coords ? [x.group.coords] : [])),
      ...(home ? [home] : []),
      ...contacts.map(c => c.coords),
    ]
    if (overview.length > 0) m.fitBounds(boundsOf(overview), { padding: 40, maxZoom: 12, duration: 0 })
    if (!home) return
    const id = setTimeout(
      () => m.fitBounds(boundsOf(circlePoints(home, HOME_RADIUS_KM)), { padding: 24, duration: ZOOM_IN_MS }),
      OVERVIEW_PAUSE_MS,
    )
    return () => clearTimeout(id)
  // Runs when the map becomes ready; later changes are handled below
  }, [ready])

  // After the opening, refit only when the distance limit changes
  const lastRadius = useRef(radiusKm)
  useEffect(() => {
    const m = map.current
    if (!m || !ready || lastRadius.current === radiusKm) return
    lastRadius.current = radiusKm
    const points = home && radiusKm !== null
      ? circlePoints(home, radiusKm)
      : [...located.map(l => l.coords), ...(home ? [home] : [])]
    if (points.length > 0) m.fitBounds(boundsOf(points), { padding: 32, maxZoom: 12, duration: 600 })
  }, [ready, radiusKm])

  // The canvas changes size when the map is enlarged
  useEffect(() => {
    map.current?.resize()
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setExpanded(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])

  return (
    <>
      {expanded && <div className="map-backdrop" onClick={() => setExpanded(false)} />}
      <div className={['map', expanded && 'expanded', labels && 'contact-labels'].filter(Boolean).join(' ')}>
        <div ref={container} className="map-canvas" />
        <button className="secondary map-expand" aria-pressed={expanded} onClick={() => setExpanded(e => !e)}>
          {expanded ? t.map.collapse : t.map.expand}
        </button>
        <ul className="map-legend">
          {home && <li><span className="key home" />{t.home}</li>}
          {contacts.length > 0 && <li><span className="key network" />{t.map.contacts}</li>}
          <li><span className="key group" />{t.map.groups}</li>
        </ul>
        {missing && <p className="map-missing">{t.mapMissing}</p>}
      </div>
    </>
  )
}
