// Finnish personal identity code (henkilötunnus): DDMMYYCZZZQ
const CHECK_CHARS = '0123456789ABCDEFHJKLMNPRSTUVWXY'
const CENTURY: Record<string, number> = {
  '+': 1800,
  '-': 1900, Y: 1900, X: 1900, W: 1900, V: 1900, U: 1900,
  A: 2000, B: 2000, C: 2000, D: 2000, E: 2000, F: 2000,
}
const PATTERN = /^(\d{2})(\d{2})(\d{2})([-+YXWVUABCDEF])(\d{3})([0-9A-Y])$/

export const normalizeHetu = (input: string): string => input.trim().toUpperCase()

export const checkChar = (dateDigits: string, individual: string): string =>
  CHECK_CHARS[Number(dateDigits + individual) % 31] ?? ''

export const isValidHetu = (input: string): boolean => {
  const match = PATTERN.exec(normalizeHetu(input))
  if (!match) return false
  const [, dd, mm, yy, sign, zzz, q] = match as unknown as string[]
  const year = (CENTURY[sign!] ?? 0) + Number(yy)
  const date = new Date(Date.UTC(year, Number(mm) - 1, Number(dd)))
  const realDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === Number(mm) - 1 &&
    date.getUTCDate() === Number(dd)
  return realDate && checkChar(dd! + mm! + yy!, zzz!) === q
}

export const birthDate = (hetu: string): Date => {
  const h = normalizeHetu(hetu)
  const year = (CENTURY[h[6]!] ?? 1900) + Number(h.slice(4, 6))
  return new Date(Date.UTC(year, Number(h.slice(2, 4)) - 1, Number(h.slice(0, 2))))
}

export const ageAt = (hetu: string, now: Date): number => {
  const born = birthDate(hetu)
  const hadBirthday =
    now.getUTCMonth() > born.getUTCMonth() ||
    (now.getUTCMonth() === born.getUTCMonth() && now.getUTCDate() >= born.getUTCDate())
  return now.getUTCFullYear() - born.getUTCFullYear() - (hadBirthday ? 0 : 1)
}

// Individual numbers 900–999 are reserved for test/temporary identities
export const isTestHetu = (hetu: string): boolean => Number(normalizeHetu(hetu).slice(7, 10)) >= 900
