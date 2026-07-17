import writeXlsxFile, { type SheetData } from 'write-excel-file/browser'
import type { JobSite } from '../types'

const rowsFor = (job: JobSite) =>
  job.entries.map((entry) => ({
    'Fixture Name': entry.fixtureName,
    Quantity: entry.quantity,
    'Length (ft)': entry.fixtureLength ?? '',
    'Lamps per Fixture': entry.lampCount ?? '',
    'Lamp Type': entry.technology,
    'Fixture Type': entry.fixtureType,
    'Mounting Style': entry.mountingStyle,
    Location: entry.location,
    Comments: entry.notes,
    'Original Voice Note': entry.rawText,
    'Counted At': new Date(entry.createdAt).toLocaleString(),
  }))

const safeFileName = (name: string) => name.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export function exportCsv(job: JobSite) {
  const rows = rowsFor(job)
  const headers = Object.keys(rows[0] ?? {
    'Fixture Name': '',
    Quantity: '',
    'Length (ft)': '',
    'Lamps per Fixture': '',
    'Lamp Type': '',
    'Fixture Type': '',
    'Mounting Style': '',
    Location: '',
    Comments: '',
    'Original Voice Note': '',
    'Counted At': '',
  })
  const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const csv = [headers.map(escape), ...rows.map((row) => Object.values(row).map(escape))]
    .map((row) => row.join(','))
    .join('\r\n')
  download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${safeFileName(job.name)}-light-count.csv`)
}

export async function exportExcel(job: JobSite) {
  const headers = ['Fixture Name', 'Quantity', 'Length (ft)', 'Lamps per Fixture', 'Lamp Type', 'Fixture Type', 'Mounting Style', 'Location', 'Comments', 'Original Voice Note', 'Counted At']
  const headerRow = headers.map((value) => ({ value, fontWeight: 'bold' as const, backgroundColor: '#E7EFE8' }))
  const entryRows: SheetData = [
    headerRow,
    ...job.entries.map((entry) => [
      entry.fixtureName,
      entry.quantity,
      entry.fixtureLength,
      entry.lampCount,
      entry.technology,
      entry.fixtureType,
      entry.mountingStyle,
      entry.location,
      entry.notes,
      entry.rawText,
      new Date(entry.createdAt).toLocaleString(),
    ]),
  ]
  const totals = Object.entries(
    job.entries.reduce<Record<string, number>>((totals, entry) => {
      totals[entry.fixtureType] = (totals[entry.fixtureType] ?? 0) + entry.quantity
      return totals
    }, {}),
  )
  const lampTypeTotals = Object.entries(
    job.entries.reduce<Record<string, number>>((totals, entry) => {
      totals[entry.technology] = (totals[entry.technology] ?? 0) + entry.quantity
      return totals
    }, {}),
  )
  const summaryRows: SheetData = [
    [
      { value: 'Fixture Type', fontWeight: 'bold', backgroundColor: '#E7EFE8' },
      { value: 'Quantity', fontWeight: 'bold', backgroundColor: '#E7EFE8' },
    ],
    ...totals.map(([type, quantity]) => [type, quantity]),
    [],
    [
      { value: 'Lamp Type', fontWeight: 'bold', backgroundColor: '#E7EFE8' },
      { value: 'Quantity', fontWeight: 'bold', backgroundColor: '#E7EFE8' },
    ],
    ...lampTypeTotals.map(([type, quantity]) => [type, quantity]),
    [],
    [{ value: 'Grand Total', fontWeight: 'bold' }, { value: job.entries.reduce((sum, entry) => sum + entry.quantity, 0), fontWeight: 'bold' }],
  ]

  await writeXlsxFile([
    { data: entryRows, sheet: 'Fixture Count', columns: [{ width: 28 }, { width: 12 }, { width: 14 }, { width: 18 }, { width: 18 }, { width: 20 }, { width: 18 }, { width: 25 }, { width: 32 }, { width: 48 }, { width: 22 }] },
    { data: summaryRows, sheet: 'Summary', columns: [{ width: 24 }, { width: 14 }] },
  ]).toFile(`${safeFileName(job.name)}-light-count.xlsx`)
}
