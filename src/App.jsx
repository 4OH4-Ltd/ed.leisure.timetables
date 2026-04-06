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

async function loadData() {
  const res = await fetch('./data/schedules.json', { cache: 'no-store' })
  if (!res.ok) throw new Error('Could not load timetable data')

  const data = await res.json()
  return { ...data, source: data?.source || 'github-actions-fetch' }
}

function DayGrid({ day }) {
  const minStart = Math.min(...day.items.map((i) => i.startMinutes))
  const maxEnd = Math.max(...day.items.map((i) => i.endMinutes))
  const dayStart = roundDownToStep(minStart)
  const dayEnd = roundUpToStep(maxEnd)
  const totalMinutes = dayEnd - dayStart

  const ticks = []
  for (let t = dayStart; t <= dayEnd; t += STEP_MINUTES) ticks.push(t)

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

                  {location.items.map((item, idx) => {
                    const left = (item.startMinutes - dayStart) * PX_PER_MINUTE
                    const width = Math.max((item.endMinutes - item.startMinutes) * PX_PER_MINUTE, 8)
                    const isClosed = item.title.toLowerCase().includes('pool closed')

                    return (
                      <div
                        key={`${item.start_time}-${item.title}-${idx}`}
                        className={`absolute top-2 bottom-2 overflow-hidden rounded-md px-2 py-1 text-[11px] text-white shadow-sm ${
                          isClosed ? 'bg-red-600/95' : 'bg-blue-600/90'
                        }`}
                        style={{ left, width }}
                        title={`${item.title} • ${formatTimeRange(item.startMinutes, item.endMinutes)}`}
                      >
                        <p className="truncate font-medium">{item.title}</p>
                        {item.subtitle && (
                          <p className={`truncate ${isClosed ? 'text-red-100' : 'text-blue-100'}`}>
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    )}
                  )}
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

  const allVenues = useMemo(() => {
    const set = new Set((data.items ?? []).map((i) => i.venue_name || 'Unknown venue'))
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [data.items])

  useEffect(() => {
    if (allVenues.length && selectedVenues.length === 0) {
      setSelectedVenues(allVenues)
    }
  }, [allVenues, selectedVenues.length])

  const filteredItems = useMemo(() => {
    const allowed = new Set(selectedVenues)
    return (data.items ?? []).filter((item) => allowed.has(item.venue_name || 'Unknown venue'))
  }, [data.items, selectedVenues])

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
    setSelectedVenues((prev) => {
      if (prev.includes(venue)) return prev.filter((v) => v !== venue)
      return [...prev, venue]
    })
  }

  const selectAllVenues = () => setSelectedVenues(allVenues)

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
        </section>

        {loading && <p className="text-sm text-slate-600">Loading timetable…</p>}
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {!loading && !error && grouped.length === 0 && (
          <p className="rounded-lg bg-white p-4 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
            No activities found for selected venues.
          </p>
        )}

        <div className="space-y-4 md:space-y-6">
          {grouped.map((day) => (
            <DayGrid key={day.date} day={day} />
          ))}
        </div>
      </div>
    </main>
  )
}
