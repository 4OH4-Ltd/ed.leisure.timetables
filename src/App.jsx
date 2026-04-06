import { useEffect, useMemo, useState } from 'react'

const STEP_MINUTES = 15
const PX_PER_MINUTE = 2
const LEFT_COL_WIDTH = 180

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

function getSessionType(title = '') {
  const t = title.toLowerCase()
  if (t.includes('pool closed')) return 'closed'
  if (t.includes('lane swimming') || t.includes('casual swimming')) return 'lane'
  if (t.includes('family fun')) return 'family'
  if (t.includes('lesson') || t.includes('learn to swim')) return 'lesson'
  return 'other'
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

function DayGrid({ day, nowMinutes, isToday }) {
  const minStart = Math.min(...day.items.map((i) => i.startMinutes))
  const maxEnd = Math.max(...day.items.map((i) => i.endMinutes))
  const dayStart = roundDownToStep(minStart)
  const dayEnd = roundUpToStep(maxEnd)
  const totalMinutes = dayEnd - dayStart

  const ticks = []
  for (let t = dayStart; t <= dayEnd; t += STEP_MINUTES) ticks.push(t)

  const showNowLine = isToday && nowMinutes >= dayStart && nowMinutes <= dayEnd
  const nowX = (nowMinutes - dayStart) * PX_PER_MINUTE

  return (
    <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="border-b border-slate-200 bg-slate-100/70 px-4 py-3 md:px-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700 md:text-base">
          {formatDay(day.date)}
        </h2>
        <p className="mt-1 text-xs text-slate-500">{formatTimeRange(dayStart, dayEnd)}</p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-full" style={{ minWidth: LEFT_COL_WIDTH + totalMinutes * PX_PER_MINUTE }}>
          <div
            className="sticky top-0 z-10 flex border-b border-slate-200 bg-white"
            style={{ width: LEFT_COL_WIDTH + totalMinutes * PX_PER_MINUTE }}
          >
            <div
              className="shrink-0 border-r border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
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
            {day.locations.map((location) => (
              <li
                key={location.name}
                className="flex"
                style={{ width: LEFT_COL_WIDTH + totalMinutes * PX_PER_MINUTE }}
              >
                <div
                  className="shrink-0 border-r border-slate-200 px-3 py-3"
                  style={{ width: LEFT_COL_WIDTH }}
                >
                  <p className="text-xs font-semibold text-slate-900">{location.name}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{location.items.length} session(s)</p>
                </div>

                <div className="relative h-20 shrink-0" style={{ width: totalMinutes * PX_PER_MINUTE }}>
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

                  {location.items.map((item, idx) => {
                    const left = (item.startMinutes - dayStart) * PX_PER_MINUTE
                    const width = Math.max((item.endMinutes - item.startMinutes) * PX_PER_MINUTE, 8)
                    const type = getSessionType(item.title)
                    const classes = getSessionClasses(type)

                    return (
                      <div
                        key={`${item.start_time}-${item.title}-${idx}`}
                        className={`absolute top-2 bottom-2 overflow-hidden rounded-md px-2 py-1 text-[11px] text-white shadow-sm ${classes.bar}`}
                        style={{ left, width }}
                        title={`${item.title} • ${formatTimeRange(item.startMinutes, item.endMinutes)}`}
                      >
                        <p className="truncate font-medium">{item.title}</p>
                        {item.subtitle && <p className={`truncate ${classes.sub}`}>{item.subtitle}</p>}
                      </div>
                    )
                  })}
                </div>
              </li>
            ))}
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
  const [now, setNow] = useState(new Date())

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
    if (allVenues.length && selectedVenues.length === 0) {
      setSelectedVenues(allVenues)
    }
  }, [allVenues, selectedVenues.length])

  const venueFilteredItems = useMemo(() => {
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

    setSelectedLocations((prev) => {
      if (prev.length === 0) return allLocations
      const valid = prev.filter((loc) => allLocations.includes(loc))
      return valid.length ? valid : allLocations
    })
  }, [allLocations])

  const filteredItems = useMemo(() => {
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
        startDate: start,
        endDate: end,
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

  const nowNext = useMemo(() => {
    const current = filteredItems
      .map((i) => ({ ...i, start: toDateTime(i.start_time), end: toDateTime(i.end_time) }))
      .filter((i) => i.start <= now && i.end >= now)
      .sort((a, b) => a.end - b.end)

    const upcoming = filteredItems
      .map((i) => ({ ...i, start: toDateTime(i.start_time), end: toDateTime(i.end_time) }))
      .filter((i) => i.start > now)
      .sort((a, b) => a.start - b.start)
      .slice(0, 2)

    return { current, upcoming }
  }, [filteredItems, now])

  const toggleVenue = (venue) => {
    setSelectedVenues((prev) => {
      if (prev.includes(venue)) return prev.filter((v) => v !== venue)
      return [...prev, venue]
    })
  }

  const selectAllVenues = () => {
    setSelectedVenues((prev) => (prev.length === allVenues.length ? [] : allVenues))
  }

  const toggleLocation = (location) => {
    setSelectedLocations((prev) => {
      if (prev.includes(location)) return prev.filter((l) => l !== location)
      return [...prev, location]
    })
  }

  const selectAllLocations = () => {
    setSelectedLocations((prev) => (prev.length === allLocations.length ? [] : allLocations))
  }

  const todayIso = now.toISOString().slice(0, 10)
  const nowMinutes = minutesSinceMidnight(now)

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto w-full max-w-7xl px-3 py-5 md:px-6 md:py-8">
        <header className="mb-5 md:mb-7">
          <h1 className="text-2xl font-semibold tracking-tight md:text-4xl">Edinburgh Leisure Timetables</h1>
          <p className="mt-2 text-sm text-slate-600 md:text-base">
            Royal Commonwealth Pool timetable in a day-by-day grid view.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Source: {data.source}
            {data.updatedAt ? ` • Updated ${new Date(data.updatedAt).toLocaleString('en-GB')}` : ''}
          </p>
        </header>

        <section className="mb-4 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200 md:mb-6 md:p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-800">Now / Next</h2>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Now</p>
              {nowNext.current.length ? (
                nowNext.current.slice(0, 2).map((item, idx) => (
                  <p key={`${item.start_time}-${idx}`} className="mt-1 text-sm text-slate-800">
                    {item.title} <span className="text-slate-500">({item.location_name})</span>
                  </p>
                ))
              ) : (
                <p className="mt-1 text-sm text-slate-500">No live sessions right now.</p>
              )}
            </div>
            <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Next</p>
              {nowNext.upcoming.length ? (
                nowNext.upcoming.map((item, idx) => (
                  <p key={`${item.start_time}-${idx}`} className="mt-1 text-sm text-slate-800">
                    {item.title}{' '}
                    <span className="text-slate-500">({item.location_name}, {item.start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })})</span>
                  </p>
                ))
              ) : (
                <p className="mt-1 text-sm text-slate-500">No upcoming sessions in range.</p>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            {[
              ['Lane Swim', 'bg-blue-600'],
              ['Family Fun', 'bg-emerald-600'],
              ['Lessons', 'bg-violet-600'],
              ['Pool Closed', 'bg-red-600'],
              ['Other', 'bg-slate-700'],
            ].map(([label, color]) => (
              <span key={label} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-700">
                <span className={`h-2 w-2 rounded-full ${color}`} />
                {label}
              </span>
            ))}
          </div>
        </section>

        <section className="mb-4 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200 md:mb-6 md:p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-800">Venue filters</h2>
            <button
              type="button"
              onClick={selectAllVenues}
              className="text-xs font-medium text-blue-700 hover:text-blue-800"
            >
              Select all
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
            <h2 className="text-sm font-semibold text-slate-800">Location filters</h2>
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

        {!loading && !error && grouped.length === 0 && (
          <p className="rounded-lg bg-white p-4 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
            No activities found for selected venue/location filters.
          </p>
        )}

        <div className="space-y-4 md:space-y-6">
          {grouped.map((day) => (
            <DayGrid key={day.date} day={day} nowMinutes={nowMinutes} isToday={day.date === todayIso} />
          ))}
        </div>
      </div>
    </main>
  )
}
