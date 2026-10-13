import { HASHTAGS, type HashtagId } from '../data/hashtags'
import type { Match } from '../lib/match'
import { formatDate, formatFee, useT } from '../i18n'
import { distanceText, languagesText, scheduleLine, seatsText } from './format'

export const Tag = ({ id, highlight }: { id: HashtagId; highlight?: boolean }) => {
  const { lang } = useT()
  return <span className={highlight ? 'tag matched' : 'tag'}>{HASHTAGS[id][lang]}</span>
}

// One listing in the results and in the browser. Without a rank the listing has no pin on the map.
export const GroupCard = ({
  match,
  rank,
  reserved = false,
  showAdded = false,
  active,
  cardRef,
  onHover,
  onInfo,
}: {
  match: Match
  rank?: string
  reserved?: boolean
  showAdded?: boolean
  active: boolean
  cardRef?: (el: HTMLElement | null) => void
  onHover: () => void
  onInfo: () => void
}) => {
  const { t, lang } = useT()
  const { group, matched, distanceKm, seatsLeft } = match
  const className = ['card', rank === undefined && 'unranked', seatsLeft === 0 && 'full', active && 'active']
    .filter(Boolean).join(' ')
  return (
    <article ref={cardRef} className={className} onMouseEnter={onHover}>
      {rank !== undefined && <div className="card-rank">{rank}</div>}
      <div className="card-body">
        <header>
          <h3>{group.name}</h3>
          {showAdded && group.addedAt && (
            <span className="added">{t.browser.added} {formatDate(group.addedAt, lang)}</span>
          )}
        </header>
        <p className="organiser">{group.organiser}</p>
        <div className="facts">
          {group.address && <span>{group.address}</span>}
          <span>{distanceText(group, distanceKm, lang)}</span>
          <span>{formatFee(group.fee, lang)}</span>
        </div>
        <div className="facts muted">
          <span>{group.method}</span>
          {scheduleLine(group, lang) && <span>{scheduleLine(group, lang)}</span>}
          <span>{languagesText(group)}</span>
        </div>
        <div className="tags">
          {group.tags.map(id => <Tag key={id} id={id} highlight={matched.includes(id)} />)}
        </div>
      </div>
      <div className="card-side">
        <span className={seatsLeft === 0 ? 'seats none' : 'seats'}>{reserved ? t.reserved : seatsText(match, lang)}</span>
        <button className="primary" onClick={onInfo}>{t.moreInfo}</button>
      </div>
    </article>
  )
}
