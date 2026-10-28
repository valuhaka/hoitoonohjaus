import { describe, expect, it } from 'vitest'
import { GROUPS } from '../data/groups'
import { PATIENTS } from '../data/patients'
import { TREATMENTS } from '../data/treatments'
import { DICTS, placeName } from '../i18n'
import { LUVN_MUNICIPALITIES } from './eligibility'

// Enforces the language rule in style.md: views take every visible string from src/i18n.ts
const FILES = import.meta.glob<string>('../**/*.tsx', { query: '?raw', import: 'default', eager: true })
const sources = Object.entries(FILES).map(([file, text]) => ({ file: file.replace('../', 'src/'), text }))

const lineOf = (text: string, index: number) => text.slice(0, index).split('\n').length

const findAll = (pattern: RegExp) =>
  sources.flatMap(({ file, text }) => [...text.matchAll(pattern)].map(m => `${file}:${lineOf(text, m.index!)} ${m[0].trim()}`))

describe('language rule', () => {
  it('reads the views', () => expect(sources.length).toBeGreaterThan(10))
  it('has no words written directly between JSX tags', () => {
    // Text after a tag's closing ">" that starts with a letter, e.g. <p>Hae</p>
    expect(findAll(/>\s*\p{L}[^<>{}=;()]*</gu)).toEqual([])
  })
  it('has no words in quoted accessibility, tooltip or placeholder attributes', () => {
    expect(findAll(/\b(aria-label|title|placeholder|alt)="[^"]*\p{L}{2,}[^"]*"/gu)).toEqual([])
  })
  it('gives every language the same keys', () => {
    const keys = (v: unknown, path = ''): string[] =>
      v && typeof v === 'object' ? Object.entries(v).flatMap(([k, x]) => keys(x, `${path}.${k}`)) : [path]
    expect(keys(DICTS.sv)).toEqual(keys(DICTS.fi))
    expect(keys(DICTS.en)).toEqual(keys(DICTS.fi))
  })
  it('has a Swedish name for every municipality in the data', () => {
    // Remote listings leave the municipality empty, so it never holds a UI word such as "Etä"
    const municipalities = new Set([
      ...TREATMENTS.flatMap(t => t.locations.map(l => l.municipality)),
      ...GROUPS.map(g => g.municipality),
      ...PATIENTS.map(p => p.municipality),
      ...LUVN_MUNICIPALITIES,
    ].filter(Boolean))
    expect([...municipalities].filter(m => placeName(m, 'sv') === m)).toEqual([])
  })
})
