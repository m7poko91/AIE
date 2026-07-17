export type FixtureEntry = {
  id: string
  quantity: number
  fixtureName: string
  fixtureType: string
  fixtureSize: string
  fixtureWidth: number | null
  fixtureLength: number | null
  lampCount: number | null
  technology: string
  mountingStyle: string
  location: string
  notes: string
  rawText: string
  createdAt: string
}

export type JobSite = {
  id: string
  name: string
  address: string
  entries: FixtureEntry[]
  createdAt: string
}

export const FIXTURE_TYPES = [
  'Strip',
  'Troffer',
  'High Bay',
  'Wrap',
  'Wall Pack',
  'Can Light',
  'Parking Lot Pole',
  'Linear Fixture',
  'Flood Light',
  'Exit Sign',
  'Emergency Light',
  'Other',
] as const

export const MOUNTING_STYLES = ['Surface', 'Pendant', 'Recessed', 'Not specified'] as const

export const LAMP_TYPES = [
  'LED',
  'T5',
  'T8',
  'T12',
  'Fluorescent',
  'HID',
  'Metal Halide',
  'High Pressure Sodium',
  'Halogen',
  'Incandescent',
  'Unknown',
] as const
