import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart3,
  Building2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Lightbulb,
  MapPin,
  Mic,
  MicOff,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { exportCsv, exportExcel } from './lib/export'
import { isRemoveLastCommand, parseContinuationQuantity, parseFixtureUtterance } from './lib/parser'
import { FIXTURE_TYPES, TECHNOLOGIES, type FixtureEntry, type JobSite } from './types'

type SpeechResultEvent = Event & {
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>
  resultIndex: number
}

type SpeechRecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechResultEvent) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

const STORAGE_KEY = 'lightcounter-jobs-v1'

function createId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}

function newJob(name = 'My First Job', address = '') : JobSite {
  return { id: createId(), name, address, entries: [], createdAt: new Date().toISOString() }
}

function App() {
  const [jobs, setJobs] = useState<JobSite[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return [newJob()]
      return (JSON.parse(saved) as JobSite[]).map((job) => (
        job.address === '214 Market Street' ? { ...job, address: '' } : job
      ))
    } catch {
      return [newJob()]
    }
  })
  const [activeJobId, setActiveJobId] = useState(() => jobs[0]?.id ?? '')
  const [isListening, setIsListening] = useState(false)
  const [continuous, setContinuous] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [search, setSearch] = useState('')
  const [showJobModal, setShowJobModal] = useState(false)
  const [editingJobId, setEditingJobId] = useState<string | null>(null)
  const [showExport, setShowExport] = useState(false)
  const [newJobName, setNewJobName] = useState('')
  const [newJobAddress, setNewJobAddress] = useState('')
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const continuousRef = useRef(continuous)
  const voiceContextRef = useRef<Partial<Pick<FixtureEntry, 'fixtureType' | 'technology' | 'location'>>>({})

  const activeJob = jobs.find((job) => job.id === activeJobId) ?? jobs[0]
  const entries = useMemo(() => activeJob?.entries ?? [], [activeJob])
  const speechSupported = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs))
  }, [jobs])

  useEffect(() => {
    continuousRef.current = continuous
  }, [continuous])

  useEffect(() => () => recognitionRef.current?.stop(), [])

  const totalFixtures = entries.reduce((sum, entry) => sum + entry.quantity, 0)
  const locations = new Set(entries.map((entry) => entry.location)).size
  const typeTotals = useMemo(
    () =>
      Object.entries(
        entries.reduce<Record<string, number>>((totals, entry) => {
          totals[entry.fixtureType] = (totals[entry.fixtureType] ?? 0) + entry.quantity
          return totals
        }, {}),
      ).sort((a, b) => b[1] - a[1]),
    [entries],
  )
  const locationTotals = useMemo(
    () =>
      Object.entries(
        entries.reduce<Record<string, number>>((totals, entry) => {
          totals[entry.location] = (totals[entry.location] ?? 0) + entry.quantity
          return totals
        }, {}),
      ).sort((a, b) => b[1] - a[1]),
    [entries],
  )
  const visibleEntries = entries.filter((entry) =>
    `${entry.fixtureType} ${entry.technology} ${entry.location} ${entry.notes}`.toLowerCase().includes(search.toLowerCase()),
  )

  function updateActiveJob(updater: (job: JobSite) => JobSite) {
    setJobs((current) => current.map((job) => (job.id === activeJob.id ? updater(job) : job)))
  }

  function addFromText(text: string) {
    if (!text.trim()) return

    if (isRemoveLastCommand(text)) {
      updateActiveJob((job) => ({ ...job, entries: job.entries.slice(1) }))
      setTranscript('')
      return
    }

    const continuationQuantity = parseContinuationQuantity(text)
    if (continuationQuantity !== null) {
      updateActiveJob((job) => {
        const [latest, ...remaining] = job.entries
        if (!latest) return job
        return {
          ...job,
          entries: [
            {
              ...latest,
              quantity: latest.quantity + continuationQuantity,
              rawText: `${latest.rawText}; ${text.trim()}`,
            },
            ...remaining,
          ],
        }
      })
      setTranscript('')
      return
    }

    const parsed = parseFixtureUtterance(text)
    const isContextOnly = !/\d/.test(text)
      && parsed.fixtureType === 'Other'
      && parsed.location !== 'Unassigned'

    if (isContextOnly) {
      voiceContextRef.current = {
        ...voiceContextRef.current,
        technology: parsed.technology !== 'Unknown' ? parsed.technology : voiceContextRef.current.technology,
        location: parsed.location,
      }
      setTranscript('')
      return
    }

    const entry: FixtureEntry = {
      ...parsed,
      fixtureType: parsed.fixtureType !== 'Other' ? parsed.fixtureType : voiceContextRef.current.fixtureType ?? 'Other',
      technology: parsed.technology !== 'Unknown' ? parsed.technology : voiceContextRef.current.technology ?? 'Unknown',
      location: parsed.location !== 'Unassigned' ? parsed.location : voiceContextRef.current.location ?? 'Unassigned',
      id: createId(),
      createdAt: new Date().toISOString(),
    }
    voiceContextRef.current = {
      fixtureType: entry.fixtureType,
      technology: entry.technology,
      location: entry.location,
    }
    updateActiveJob((job) => ({ ...job, entries: [entry, ...job.entries] }))
    setTranscript('')
  }

  function startListening() {
    if (!speechSupported) return
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!Recognition) return
    const recognition = new Recognition()
    recognition.continuous = continuous
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.onresult = (event) => {
      let words = ''
      let finalWords = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        words += event.results[index][0].transcript
        if (event.results[index].isFinal) finalWords += event.results[index][0].transcript
      }
      setTranscript(words)
      if (finalWords.trim()) addFromText(finalWords)
    }
    recognition.onend = () => {
      if (continuousRef.current) {
        try {
          recognition.start()
        } catch {
          setIsListening(false)
        }
      } else {
        setIsListening(false)
      }
    }
    recognition.onerror = () => setIsListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  function stopListening() {
    continuousRef.current = false
    setContinuous(false)
    recognitionRef.current?.stop()
    setIsListening(false)
  }

  function updateEntry(id: string, field: keyof FixtureEntry, value: string | number) {
    updateActiveJob((job) => ({
      ...job,
      entries: job.entries.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry)),
    }))
  }

  function deleteEntry(id: string) {
    updateActiveJob((job) => ({ ...job, entries: job.entries.filter((entry) => entry.id !== id) }))
  }

  function openJobEditor(job: JobSite) {
    setEditingJobId(job.id)
    setNewJobName(job.name)
    setNewJobAddress(job.address)
    setShowJobModal(true)
  }

  function openNewJob() {
    setEditingJobId(null)
    setNewJobName('')
    setNewJobAddress('')
    setShowJobModal(true)
  }

  function selectJob(job: JobSite) {
    setActiveJobId(job.id)
    voiceContextRef.current = {}
    setEditingJobId(job.id)
    setNewJobName(job.name)
    setNewJobAddress(job.address)
  }

  function saveJob() {
    if (!newJobName.trim()) return

    if (editingJobId) {
      setJobs((current) => current.map((job) => (
        job.id === editingJobId
          ? { ...job, name: newJobName.trim(), address: newJobAddress.trim() }
          : job
      )))
      setShowJobModal(false)
      return
    }

    const job = newJob(newJobName.trim(), newJobAddress.trim())
    setJobs((current) => [...current, job])
    setActiveJobId(job.id)
    voiceContextRef.current = {}
    setNewJobName('')
    setNewJobAddress('')
    setShowJobModal(false)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Lightbulb size={21} strokeWidth={2.5} /></div>
          <span>LightCounter</span>
        </div>
        <nav>
          <a className="nav-item active" href="#dashboard"><BarChart3 size={19} />Dashboard</a>
          <a className="nav-item" href="#counts"><FileSpreadsheet size={19} />Fixture counts</a>
          <a className="nav-item" href="#job"><Building2 size={19} />Job details</a>
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item"><Settings size={19} />Settings</button>
          <div className="user">
            <div className="avatar">ME</div>
            <div><strong>My workspace</strong><span>Electrical estimator</span></div>
            <MoreHorizontal size={17} />
          </div>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div className="job-picker">
            <span className="eyebrow">CURRENT JOB SITE</span>
            <button className="job-select">
              <Building2 size={17} />
              <span>{activeJob.name}</span>
              <ChevronDown size={16} />
            </button>
            <select
              aria-label="Select job site"
              value={activeJob.id}
              onChange={(event) => {
                setActiveJobId(event.target.value)
                voiceContextRef.current = {}
              }}
            >
              {jobs.map((job) => <option key={job.id} value={job.id}>{job.name}</option>)}
            </select>
          </div>
          <div className="header-actions">
            <button className="secondary-button" onClick={openNewJob}><Plus size={17} />New job</button>
            <div className="export-wrap">
              <button className="primary-button" onClick={() => setShowExport((value) => !value)}><Download size={17} />Export<ChevronDown size={14} /></button>
              {showExport && (
                <div className="export-menu">
                  <button onClick={() => { exportCsv(activeJob); setShowExport(false) }}>Export as CSV</button>
                  <button onClick={() => { exportExcel(activeJob); setShowExport(false) }}>Export as Excel</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="content">
          <section className="page-heading" id="dashboard">
            <div>
              <p className="breadcrumb">Job sites <span>/</span> {activeJob.name}</p>
              <h1>Fixture count</h1>
              <p><MapPin size={14} /> {activeJob.address || 'No address added'} <span>•</span> Updated just now</p>
            </div>
            <div className="job-management-actions">
              <button className="secondary-button" onClick={() => openJobEditor(activeJob)}><Pencil size={15} />Manage jobs</button>
              <button className="secondary-button mobile-new-job" onClick={openNewJob}><Plus size={15} />New job</button>
            </div>
          </section>

          <section className={`voice-card ${isListening ? 'listening' : ''}`}>
            <div className="voice-copy">
              <div className="voice-label"><Sparkles size={15} />VOICE COUNT</div>
              <h2>{isListening ? 'Listening…' : 'Count fixtures as you walk'}</h2>
              <p>{isListening ? (transcript || 'Say a quantity, fixture, and location.') : 'Tap the microphone and speak naturally. We’ll sort out the details.'}</p>
              <div className="example"><span>TRY SAYING</span> “20 LED troffers in the east office”</div>
            </div>
            <div className="voice-controls">
              <label className="continuous-toggle">
                <span>Continuous listening</span>
                <input type="checkbox" checked={continuous} onChange={(event) => setContinuous(event.target.checked)} />
                <i />
              </label>
              <button
                className={`mic-button ${isListening ? 'active' : ''}`}
                onClick={isListening ? stopListening : startListening}
                disabled={!speechSupported}
                aria-label={isListening ? 'Stop listening' : 'Start listening'}
              >
                {isListening ? <MicOff size={27} /> : <Mic size={27} />}
              </button>
              <span>{!speechSupported ? 'Speech not supported in this browser' : isListening ? 'Tap to stop' : 'Tap to speak'}</span>
            </div>
          </section>

          <form className="quick-add" onSubmit={(event) => { event.preventDefault(); addFromText(transcript) }}>
            <input value={transcript} onChange={(event) => setTranscript(event.target.value)} placeholder="Or type a count, e.g. “8 high bays in warehouse zone A”" />
            <button className="secondary-button" type="submit" disabled={!transcript.trim()}><Plus size={17} />Add count</button>
          </form>

          <section className="stats-grid">
            <div className="stat-card">
              <span className="stat-icon amber"><Lightbulb size={20} /></span>
              <div><span>Total fixtures</span><strong>{totalFixtures}</strong><small>{entries.length} count {entries.length === 1 ? 'entry' : 'entries'}</small></div>
            </div>
            <div className="stat-card">
              <span className="stat-icon green"><FileSpreadsheet size={20} /></span>
              <div><span>Fixture types</span><strong>{typeTotals.length}</strong><small>{typeTotals[0] ? `${typeTotals[0][0]} is most common` : 'Waiting for first count'}</small></div>
            </div>
            <div className="stat-card">
              <span className="stat-icon blue"><MapPin size={20} /></span>
              <div><span>Locations</span><strong>{locations}</strong><small>{locations ? 'Zones counted on this job' : 'No zones counted yet'}</small></div>
            </div>
          </section>

          <section className="summary-grid">
            <div className="panel">
              <div className="panel-heading"><div><h3>Fixtures by type</h3><p>Quantity across this job site</p></div></div>
              {typeTotals.length ? (
                <div className="bar-list">
                  {typeTotals.slice(0, 5).map(([type, count], index) => (
                    <div className="bar-row" key={type}>
                      <div><span>{type}</span><strong>{count}</strong></div>
                      <div className="bar-track"><i style={{ width: `${Math.max(8, (count / typeTotals[0][1]) * 100)}%`, opacity: 1 - index * 0.1 }} /></div>
                    </div>
                  ))}
                </div>
              ) : <EmptyMini icon={<Lightbulb size={19} />} text="Your fixture summary will appear here." />}
            </div>
            <div className="panel">
              <div className="panel-heading"><div><h3>Top locations</h3><p>Fixtures grouped by zone</p></div></div>
              {locationTotals.length ? (
                <div className="location-list">
                  {locationTotals.slice(0, 5).map(([location, count]) => (
                    <div key={location}><span className="location-pin"><MapPin size={15} /></span><span>{location}</span><strong>{count}</strong></div>
                  ))}
                </div>
              ) : <EmptyMini icon={<MapPin size={19} />} text="Locations are detected from your counts." />}
            </div>
          </section>

          <section className="table-panel" id="counts">
            <div className="table-header">
              <div><h3>Counted fixtures</h3><p>Edit any field if voice capture needs a correction.</p></div>
              <div className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search counts" /></div>
            </div>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Qty</th><th>Fixture type</th><th>Technology</th><th>Location / zone</th><th>Notes</th><th aria-label="Actions" /></tr></thead>
                <tbody>
                  {visibleEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td><input className="qty-input" type="number" min="1" value={entry.quantity} onChange={(event) => updateEntry(entry.id, 'quantity', Math.max(1, Number(event.target.value)))} /></td>
                      <td><select value={entry.fixtureType} onChange={(event) => updateEntry(entry.id, 'fixtureType', event.target.value)}>{FIXTURE_TYPES.map((type) => <option key={type}>{type}</option>)}</select></td>
                      <td><select value={entry.technology} onChange={(event) => updateEntry(entry.id, 'technology', event.target.value)}>{TECHNOLOGIES.map((type) => <option key={type}>{type}</option>)}</select></td>
                      <td><input value={entry.location} onChange={(event) => updateEntry(entry.id, 'location', event.target.value)} /></td>
                      <td><input value={entry.notes} onChange={(event) => updateEntry(entry.id, 'notes', event.target.value)} placeholder="Add note" /></td>
                      <td><button className="icon-button danger" onClick={() => deleteEntry(entry.id)} title="Delete entry"><Trash2 size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!visibleEntries.length && (
                <div className="empty-table">
                  <span><Mic size={23} /></span>
                  <h4>{entries.length ? 'No matching counts' : 'Ready for your first count'}</h4>
                  <p>{entries.length ? 'Try a different search.' : 'Use the microphone above or type a count to get started.'}</p>
                </div>
              )}
            </div>
            <div className="table-footer"><span>{visibleEntries.length} {visibleEntries.length === 1 ? 'entry' : 'entries'}</span><strong>{totalFixtures} total fixtures</strong></div>
          </section>
        </div>
      </main>

      {showJobModal && (
        <div className="modal-backdrop" onMouseDown={() => setShowJobModal(false)}>
          <div className="modal job-modal" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowJobModal(false)}><X size={19} /></button>
            <span className="modal-icon"><Building2 size={22} /></span>
            <h2>{editingJobId ? 'Manage job sites' : 'Create a job site'}</h2>
            <p>{editingJobId ? 'Switch projects or update the selected job’s details.' : 'Start a separate fixture count for a new project.'}</p>
            {editingJobId && (
              <div className="saved-jobs">
                <div className="saved-jobs-heading">
                  <strong>Saved projects</strong>
                  <button onClick={openNewJob}><Plus size={14} />New</button>
                </div>
                <div className="saved-jobs-list">
                  {jobs.map((job) => (
                    <button className={job.id === editingJobId ? 'active' : ''} key={job.id} onClick={() => selectJob(job)}>
                      <span><strong>{job.name}</strong><small>{job.address || 'No address'}</small></span>
                      <b>{job.entries.reduce((sum, entry) => sum + entry.quantity, 0)}</b>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <label>Job site name<input autoFocus value={newJobName} onChange={(event) => setNewJobName(event.target.value)} placeholder="e.g. Riverside Medical Center" /></label>
            <label>Address <small>Optional</small><input value={newJobAddress} onChange={(event) => setNewJobAddress(event.target.value)} placeholder="Street address or project number" /></label>
            <div className="storage-note">Saved automatically on this device and browser.</div>
            <div className="modal-actions"><button className="secondary-button" onClick={() => setShowJobModal(false)}>Cancel</button><button className="primary-button" onClick={saveJob} disabled={!newJobName.trim()}>{editingJobId ? 'Save changes' : 'Create job'}</button></div>
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyMini({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="empty-mini"><span>{icon}</span><p>{text}</p></div>
}

export default App
