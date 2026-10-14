# Psyykkeri

Demo for matching mental health patients to psychosocial group treatments. The treatments are real services compiled from public sources (`src/data/treatments.ts`); the patients are synthetic.

## Run

```
npm install
npm run dev     # http://localhost:5173, component files at /design/
npm test
```

## Wordmark font

The wordmark "Psyykkeri" is set in **The Seasons Bold**, a licensed font that is not committed. Either install it on the machine, or put your licensed web font at `public/fonts/the-seasons-bold.woff2` (or `public/fonts/the-seasons-bold.otf`) and check that your licence covers web embedding. Without it, the wordmark falls back to Georgia/serif.

## Map

The app picks its basemap when a map opens (`src/lib/basemap.ts`):

1. **Offline**, if `public/maps/uusimaa.pmtiles` is present: a regional OpenStreetMap extract (Protomaps PMTiles) plus the committed fonts and sprites. Nothing goes to outside servers.
2. **Online** otherwise: vector tiles from [OpenFreeMap](https://openfreemap.org) (OpenStreetMap data, free, no API key), recoloured to the same palette. Clones and the Cloudflare deployment use this, since the extract is not committed.

If neither works, the map panel says so.

The extract is 91 MB, which is too big for Git and over Cloudflare's 25 MiB limit for a static asset, so it stays local. Recreate it with the [pmtiles CLI](https://docs.protomaps.com/pmtiles/cli) (`brew install pmtiles`):

```
pmtiles extract https://build.protomaps.com/20261012.pmtiles public/maps/uusimaa.pmtiles \
  --bbox=22.8,59.75,25.35,60.65 --maxzoom=14
```

Daily builds are kept for about a week. If the date has expired, pick a current one from https://maps.protomaps.com/builds/. The bounding box covers Hanko to eastern Helsinki and Karkkila (LUVN and the HUS capital area). Map data © OpenStreetMap contributors, ODbL.

Fonts and sprites come from https://github.com/protomaps/basemaps-assets (`fonts/Noto Sans {Regular,Medium,Italic}/{0-255,256-511,8192-8447}.pbf`, `sprites/v4/light*`).
