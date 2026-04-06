# Contributing

Thanks for contributing to Edinburgh Leisure Timetables.

## Setup

```bash
npm install
npm run fetch:data
npm run build
```

## Contribution flow

1. Fork the repo and create a feature branch.
2. Keep changes focused (UI tweak, data feed update, or docs update).
3. Validate locally:
   - `npm run fetch:data`
   - `npm run build`
4. Open a PR including:
   - what changed
   - why it changed
   - screenshots for visual/UI updates

## Adding a new swim venue feed

Edit `scripts/fetch-schedules.mjs` and add a new feed entry with:

- `categoryId: '34'` (pool category)
- venue `postId`
- clear `name` and `key`

Then run:

```bash
npm run fetch:data
```

Commit the updated `public/data/schedules.json` alongside your code change.

## Notes

- Frontend reads static `public/data/schedules.json` (no direct browser API calls).
- GitHub Actions refresh/deploy runs every 2 hours.
