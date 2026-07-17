import { describe, expect, it } from 'vitest'
import { parseContinuationQuantity, parseFixtureUtterance } from './parser'

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

  it('separates fixture quantity from an 8-foot dimension', () => {
    expect(parseFixtureUtterance('there were 8 8-foot LED strip fixtures')).toMatchObject({
      quantity: 8,
      fixtureType: 'Strip Light',
      technology: 'LED',
      notes: '8 ft',
    })
  })

  it('corrects a speech engine collapsing 8, 8-foot into 88 foot', () => {
    expect(parseFixtureUtterance('88 foot LED strip fixtures')).toMatchObject({
      quantity: 8,
      fixtureType: 'Strip Light',
      technology: 'LED',
      notes: '8 ft',
    })
  })

  it('supports repeated multi-digit quantities and dimensions', () => {
    expect(parseFixtureUtterance('1212 foot LED strip fixtures')).toMatchObject({
      quantity: 12,
      fixtureType: 'Strip Light',
      notes: '12 ft',
    })
  })

  it('adds quantities in a compound count and applies its scoped location', () => {
    expect(parseFixtureUtterance('all of the following lights are in the warehouse: 4 LED high bays plus 2 more plus 1 more')).toMatchObject({
      quantity: 7,
      fixtureType: 'High Bay',
      technology: 'LED',
      location: 'Warehouse',
    })
  })

  it('recognizes continuation fragments from speech recognition', () => {
    expect(parseContinuationQuantity('plus 2 more')).toBe(2)
    expect(parseContinuationQuantity('1 more')).toBe(1)
    expect(parseContinuationQuantity('plus 2 more plus 1 more')).toBe(3)
    expect(parseContinuationQuantity('4 LED high bays')).toBeNull()
  })
})
