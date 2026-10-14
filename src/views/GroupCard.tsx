import { HASHTAGS, type HashtagId } from '../data/hashtags'
import type { GroupListing } from '../data/groups'
import type { Match } from '../lib/match'
import { formatFee, useT, type Lang } from '../i18n'
import { distanceText, languagesText, remoteText, scheduleLine, seatsText } from './format'

export const Tag = ({ id, highlight }: { id: HashtagId; highlight?: boolean }) => {
  const { lang } = useT()
  return <span className={highlight ? 'tag matched' : 'tag'}>{HASHTAGS[id][lang]}</span>
}

// Where the listing is: with a reference point the distance to it, otherwise only whether it is remote
export const placeText = (group: GroupListing, distanceKm: number | null, location: boolean, lang: Lang) =>
  location ? distanceText(group, distanceKm, lang) : remoteText(group, lang)

// One listing in the results and in the browser. `location` adds the distance from home;
// the browser has no reference point and leaves it out.
export const GroupCard = ({
  match,
  rank,
  location,
  reserved = false,
  active,
  cardRef,
  onHover,
  onInfo,
}: {
  match: Match
  rank: string
  location: boolean
  reserved?: boolean
  active: boolean
  cardRef?: (el: HTMLElement | null) => void
  onHover: () => void
  onInfo: () => void
}) => {
  const { t, lang } = useT()
  const { group, matched, distanceKm, seatsLeft } = match
  const place = placeText(group, distanceKm, location, lang)
  const className = ['card', seatsLeft === 0 && 'full', active && 'active'].filter(Boolean).join(' ')
  return (
    <article ref={cardRef} className={className} onMouseEnter={onHover}>
      <div className="card-body">
        <h3>{group.name}</h3>
        <p className="organiser">{group.organiser}</p>
        <div className="facts">
          {group.address && <span>{group.address}</span>}
          {place && <span>{place}</span>}
          <span>{formatFee(group.fee, lang)}</span>
        </div>
        <div className="facts muted">
          <span>{group.method}</span>
          {scheduleLine(group, lang) && <span>{scheduleLine(group, lang)}</span>}
          <span>{languagesText(group)}</span>
        </div>
      </div>
      <div className="card-side">
        <span className={seatsLeft === 0 ? 'seats none' : 'seats'}>{reserved ? t.reserved : seatsText(match, lang)}</span>
        <button className="primary" onClick={onInfo}>{t.moreInfo}</button>
      </div>
      <div className="tags">
        {group.tags.map(id => <Tag key={id} id={id} highlight={matched.includes(id)} />)}
      </div>
      <div className="card-rank">{rank}</div>
    </article>
  )
}
