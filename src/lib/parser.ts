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
  [/\bT[\s-]?12\b/i, 'T12'],
  [/\bT[\s-]?8\b/i, 'T8'],
  [/\bT[\s-]?5\b/i, 'T5'],
  [/\bmetal halide\b/i, 'Metal Halide'],
  [/\b(?:high pressure sodium|HPS)\b/i, 'High Pressure Sodium'],
  [/\bHID\b/i, 'HID'],
  [/\bfluorescents?\b/i, 'Fluorescent'],
  [/\bhalogens?\b/i, 'Halogen'],
  [/\bincandescents?\b/i, 'Incandescent'],
]

const scopedLocationMarker = /\ball (?:of )?(?:the )?following lights? (?:are|will be|are located) (?:in|at) (?:the )?(.+?)(?=\s*[:,.]|\s+\d+\b|$)/i
const locationMarker = /\b(?:in|at|inside|outside|exterior|on)\s+(?:the\s+)?(.+?)(?=\s+(?:with|note|notes|that|and note)\b|$)/i
const notesMarker = /\b(?:with|note|notes|and note)\s+(.+)$/i

function titleCase(value: string) {
  return value
    .trim()
    .replace(/[.,;]+$/, '')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function parseContinuationQuantity(text: string): number | null {
  if (!/^\s*(?:(?:and|plus)\s+)?\d+\s+more\b/i.test(text)) return null

  const quantities = [...text.matchAll(/\b(\d+)\s+more\b/gi)]
  return quantities.reduce((total, match) => total + Number(match[1]), 0)
}

export function isRemoveLastCommand(text: string): boolean {
  const command = text.trim().replace(/[.,!?]+$/, '')
  return /^(?:please\s+)?(?:remove|delete|undo)(?:\s+the)?\s+(?:last|latest|previous)(?:\s+(?:line\s+item|item|entry|count|fixture))?(?:\s+please)?$/i.test(command)
}

function lastNumber(text: string): number | null {
  const matches = [...text.matchAll(/\b(\d+)\b/g)]
  return matches.length ? Number(matches.at(-1)?.[1]) : null
}

function parseFixtureSpecification(text: string) {
  const continuationQuantity = parseContinuationQuantity(text)
  if (continuationQuantity !== null) {
    return { quantity: continuationQuantity, fixtureSize: '', lampCount: null }
  }

  // A fixture specification such as “10, 1 by 8 by 4-lamp fixtures”.
  // The first two values describe fixture size and the final value is lamps.
  const sizeAndLamps = text.match(/\b(\d+)\s*(?:x|by)\s*(\d+)\s*(?:x|by)\s*(\d+)\s*-?\s*lamps?\b/i)
  if (sizeAndLamps?.index !== undefined) {
    const quantity = lastNumber(text.slice(0, sizeAndLamps.index)) ?? 1
    return {
      quantity,
      fixtureSize: `${Number(sizeAndLamps[1])}x${Number(sizeAndLamps[2])}`,
      lampCount: Number(sizeAndLamps[3]),
    }
  }

  // Standard ceiling fixture notation such as “19, 2 by 2 fixtures”.
  const rectangularSize = text.match(/\b(\d+)\s*(?:x|by)\s*(\d+)\b/i)
  if (rectangularSize?.index !== undefined) {
    const quantity = lastNumber(text.slice(0, rectangularSize.index)) ?? 1
    const explicitLampCount = text.match(/\b(\d+)\s*-?\s*lamps?\b/i)
    return {
      quantity,
      fixtureSize: `${Number(rectangularSize[1])}x${Number(rectangularSize[2])}`,
      lampCount: explicitLampCount ? Number(explicitLampCount[1]) : null,
    }
  }

  // Length notation. Mobile speech recognition may collapse “1, 8-foot”
  // into “18 foot”, so split a trailing common fixture length (2, 4, or 8)
  // from the preceding fixture quantity.
  const length = text.match(/\b(\d+)\s*-?\s*(?:ft|foot|feet)\b/i)
  if (length?.index !== undefined) {
    const beforeLength = lastNumber(text.slice(0, length.index))
    const spokenNumber = length[1]
    let quantity = beforeLength ?? 1
    let feet = Number(spokenNumber)

    if (beforeLength === null && spokenNumber.length > 1) {
      const midpoint = spokenNumber.length / 2
      const repeatedDimension = Number.isInteger(midpoint)
        && spokenNumber.slice(0, midpoint) === spokenNumber.slice(midpoint)

      if (repeatedDimension) {
        quantity = Number(spokenNumber.slice(0, midpoint))
        feet = quantity
      } else if (/[248]$/.test(spokenNumber)) {
        quantity = Number(spokenNumber.slice(0, -1))
        feet = Number(spokenNumber.at(-1))
      }
    }

    const explicitLampCount = text.match(/\b(\d+)\s*-?\s*lamps?\b/i)
    return {
      quantity,
      fixtureSize: `${feet} ft`,
      lampCount: explicitLampCount ? Number(explicitLampCount[1]) : null,
    }
  }

  const quantityMatch = text.match(/\b(\d+)\b/)
  const additions = [...text.matchAll(/\b(?:plus|and)\s+(\d+)\s+more\b/gi)]
    .reduce((total, match) => total + Number(match[1]), 0)
  const explicitLampCount = text.match(/\b(\d+)\s*-?\s*lamps?\b/i)
  return {
    quantity: (quantityMatch ? Number(quantityMatch[1]) : 1) + additions,
    fixtureSize: '',
    lampCount: explicitLampCount ? Number(explicitLampCount[1]) : null,
  }
}

export function parseFixtureUtterance(rawText: string): Omit<FixtureEntry, 'id' | 'createdAt'> {
  const text = rawText.trim()
  const specification = parseFixtureSpecification(text)
  const fixture = fixturePatterns.find(([pattern]) => pattern.test(text))
  const technology = technologyPatterns.find(([pattern]) => pattern.test(text))
  const locationMatch = text.match(scopedLocationMarker) ?? text.match(locationMarker)
  const noteMatch = text.match(notesMarker)

  let location = locationMatch?.[1] ?? ''
  if (/^exterior\b/i.test(locationMatch?.[0] ?? '') && !/^exterior\b/i.test(location)) {
    location = `Exterior ${location}`
  }

  return {
    quantity: Math.max(1, specification.quantity),
    fixtureType: fixture?.[1] ?? 'Other',
    fixtureSize: specification.fixtureSize,
    lampCount: specification.lampCount ?? (technology?.[1] === 'LED' ? 1 : null),
    technology: technology?.[1] ?? 'Unknown',
    location: location ? titleCase(location) : 'Unassigned',
    notes: noteMatch?.[1].trim() ?? '',
    rawText: text,
  }
}
