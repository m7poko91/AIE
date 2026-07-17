import * as XLSX from 'xlsx'
import type { JobSite } from '../types'

const rowsFor = (job: JobSite) =>
  job.entries.map((entry) => ({
    Quantity: entry.quantity,
    'Fixture Type': entry.fixtureType,
    Technology: entry.technology,
    Location: entry.location,
    Notes: entry.notes,
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
  const sheet = XLSX.utils.json_to_sheet(rowsFor(job))
  const csv = XLSX.utils.sheet_to_csv(sheet)
  download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${safeFileName(job.name)}-light-count.csv`)
}

export function exportExcel(job: JobSite) {
  const workbook = XLSX.utils.book_new()
  const entriesSheet = XLSX.utils.json_to_sheet(rowsFor(job))
  entriesSheet['!cols'] = [{ wch: 10 }, { wch: 22 }, { wch: 16 }, { wch: 24 }, { wch: 30 }, { wch: 45 }, { wch: 22 }]
  XLSX.utils.book_append_sheet(workbook, entriesSheet, 'Fixture Count')

  const byType = Object.entries(
    job.entries.reduce<Record<string, number>>((totals, entry) => {
      totals[entry.fixtureType] = (totals[entry.fixtureType] ?? 0) + entry.quantity
      return totals
    }, {}),
  ).map(([type, quantity]) => ({ 'Fixture Type': type, Quantity: quantity }))
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(byType), 'Summary')
  XLSX.writeFile(workbook, `${safeFileName(job.name)}-light-count.xlsx`)
}
