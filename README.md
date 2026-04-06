# Edinburgh Leisure Timetables

Clean timetable viewer built with Vite + React + Tailwind CSS.

## Data source

The app uses Edinburgh Leisure's timetable endpoint:

- `action=load_category_schedules`
- `category_id=34`
- `post_id=<venue id>`

The repo is preconfigured with multiple pool venues:

- Royal Commonwealth Pool (`3272`)
- Ainslie Park Leisure Centre (`3253`)
- Drumbrae Leisure Centre (`3259`)
- Dalry Swim Centre (`3260`)
- Glenogle Swim Centre (`3263`)
- Leith Victoria Swim Centre (`3266`)

More feeds can be added in `scripts/fetch-schedules.mjs`.

## How it works

Because browser CORS blocks direct client-side calls from GitHub Pages, the deploy workflow fetches live timetable data during build and writes it to:

- `public/data/schedules.json`

The frontend reads `./data/schedules.json` only.

## Local dev

```bash
npm install
npm run fetch:data
npm run dev
```

## Build

```bash
npm run build:with-data
```

## Deploy

GitHub Pages deploys automatically via `.github/workflows/deploy-pages.yml` on:

- pushes to `main`
- manual run (`workflow_dispatch`)
- every 2 hours (scheduled refresh)

## Contributing

Contributions are welcome.

1. Fork the repo and create a branch.
2. Run:
   - `npm install`
   - `npm run fetch:data`
   - `npm run build`
3. Keep changes focused (UI tweak, data feed tweak, or docs tweak).
4. Open a PR with:
   - what changed
   - why
   - screenshots for UI changes

### Adding a new swim venue

Edit `scripts/fetch-schedules.mjs` and add a new feed entry with:

- `categoryId: '34'`
- the venue `postId`
- a clear `name` and `key`

Then run `npm run fetch:data` and commit the updated `public/data/schedules.json`.
