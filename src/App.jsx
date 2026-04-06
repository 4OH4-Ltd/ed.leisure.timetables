import { useEffect, useMemo, useState } from 'react'

const API_URL = 'https://www.edinburghleisure.co.uk/wp-admin/admin-ajax.php'

const FEEDS = [
  {
    key: 'rcp-pool',
    name: 'Royal Commonwealth Pool — Pool Timetable',
    categoryId: '34',
    postId: '3272',
  },
]

function formatDay(isoDate) {
  const d = new Date(`${isoDate}T00:00:00`)
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d)
}

function formatTime(dateTime) {
  const d = new Date(dateTime.replace(' ', 'T'))
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}

async function loadData() {
  const fallback = async () => {
    const res = await fetch('./data/schedules.json', { cache: 'no-store' })
    if (!res.ok) throw new Error('Could not load fallback timetable data')
    return res.json()
  }

  // Try direct API first. If browser CORS blocks it, fall back to static JSON.
  try {
    const all = []

    for (const feed of FEEDS) {
      const body = new FormData()
      body.append('action', 'load_category_schedules')
      body.append('category_id', feed.categoryId)
      body.append('post_id', feed.postId)

      const res = await fetch(API_URL, {
        method: 'POST',
        body,
      })

      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const json = await res.json()
      const table = json?.data?.table ?? []

      for (const day of table) {
        for (const slot of day.slots ?? []) {
          all.push({
            feed: feed.name,
            date: day.date,
            start_time: slot.start_time,
            end_time: slot.end_time,
            title: slot.title,
            subtitle: slot.subtitle,
          })
        }
      }
    }

    return { updatedAt: new Date().toISOString(), items: all, source: 'live-api' }
  } catch {
    const data = await fallback()
    return { ...data, source: data?.source || 'fallback' }
  }
}

export default function App() {
  const [data, setData] = useState({ updatedAt: null, items: [], source: 'loading' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  const grouped = useMemo(() => {
    const map = new Map()
    for (const item of data.items ?? []) {
      if (!map.has(item.date)) map.set(item.date, [])
      map.get(item.date).push(item)
    }

    return [...map.entries()]
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([date, items]) => ({
        date,
        items: items.sort((x, y) => new Date(x.start_time) - new Date(y.start_time)),
      }))
  }, [data.items])

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6 md:py-10">
        <header className="mb-6 md:mb-8">
          <h1 className="text-2xl font-semibold tracking-tight md:text-4xl">Pool Timetable</h1>
          <p className="mt-2 text-sm text-slate-600 md:text-base">
            Royal Commonwealth Pool schedule grouped by day.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Source: {data.source} {data.updatedAt ? `• Updated ${new Date(data.updatedAt).toLocaleString('en-GB')}` : ''}
          </p>
        </header>

        {loading && <p className="text-sm text-slate-600">Loading timetable…</p>}
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {!loading && !error && grouped.length === 0 && (
          <p className="rounded-lg bg-white p-4 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
            No activities found.
          </p>
        )}

        <div className="space-y-4 md:space-y-6">
          {grouped.map((day) => (
            <section key={day.date} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="border-b border-slate-200 bg-slate-100/60 px-4 py-3 md:px-5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700 md:text-base">
                  {formatDay(day.date)}
                </h2>
              </div>

              <ul className="divide-y divide-slate-100">
                {day.items.map((item, idx) => (
                  <li key={`${item.start_time}-${item.title}-${idx}`} className="px-4 py-3 md:px-5 md:py-4">
                    <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900 md:text-base">{item.title}</p>
                        {item.subtitle && <p className="mt-0.5 text-xs text-slate-600 md:text-sm">{item.subtitle}</p>}
                      </div>
                      <p className="text-sm font-semibold text-slate-700 md:ml-4 md:min-w-36 md:text-right">
                        {formatTime(item.start_time)}–{formatTime(item.end_time)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
