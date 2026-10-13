# Psyykkeri

Demo for matching mental health patients to psychosocial group treatments. All data is synthetic.

## Run

```
npm install
npm run dev     # http://localhost:5173, component files at /design/
npm test
```

## Offline map

The map runs fully offline from `public/maps/`: a regional OpenStreetMap extract (Protomaps PMTiles) plus fonts and sprites. The extract is not committed (91 MB). Recreate it with the [pmtiles CLI](https://docs.protomaps.com/pmtiles/cli) (`brew install pmtiles`):

```
pmtiles extract https://build.protomaps.com/20261012.pmtiles public/maps/uusimaa.pmtiles \
  --bbox=22.8,59.75,25.35,60.65 --maxzoom=14
```

Daily builds are kept for about a week. If the date has expired, pick a current one from https://maps.protomaps.com/builds/. The bounding box covers Hanko to eastern Helsinki and Karkkila (LUVN and the HUS capital area). Map data © OpenStreetMap contributors, ODbL.

Fonts and sprites come from https://github.com/protomaps/basemaps-assets (`fonts/Noto Sans {Regular,Medium,Italic}/{0-255,256-511,8192-8447}.pbf`, `sprites/v4/light*`).
