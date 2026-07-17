import type { FixtureEntry } from '../types'

const fixturePatterns: Array<[RegExp, string]> = [
  [/\b(?:led\s+)?troffers?\b/i, 'Troffer'],
  [/\bhigh[\s-]?bays?(?:\s+lights?)?\b/i, 'High Bay'],
  [/\bwall[\s-]?packs?\b/i, 'Wall Pack'],
  [/\b(?:can|recessed)\s+lights?\b/i, 'Can Light'],
  [/\b(?:parking\s+lot\s+)?(?:poles?|pole\s+lights?)\b/i, 'Parking Lot Pole'],
  [/\bstrip\s+(?:lights?|fixtures?)\b/i, 'Strip Light'],
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

function parseQuantityAndDimension(text: string) {
  // Speech engines commonly return “8, 8-foot” as either “8 8 foot” or
  // the collapsed “88 foot”. Treat the first number as the count and the
  // repeated number as the fixture length.
  const separatedDimension = text.match(/\b(\d+)\s*(?:,|-)?\s+(\d+)\s*-?\s*(?:ft|foot|feet)\b/i)
  if (separatedDimension) {
    return {
      quantity: Number(separatedDimension[1]),
      dimension: Number(separatedDimension[2]),
    }
  }

  const collapsedDimension = text.match(/\b(\d{1,2})\1\s*-?\s*(?:ft|foot|feet)\b/i)
  if (collapsedDimension) {
    return {
      quantity: Number(collapsedDimension[1]),
      dimension: Number(collapsedDimension[1]),
    }
  }

  const quantityMatch = text.match(/\b(\d+)\b/)
  return {
    quantity: quantityMatch ? Number(quantityMatch[1]) : 1,
    dimension: undefined,
  }
}

export function parseFixtureUtterance(rawText: string): Omit<FixtureEntry, 'id' | 'createdAt'> {
  const text = rawText.trim()
  const { quantity, dimension } = parseQuantityAndDimension(text)
  const fixture = fixturePatterns.find(([pattern]) => pattern.test(text))
  const technology = technologyPatterns.find(([pattern]) => pattern.test(text))
  const locationMatch = text.match(locationMarker)
  const noteMatch = text.match(notesMarker)

  let location = locationMatch?.[1] ?? ''
  if (/^exterior\b/i.test(locationMatch?.[0] ?? '') && !/^exterior\b/i.test(location)) {
    location = `Exterior ${location}`
  }

  return {
    quantity: Math.max(1, quantity),
    fixtureType: fixture?.[1] ?? 'Other',
    technology: technology?.[1] ?? 'Unknown',
    location: location ? titleCase(location) : 'Unassigned',
    notes: [dimension ? `${dimension} ft` : '', noteMatch?.[1].trim() ?? ''].filter(Boolean).join('; '),
    rawText: text,
  }
}
