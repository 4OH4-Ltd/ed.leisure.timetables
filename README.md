# Edinburgh Leisure Timetables

Clean timetable viewer built with Vite + React + Tailwind CSS.

## Data source

The app uses Edinburgh Leisure's timetable endpoint:

- `action=load_category_schedules`
- `category_id=34`
- `post_id=3272`

These IDs currently map to **Royal Commonwealth Pool / Pool timetable**. More feeds can be added later in `scripts/fetch-schedules.mjs`.

## How it works

Because browser CORS can block direct calls from GitHub Pages, the deploy workflow fetches live timetable data during build and writes it to:

- `public/data/schedules.json`

The frontend tries the live API first and falls back to `./data/schedules.json`.

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
