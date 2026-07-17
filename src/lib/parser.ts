import type { FixtureEntry } from '../types'

const fixturePatterns: Array<[RegExp, string]> = [
  [/\b(?:led\s+)?troffers?\b/i, 'Troffer'],
  [/\bhigh[\s-]?bays?(?:\s+lights?)?\b/i, 'High Bay'],
  [/\bwall[\s-]?packs?\b/i, 'Wall Pack'],
  [/\b(?:can|recessed)\s+lights?\b/i, 'Can Light'],
  [/\b(?:parking\s+lot\s+)?(?:poles?|pole\s+lights?)\b/i, 'Parking Lot Pole'],
  [/\bstrip\s+lights?\b/i, 'Strip Light'],
  [/\b(?:linear|wraparound)\s+(?:fixtures?|lights?)\b/i, 'Linear Fixture'],
  [/\bflood\s*lights?\b/i, 'Flood Light'],
  [/\bexit\s+signs?\b/i, 'Exit Sign'],
  [/\bemergency\s+lights?\b/i, 'Emergency Light'],
]

const technologyPatterns: Array<[RegExp, string]> = [
  [/\bLED\b/i, 'LED'],
  [/\bHID\b|\bmetal halide\b|\bhigh pressure sodium\b/i, 'HID'],
  [/\bfluorescents?\b|\bT(?:5|8|12)\b/i, 'Fluorescent'],
  [/\bhalogens?\b/i, 'Halogen'],
  [/\bincandescents?\b/i, 'Incandescent'],
]

const locationMarker = /\b(?:in|at|inside|outside|exterior|on)\s+(?:the\s+)?(.+?)(?=\s+(?:with|note|notes|that|and note)\b|$)/i
const notesMarker = /\b(?:with|note|notes|and note)\s+(.+)$/i

function titleCase(value: string) {
  return value
    .trim()
    .replace(/[.,;]+$/, '')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function parseFixtureUtterance(rawText: string): Omit<FixtureEntry, 'id' | 'createdAt'> {
  const text = rawText.trim()
  const quantityMatch = text.match(/\b(\d+)\b/)
  const fixture = fixturePatterns.find(([pattern]) => pattern.test(text))
  const technology = technologyPatterns.find(([pattern]) => pattern.test(text))
  const locationMatch = text.match(locationMarker)
  const noteMatch = text.match(notesMarker)

  let location = locationMatch?.[1] ?? ''
  if (/^exterior\b/i.test(locationMatch?.[0] ?? '') && !/^exterior\b/i.test(location)) {
    location = `Exterior ${location}`
  }

  return {
    quantity: quantityMatch ? Math.max(1, Number(quantityMatch[1])) : 1,
    fixtureType: fixture?.[1] ?? 'Other',
    technology: technology?.[1] ?? 'Unknown',
    location: location ? titleCase(location) : 'Unassigned',
    notes: noteMatch ? noteMatch[1].trim() : '',
    rawText: text,
  }
}
