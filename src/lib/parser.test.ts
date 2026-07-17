import { describe, expect, it } from 'vitest'
import { parseFixtureUtterance } from './parser'

describe('parseFixtureUtterance', () => {
  it('parses LED troffers and office location', () => {
    expect(parseFixtureUtterance('20 LED troffers in the office')).toMatchObject({
      quantity: 20,
      fixtureType: 'Troffer',
      technology: 'LED',
      location: 'Office',
    })
  })

  it('parses high bays and a warehouse zone', () => {
    expect(parseFixtureUtterance('8 high bay lights in warehouse zone A')).toMatchObject({
      quantity: 8,
      fixtureType: 'High Bay',
      location: 'Warehouse Zone A',
    })
  })

  it('preserves exterior context for wall packs', () => {
    expect(parseFixtureUtterance('4 wall packs exterior east side')).toMatchObject({
      quantity: 4,
      fixtureType: 'Wall Pack',
      location: 'Exterior East Side',
    })
  })

  it('extracts notes separately from location', () => {
    expect(parseFixtureUtterance('6 fluorescent strip lights in storage with damaged lenses')).toMatchObject({
      quantity: 6,
      fixtureType: 'Strip Light',
      technology: 'Fluorescent',
      location: 'Storage',
      notes: 'damaged lenses',
    })
  })
})
