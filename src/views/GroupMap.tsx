import { useEffect } from 'react'
import L from 'leaflet'
import { Circle, MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet'
import type { Coords } from '../lib/geo'
import type { Match } from '../lib/match'
import { useT } from '../i18n'

// Fallback view: LUVN and HUS area
const DEFAULT_CENTER: [number, number] = [60.25, 24.5]
const KM = 1000

const pinIcon = (rank: number, active: boolean, full: boolean) =>
  L.divIcon({
    className: '',
    html: `<div class="map-pin${active ? ' active' : ''}${full ? ' full' : ''}">${rank}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })

const homeIcon = (label: string) =>
  L.divIcon({ className: '', html: `<div class="map-home">${label}</div>`, iconSize: [48, 22], iconAnchor: [24, 11] })

const FitBounds = ({ points }: { points: [number, number][] }) => {
  const map = useMap()
  // Refit only when the set of points changes, not on every render
  const key = JSON.stringify(points)
  useEffect(() => {
    const latest: [number, number][] = JSON.parse(key)
    if (latest.length > 0) map.fitBounds(L.latLngBounds(latest), { padding: [32, 32], maxZoom: 12 })
  }, [map, key])
  return null
}

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
  const { t } = useT()
  const located = matches.flatMap((m, i) => (m.group.coords ? [{ match: m, rank: i + 1, coords: m.group.coords }] : []))
  const points: [number, number][] = [
    ...located.map(({ coords }) => [coords.lat, coords.lon] as [number, number]),
    ...(home ? [[home.lat, home.lon] as [number, number]] : []),
  ]

  return (
    <MapContainer center={DEFAULT_CENTER} zoom={9} className="map" scrollWheelZoom={false}>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      {home && radiusKm !== null && (
        <Circle center={[home.lat, home.lon]} radius={radiusKm * KM}
          pathOptions={{ color: '#008d70', weight: 1, dashArray: '4 4', fillColor: '#89cabc', fillOpacity: 0.12 }} />
      )}
      {home && <Marker position={[home.lat, home.lon]} icon={homeIcon(t.home)} interactive={false} />}
      {located.map(({ match, rank, coords }) => (
        <Marker key={match.group.id} position={[coords.lat, coords.lon]}
          icon={pinIcon(rank, match.group.id === activeId, match.seatsLeft === 0)}
          zIndexOffset={match.group.id === activeId ? 1000 : -rank}
          eventHandlers={{ click: () => onSelect(match.group.id) }}>
          <Tooltip direction="top" offset={[0, -14]}>{match.group.name}</Tooltip>
        </Marker>
      ))}
      <FitBounds points={points} />
    </MapContainer>
  )
}
