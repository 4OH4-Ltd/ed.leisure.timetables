import fs from 'node:fs/promises'
import path from 'node:path'

const API_URL = 'https://www.edinburghleisure.co.uk/wp-admin/admin-ajax.php'

const FEEDS = [
  {
    key: 'rcp-pool',
    name: 'Royal Commonwealth Pool — Pool Timetable',
    categoryId: '34',
    postId: '3272',
  },
  {
    key: 'ainslie-park-pool',
    name: 'Ainslie Park Leisure Centre — Pool Timetable',
    categoryId: '34',
    postId: '3253',
  },
  {
    key: 'drumbrae-pool',
    name: 'Drumbrae Leisure Centre — Pool Timetable',
    categoryId: '34',
    postId: '3259',
  },
  {
    key: 'dalry-pool',
    name: 'Dalry Swim Centre — Pool Timetable',
    categoryId: '34',
    postId: '3260',
  },
  {
    key: 'glenogle-pool',
    name: 'Glenogle Swim Centre — Pool Timetable',
    categoryId: '34',
    postId: '3263',
  },
  {
    key: 'leith-victoria-pool',
    name: 'Leith Victoria Swim Centre — Pool Timetable',
    categoryId: '34',
    postId: '3266',
  },
]

function deriveSignupUrl(slot) {
  if (typeof slot?.roller_checkout === 'string' && /^https?:\/\//.test(slot.roller_checkout)) {
    return slot.roller_checkout
  }

  if (slot?.roller_checkout && typeof slot.roller_checkout === 'object') {
    const candidate = slot.roller_checkout.url || slot.roller_checkout.link || slot.roller_checkout.checkout_url
    if (typeof candidate === 'string' && /^https?:\/\//.test(candidate)) return candidate
  }

  if (typeof slot?.slot_reference === 'string' && /^https?:\/\//.test(slot.slot_reference)) {
    return slot.slot_reference
  }

  if (slot?.slot_reference && typeof slot.slot_reference === 'object') {
    const candidate =
      slot.slot_reference.url ||
      slot.slot_reference.link ||
      slot.slot_reference.checkout_url ||
      slot.slot_reference.booking_url
    if (typeof candidate === 'string' && /^https?:\/\//.test(candidate)) return candidate
  }

  return ''
}

async function fetchFeed(feed) {
  const form = new FormData()
  form.append('action', 'load_category_schedules')
  form.append('category_id', feed.categoryId)
  form.append('post_id', feed.postId)

  const res = await fetch(API_URL, {
    method: 'POST',
    body: form,
    headers: { accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`Fetch failed for ${feed.key}: HTTP ${res.status}`)
  }

  const json = await res.json()
  const table = json?.data?.table ?? []
  const items = []

  for (const day of table) {
    for (const slot of day.slots ?? []) {
      items.push({
        feed: feed.name,
        date: day.date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        venue_name: slot.venue_name || feed.name,
        location_name: slot.location_name || 'Unknown location',
        title: slot.title,
        subtitle: slot.subtitle,
        availability: slot.availability,
        sign_up_url: deriveSignupUrl(slot),
      })
    }
  }

  return items
}

async function main() {
  const all = []
  for (const feed of FEEDS) {
    const items = await fetchFeed(feed)
    all.push(...items)
  }

  const output = {
    updatedAt: new Date().toISOString(),
    source: 'github-actions-fetch',
    items: all,
  }

  const outPath = path.resolve('public/data/schedules.json')
  await fs.mkdir(path.dirname(outPath), { recursive: true })
  await fs.writeFile(outPath, JSON.stringify(output, null, 2) + '\n', 'utf8')

  console.log(`Wrote ${all.length} items to ${outPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
