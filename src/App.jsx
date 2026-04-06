import { useEffect, useMemo, useRef, useState } from 'react'

const APP_VERSION = __APP_VERSION__
const STEP_MINUTES = 15
const PX_PER_MINUTE = 2
const LEFT_COL_WIDTH = 140

function toDateTime(value) {
  return new Date(value.replace(' ', 'T'))
}

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes()
}

function roundDownToStep(mins, step = STEP_MINUTES) {
  return Math.floor(mins / step) * step
}

function roundUpToStep(mins, step = STEP_MINUTES) {
  return Math.ceil(mins / step) * step
}

function formatDay(isoDate) {
  const d = new Date(`${isoDate}T00:00:00`)
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d)
}

function formatTimeLabel(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function formatTimeRange(start, end) {
  return `${formatTimeLabel(start)}–${formatTimeLabel(end)}`
}

function splitLocationName(name = '') {
  const idx = name.indexOf('-')
  if (idx === -1) return { primary: name.trim(), secondary: '' }
  return {
    primary: name.slice(0, idx).trim(),
    secondary: name.slice(idx + 1).trim(),
  }
}

function getSessionType(title = '') {
  const t = title.toLowerCase()
  if (t.includes('pool closed')) return 'closed'
  if (t.includes('lane swimming') || t.includes('casual swimming')) return 'lane'
  if (t.includes('family fun')) return 'family'
  if (t.includes('lesson') || t.includes('learn to swim')) return 'lesson'
  return 'other'
}

function isBookable(item) {
  const n = Number(item?.availability)
  return Number.isFinite(n) && n >= 0
}

function getSessionClasses(type) {
  if (type === 'closed') return { bar: 'bg-red-600/95', sub: 'text-red-100' }
  if (type === 'lane') return { bar: 'bg-blue-600/90', sub: 'text-blue-100' }
  if (type === 'family') return { bar: 'bg-emerald-600/90', sub: 'text-emerald-100' }
  if (type === 'lesson') return { bar: 'bg-violet-600/90', sub: 'text-violet-100' }
  return { bar: 'bg-slate-700/90', sub: 'text-slate-200' }
}

async function loadData() {
  const res = await fetch('./data/schedules.json', { cache: 'no-store' })
  if (!res.ok) throw new Error('Could not load timetable data')

  const data = await res.json()
  return { ...data, source: data?.source || 'github-actions-fetch' }
}

function parseCsvParam(params, key) {
  const raw = params.get(key)
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function stackItemsIntoLanes(items) {
  const laneEndMinutes = []

  return items.map((item) => {
    let lane = 0
    while (lane < laneEndMinutes.length && item.startMinutes < laneEndMinutes[lane]) lane += 1

    if (lane === laneEndMinutes.length) laneEndMinutes.push(item.endMinutes)
    else laneEndMinutes[lane] = item.endMinutes

    return { ...item, lane }
  })
}

function DayGrid({ day, nowMinutes, isToday, onSelectItem, compactMode, autoScrollToNow }) {
  const scrollerRef = useRef(null)
  const didAutoScrollRef = useRef(false)

  const minStart = Math.min(...day.items.map((i) => i.startMinutes))
  const maxEnd = Math.max(...day.items.map((i) => i.endMinutes))
  const dayStart = roundDownToStep(minStart)
  const dayEnd = roundUpToStep(maxEnd)
  const totalMinutes = dayEnd - dayStart

  const ticks = []
  for (let t = dayStart; t <= dayEnd; t += STEP_MINUTES) ticks.push(t)

  const showNowLine = isToday && nowMinutes >= dayStart && nowMinutes <= dayEnd
  const nowX = (nowMinutes - dayStart) * PX_PER_MINUTE

  useEffect(() => {
    if (!autoScrollToNow || !isToday || !showNowLine || didAutoScrollRef.current) return

    const scroller = scrollerRef.current
    if (!scroller) return

    const target = Math.max(nowX - scroller.clientWidth * 0.35, 0)
    scroller.scrollLeft = target
    didAutoScrollRef.current = true
  }, [autoScrollToNow, isToday, nowX, showNowLine])

  return (
    <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="border-b border-slate-200 bg-slate-100/70 px-4 py-3 md:px-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700 md:text-base">
          {formatDay(day.date)}
        </h2>
        <p className="mt-1 text-xs text-slate-500">{formatTimeRange(dayStart, dayEnd)}</p>
      </div>

      <div ref={scrollerRef} className="overflow-x-auto">
        <div className="min-w-full" style={{ minWidth: LEFT_COL_WIDTH + totalMinutes * PX_PER_MINUTE }}>
          <div
            className="sticky top-0 z-10 flex border-b border-slate-200 bg-white"
            style={{ width: LEFT_COL_WIDTH + totalMinutes * PX_PER_MINUTE }}
          >
            <div
              className="sticky left-0 z-20 shrink-0 border-r border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
              style={{ width: LEFT_COL_WIDTH }}
            >
              Location
            </div>

            <div className="relative shrink-0" style={{ width: totalMinutes * PX_PER_MINUTE }}>
              {ticks.map((t) => {
                const x = (t - dayStart) * PX_PER_MINUTE
                const isHour = t % 60 === 0
                return (
                  <div key={t}>
                    <div
                      className={`absolute top-0 h-full border-l ${isHour ? 'border-slate-300' : 'border-slate-200'}`}
                      style={{ left: x }}
                    />
                    {isHour && (
                      <span
                        className="absolute top-2 -translate-x-1/2 text-[11px] font-medium text-slate-600"
                        style={{ left: x }}
                      >
                        {formatTimeLabel(t)}
                      </span>
                    )}
                  </div>
                )
              })}
              {showNowLine && <div className="absolute top-0 bottom-0 w-0.5 bg-orange-500" style={{ left: nowX }} />}
              <div className="h-10" />
            </div>
          </div>

          <ul className="divide-y divide-slate-100">
            {day.locations.map((location) => {
              const { primary, secondary } = splitLocationName(location.name)
              const stackedItems = stackItemsIntoLanes(location.items)
              const laneCount = Math.max(...stackedItems.map((i) => i.lane + 1), 1)
              const laneHeight = compactMode ? 48 : 72
              const laneGap = 4
              const topPad = 4
              const bottomPad = 4
              const rowHeight = topPad + bottomPad + laneCount * laneHeight + (laneCount - 1) * laneGap

              return (
                <li
                  key={location.name}
                  className="flex"
                  style={{ width: LEFT_COL_WIDTH + totalMinutes * PX_PER_MINUTE }}
                >
                  <div
                    className="sticky left-0 z-10 shrink-0 border-r border-slate-200 bg-white px-3 py-3"
                    style={{ width: LEFT_COL_WIDTH }}
                  >
                    <p className={`${compactMode ? 'text-[11px]' : 'text-xs'} font-semibold text-slate-900`}>
                      {primary}
                    </p>
                    {secondary && <p className="mt-0.5 text-[10px] leading-tight text-slate-500">{secondary}</p>}
                    <p className="mt-1 hidden text-[11px] text-slate-500 sm:block">{location.items.length} session(s)</p>
                  </div>

                  <div className="relative shrink-0" style={{ width: totalMinutes * PX_PER_MINUTE, height: rowHeight }}>
                    {ticks.map((t) => {
                      const x = (t - dayStart) * PX_PER_MINUTE
                      const isHour = t % 60 === 0
                      return (
                        <div
                          key={t}
                          className={`absolute top-0 h-full border-l ${isHour ? 'border-slate-200' : 'border-slate-100'}`}
                          style={{ left: x }}
                        />
                      )
                    })}

                    {showNowLine && <div className="absolute top-0 bottom-0 w-0.5 bg-orange-500" style={{ left: nowX }} />}

                    {stackedItems.map((item, idx) => {
                      const left = (item.startMinutes - dayStart) * PX_PER_MINUTE
                      const width = Math.max((item.endMinutes - item.startMinutes) * PX_PER_MINUTE, 8)
                      const type = getSessionType(item.title)
                      const classes = getSessionClasses(type)
                      const bookable = isBookable(item)
                      const y = topPad + item.lane * (laneHeight + laneGap)

                      return (
                        <button
                          key={`${item.start_time}-${item.title}-${idx}`}
                          type="button"
                          onClick={() => onSelectItem(item)}
                          className={`absolute overflow-hidden rounded-md px-2 py-1 text-left ${compactMode ? 'text-[10px]' : 'text-[11px]'} text-white shadow-sm transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-400 ${classes.bar}`}
                          style={{ left, width, top: y, height: laneHeight }}
                          title={`${item.title} • ${formatTimeRange(item.startMinutes, item.endMinutes)}`}
                        >
                          {bookable && (
                            <span
                              className="absolute right-1 top-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-amber-500 bg-amber-300/95 text-[9px] leading-none text-slate-900 shadow-sm"
                              title="Bookable class"
                            >
                              ★
                            </span>
                          )}
                          <p className="truncate font-medium">{item.title}</p>
                          {!compactMode && item.subtitle && <p className={`truncate ${classes.sub}`}>{item.subtitle}</p>}
                        </button>
                      )
                    })}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}

export default function App() {
  const [data, setData] = useState({ updatedAt: null, items: [], source: 'loading' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedVenues, setSelectedVenues] = useState([])
  const [selectedLocations, setSelectedLocations] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [compactMode, setCompactMode] = useState(false)
  const [now, setNow] = useState(new Date())

  const venuesInitRef = useRef(false)
  const locationsInitRef = useRef(false)
  const autoScrollRef = useRef(true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setCompactMode(params.get('compact') === '1')
  }, [])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const d = await loadData()
        if (!cancelled) setData(d)
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load timetable')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const allVenues = useMemo(() => {
    const set = new Set((data.items ?? []).map((i) => i.venue_name || 'Unknown venue'))
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [data.items])

  useEffect(() => {
    if (!allVenues.length) return

    if (!venuesInitRef.current) {
      const params = new URLSearchParams(window.location.search)
      const fromUrl = parseCsvParam(params, 'venues')
      const valid = fromUrl.filter((v) => allVenues.includes(v))

      if (valid.length) {
        setSelectedVenues([valid[0]])
      } else {
        const defaultVenue = 'Royal Commonwealth Pool'
        setSelectedVenues(allVenues.includes(defaultVenue) ? [defaultVenue] : [])
      }

      venuesInitRef.current = true
      return
    }

    setSelectedVenues((prev) => prev.filter((v) => allVenues.includes(v)))
  }, [allVenues])

  const venueFilteredItems = useMemo(() => {
    if (!selectedVenues.length) return []
    const allowed = new Set(selectedVenues)
    return (data.items ?? []).filter((item) => allowed.has(item.venue_name || 'Unknown venue'))
  }, [data.items, selectedVenues])

  const allLocations = useMemo(() => {
    const set = new Set((venueFilteredItems ?? []).map((i) => i.location_name || 'Unknown location'))
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [venueFilteredItems])

  useEffect(() => {
    if (!allLocations.length) {
      setSelectedLocations([])
      return
    }

    if (!locationsInitRef.current) {
      const params = new URLSearchParams(window.location.search)
      const fromUrl = parseCsvParam(params, 'locations')
      const valid = fromUrl.filter((v) => allLocations.includes(v))
      setSelectedLocations(valid)
      locationsInitRef.current = true
      return
    }

    setSelectedLocations((prev) => prev.filter((loc) => allLocations.includes(loc)))
  }, [allLocations])

  useEffect(() => {
    if (!venuesInitRef.current) return

    const params = new URLSearchParams(window.location.search)

    if (selectedVenues.length) params.set('venues', selectedVenues.join(','))
    else params.delete('venues')

    if (selectedLocations.length) params.set('locations', selectedLocations.join(','))
    else params.delete('locations')

    if (compactMode) params.set('compact', '1')
    else params.delete('compact')

    const qs = params.toString()
    const nextUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}`
    window.history.replaceState({}, '', nextUrl)
  }, [selectedVenues, selectedLocations, compactMode])

  const filteredItems = useMemo(() => {
    if (!selectedLocations.length) return venueFilteredItems
    const allowed = new Set(selectedLocations)
    return venueFilteredItems.filter((item) => allowed.has(item.location_name || 'Unknown location'))
  }, [venueFilteredItems, selectedLocations])

  const grouped = useMemo(() => {
    const map = new Map()

    for (const item of filteredItems) {
      const start = toDateTime(item.start_time)
      const end = toDateTime(item.end_time)
      const withMinutes = {
        ...item,
        venue_name: item.venue_name || 'Unknown venue',
        location_name: item.location_name || 'Unknown location',
        startMinutes: minutesSinceMidnight(start),
        endMinutes: minutesSinceMidnight(end),
      }

      if (!map.has(item.date)) map.set(item.date, [])
      map.get(item.date).push(withMinutes)
    }

    return [...map.entries()]
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([date, items]) => {
        const byLocation = new Map()
        for (const item of items) {
          if (!byLocation.has(item.location_name)) byLocation.set(item.location_name, [])
          byLocation.get(item.location_name).push(item)
        }

        const locations = [...byLocation.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([name, locItems]) => ({
            name,
            items: locItems.sort((x, y) => x.startMinutes - y.startMinutes),
          }))

        return { date, items, locations }
      })
  }, [filteredItems])

  const toggleVenue = (venue) => {
    autoScrollRef.current = false
    setSelectedVenues((prev) => {
      if (prev.length === 1 && prev[0] === venue) return []
      return [venue]
    })
  }

  const clearVenueSelection = () => {
    autoScrollRef.current = false
    setSelectedVenues([])
  }

  const toggleLocation = (location) => {
    autoScrollRef.current = false
    setSelectedLocations((prev) => {
      if (prev.includes(location)) return prev.filter((l) => l !== location)
      return [...prev, location]
    })
  }

  const selectAllLocations = () => {
    autoScrollRef.current = false
    setSelectedLocations((prev) => (prev.length === allLocations.length ? [] : allLocations))
  }

  const todayIso = now.toISOString().slice(0, 10)
  const nowMinutes = minutesSinceMidnight(now)

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto w-full max-w-7xl px-3 py-5 md:px-6 md:py-8">
        <header className="mb-5 md:mb-7">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight md:text-4xl">Edinburgh Leisure Timetables</h1>
            <a href="./about.html" className="mt-1 text-xs font-medium text-blue-700 hover:text-blue-800">
              About
            </a>
          </div>
          <></>
          <p className="mt-1 text-xs text-slate-500">
            Version: v{APP_VERSION} • Source: {data.source}
            {data.updatedAt ? ` • Updated ${new Date(data.updatedAt).toLocaleString('en-GB')}` : ''}
          </p>
        </header>

        <section className="mb-4 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200 md:mb-6 md:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-800">Filters & View</h2>
            <button
              type="button"
              onClick={() => setCompactMode((v) => !v)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                compactMode
                  ? 'border-slate-800 bg-slate-800 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
              }`}
            >
              Compact mode: {compactMode ? 'On' : 'Off'}
            </button>
          </div>

          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-800">Venue filters</h3>
            <button
              type="button"
              onClick={clearVenueSelection}
              className="text-xs font-medium text-blue-700 hover:text-blue-800"
            >
              Clear
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {allVenues.map((venue) => {
              const active = selectedVenues.includes(venue)
              return (
                <button
                  key={venue}
                  type="button"
                  onClick={() => toggleVenue(venue)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                  }`}
                >
                  {venue}
                </button>
              )
            })}
          </div>

          <div className="mt-4 mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-800">Location filters</h3>
            <button
              type="button"
              onClick={selectAllLocations}
              className="text-xs font-medium text-blue-700 hover:text-blue-800"
            >
              Select all
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {allLocations.map((location) => {
              const active = selectedLocations.includes(location)
              return (
                <button
                  key={location}
                  type="button"
                  onClick={() => toggleLocation(location)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                  }`}
                >
                  {location}
                </button>
              )
            })}
          </div>
        </section>

        {loading && <p className="text-sm text-slate-600">Loading timetable…</p>}
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {!loading && !error && selectedVenues.length === 0 && (
          <p className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800 shadow-sm ring-1 ring-blue-200">
            Select a venue to view its timetable.
          </p>
        )}

        {!loading && !error && selectedVenues.length > 0 && grouped.length === 0 && (
          <p className="rounded-lg bg-white p-4 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
            No activities found for selected venue/location filters.
          </p>
        )}

        <div className="space-y-4 md:space-y-6">
          {grouped.map((day) => (
            <DayGrid
              key={day.date}
              day={day}
              nowMinutes={nowMinutes}
              isToday={day.date === todayIso}
              onSelectItem={setSelectedItem}
              compactMode={compactMode}
              autoScrollToNow={autoScrollRef.current}
            />
          ))}
        </div>
      </div>

      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-3 md:items-center"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white p-4 shadow-xl ring-1 ring-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900">Session details</h3>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Title</dt>
                <dd className="text-slate-900">{selectedItem.title}</dd>
              </div>
              {selectedItem.subtitle && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Subtitle</dt>
                  <dd className="text-slate-700">{selectedItem.subtitle}</dd>
                </div>
              )}
              {isBookable(selectedItem) && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Booking</dt>
                  <dd className="text-slate-900">{selectedItem.availability} spaces remaining</dd>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Venue</dt>
                  <dd className="text-slate-900">{selectedItem.venue_name || 'Unknown venue'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Location</dt>
                  <dd className="text-slate-900">{selectedItem.location_name || 'Unknown location'}</dd>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Start</dt>
                  <dd className="text-slate-900">{toDateTime(selectedItem.start_time).toLocaleString('en-GB')}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">End</dt>
                  <dd className="text-slate-900">{toDateTime(selectedItem.end_time).toLocaleString('en-GB')}</dd>
                </div>
              </div>
              {selectedItem.sign_up_url && (
                <div className="pt-1">
                  <a
                    href={selectedItem.sign_up_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    Sign up
                  </a>
                </div>
              )}
            </dl>
          </div>
        </div>
      )}
    </main>
  )
}
