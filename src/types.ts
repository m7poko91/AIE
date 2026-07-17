export type FixtureEntry = {
  id: string
  quantity: number
  fixtureType: string
  technology: string
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
  'Troffer',
  'High Bay',
  'Wall Pack',
  'Can Light',
  'Parking Lot Pole',
  'Strip Light',
  'Linear Fixture',
  'Flood Light',
  'Exit Sign',
  'Emergency Light',
  'Other',
] as const

export const TECHNOLOGIES = ['LED', 'HID', 'Fluorescent', 'Halogen', 'Incandescent', 'Unknown'] as const
