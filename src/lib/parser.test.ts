import { describe, expect, it } from 'vitest'
import { isRemoveLastCommand, parseContinuationQuantity, parseFixtureUtterance } from './parser'

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
      fixtureType: 'Strip',
      technology: 'Fluorescent',
      location: 'Storage',
      notes: 'damaged lenses',
    })
  })

  it('separates fixture quantity from an 8-foot dimension', () => {
    expect(parseFixtureUtterance('there were 8 8-foot LED strip fixtures')).toMatchObject({
      quantity: 8,
      fixtureType: 'Strip',
      fixtureSize: '8 ft',
      lampCount: 1,
      technology: 'LED',
    })
  })

  it('corrects a speech engine collapsing 8, 8-foot into 88 foot', () => {
    expect(parseFixtureUtterance('88 foot LED strip fixtures')).toMatchObject({
      quantity: 8,
      fixtureType: 'Strip',
      fixtureSize: '8 ft',
      technology: 'LED',
    })
  })

  it('supports repeated multi-digit quantities and dimensions', () => {
    expect(parseFixtureUtterance('1212 foot LED strip fixtures')).toMatchObject({
      quantity: 12,
      fixtureType: 'Strip',
      fixtureSize: '12 ft',
    })
  })

  it.each([
    ['there is 1 8ft fixture', 1, '8 ft'],
    ['18 foot fixture', 1, '8 ft'],
    ['2 8-foot fixtures', 2, '8 ft'],
    ['32 4ft fixtures', 32, '4 ft'],
    ['324 foot fixtures', 32, '4 ft'],
  ])('separates quantity and length in “%s”', (speech, quantity, fixtureSize) => {
    expect(parseFixtureUtterance(speech)).toMatchObject({ quantity, fixtureSize })
  })

  it.each([
    ['4 2 by 4 LED fixtures', 4, '2x4', 'LED', 1],
    ['19 2x2 T12 fixtures', 19, '2x2', 'T12', null],
  ])('separates quantity and rectangular size in “%s”', (speech, quantity, fixtureSize, technology, lampCount) => {
    expect(parseFixtureUtterance(speech)).toMatchObject({ quantity, fixtureSize, technology, lampCount })
  })

  it('parses quantity, fixture dimensions, lamp count, and lamp type independently', () => {
    expect(parseFixtureUtterance('10 1 by 8 by 4-lamp T8 strip fixtures')).toMatchObject({
      quantity: 10,
      fixtureType: 'Strip',
      fixtureSize: '1x8',
      lampCount: 4,
      technology: 'T8',
    })
  })

  it('defaults to one fixture when only its specification is spoken', () => {
    expect(parseFixtureUtterance('1 by 8 by 4-lamp T8 fixture')).toMatchObject({
      quantity: 1,
      fixtureSize: '1x8',
      lampCount: 4,
      technology: 'T8',
    })
  })

  it('normalizes full notation and spoken length notation to the same fixture name', () => {
    const fullNotation = parseFixtureUtterance('10 1 by 8 by 4-lamp T8 strip fixtures')
    const lengthNotation = parseFixtureUtterance('10 8ft 4-lamp T8 strips')

    expect(fullNotation).toMatchObject({
      fixtureName: '1x8x4-lamp T8',
      fixtureWidth: 1,
      fixtureLength: 8,
      lampCount: 4,
      technology: 'T8',
      fixtureType: 'Strip',
    })
    expect(lengthNotation).toMatchObject({
      fixtureName: '1x8x4-lamp T8',
      fixtureWidth: 1,
      fixtureLength: 8,
      lampCount: 4,
      technology: 'T8',
      fixtureType: 'Strip',
    })
  })

  it.each([
    ['surface strip fixture', 'Strip', 'Surface'],
    ['pendant high bay', 'High Bay', 'Pendant'],
    ['recessed troffer', 'Troffer', 'Recessed'],
    ['wrap fixture', 'Wrap', 'Not specified'],
  ])('categorizes fixture and mounting styles in “%s”', (speech, fixtureType, mountingStyle) => {
    expect(parseFixtureUtterance(speech)).toMatchObject({ fixtureType, mountingStyle })
  })

  it('preserves explicit comments verbatim', () => {
    expect(parseFixtureUtterance('4 2x4 T8 troffers in office with Two lamps are burned out')).toMatchObject({
      notes: 'Two lamps are burned out',
      location: 'Office',
    })
    expect(parseFixtureUtterance('8ft 4-lamp T8 strip comment: missing lens on east end')).toMatchObject({
      notes: 'missing lens on east end',
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

  it('recognizes commands to remove the newest count', () => {
    expect(isRemoveLastCommand('remove last line item')).toBe(true)
    expect(isRemoveLastCommand('delete the previous entry')).toBe(true)
    expect(isRemoveLastCommand('undo last count please.')).toBe(true)
    expect(isRemoveLastCommand('remove 4 wall packs')).toBe(false)
  })
})
