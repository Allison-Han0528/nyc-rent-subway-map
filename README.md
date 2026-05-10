# NYC Rent × Subway — Find Your Sweet Spot 🗽🚇

An interactive web map that helps you find NYC neighborhoods that are both **affordable** and **well-connected to the subway**. Built with Mapbox GL JS as Assignment 4 for NYU's Web Mapping course (Spring 2026).

**🌐 Live Site:** https://Allison-Han0528.github.io/nyc-rent-subway-map  
**📁 Repository:** https://github.com/Allison-Han0528/nyc-rent-subway-map

---

## Why It Exists

My apartment lease is expiring and I needed a smarter way to find a new place in NYC. There's always a trade-off: neighborhoods close to the subway tend to be the most expensive, but moving farther out means a longer commute. This map was built to answer one question visually:

> **Which NYC neighborhoods are affordable AND close to the subway?**

---

## Features

- **Rent Choropleth** — Neighborhoods colored green (affordable) → red (expensive) based on median asking rent
- **Bedroom Filter** — Switch between All Units, Studio, 1BR, 2BR, and 3+ BR; the color scale updates instantly
- **Click Interaction** — Click any neighborhood to see a full rent breakdown by bedroom type in the sidebar
- **Subway Stations** — All NYC subway stops plotted with official MTA line colors
- **Station Popup** — Click any station to see its name and lines served
- **Layer Toggle** — Show or hide subway stations to reduce visual clutter

---

## Data

| Dataset | Source | Format | Description |
|---|---|---|---|
| Neighborhood Boundaries | [NYC Open Data — 2020 NTA](https://data.cityofnewyork.us/City-Government/2020-Neighborhood-Tabulation-Areas-NTAs-/9nt8-h7nd) | Shapefile → GeoJSON | Neighborhood Tabulation Area polygon boundaries |
| Median Asking Rent | [StreetEasy Data Dashboard](https://streeteasy.com/blog/data-dashboard/) | CSV | Monthly median asking rent by neighborhood — All / Studio / 1BR / 2BR / 3BR+ |
| Subway Stations | [NYC Open Data — Subway Stations](https://data.cityofnewyork.us/Transportation/Subway-Stations/arq3-7z49) | GeoJSON | Point locations of all NYC subway stations with line information |

Rent data (CSV) was joined to neighborhood boundaries (Shapefile) in **QGIS** and exported as GeoJSON. The resulting file was inspected using **geojson.io** and checked in **mapshaper.org**. Subway station data required no processing.


## Technologies

| Tool | Purpose |
|---|---|
| [Mapbox GL JS v3](https://docs.mapbox.com/mapbox-gl-js/) | Interactive web map rendering |
| [QGIS](https://qgis.org/) | Joining StreetEasy rent CSV to NTA boundary Shapefile |
| [geojson.io](https://geojson.io/) | Inspecting GeoJSON properties and validating data |
| [mapshaper.org](https://mapshaper.org/) | Checking GeoJSON geometry after export |
| HTML / CSS / JavaScript | Page structure, styling, and interactivity |
| [GitHub Pages](https://pages.github.com/) | Free static site hosting |

---

## Key Mapbox GL JS Techniques

- `map.addSource()` + `map.addLayer()` — Loading GeoJSON as fill, line, and circle layers
- `interpolate` expression — Maps rent values to a continuous green → red color scale (data-driven styling)
- `match` expression — Maps subway line letters to official MTA hex colors
- `setPaintProperty()` — Updates choropleth color in real time when bedroom filter changes
- `setFilter()` — Highlights the border of the clicked neighborhood
- `setLayoutProperty()` — Shows / hides subway station layer via toggle checkbox
