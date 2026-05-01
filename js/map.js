/* =====================================================
   map.js — NYC Rent × Subway Map
   
   This script:
   1. Loads pre-processed GeoJSON files from the data/ folder
   2. Adds neighborhood rent choropleth layer
   3. Adds subway station layer
   4. Handles click and hover interactions
   5. Updates colors when bedroom filter changes
===================================================== */

/* --------------------------------------------------
   1. MAPBOX ACCESS TOKEN
   Replace with your token from account.mapbox.com
-------------------------------------------------- */
mapboxgl.accessToken = 'pk.eyJ1IjoiYWxsaXNvbmhhbiIsImEiOiJjbW9seGZ0Z2wwMnZ2MnRvbXlxd3JsenU3In0.BTuj1Y46nKlsIxFvW5U5Tw';

/* --------------------------------------------------
   2. INITIALIZE THE MAP
   center: NYC [longitude, latitude]
   zoom: 11 shows most of the five boroughs
-------------------------------------------------- */
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [-73.98, 40.73],
    zoom: 11,
    minZoom: 9,
    maxZoom: 16
});

/* --------------------------------------------------
   3. TRACK CURRENT STATE
   currentBedType: which rent column to color by
   lastClickedProps: re-render info card when filter changes
-------------------------------------------------- */
let currentBedType = 'rent_data_rent_all';
let lastClickedProps = null;

/* --------------------------------------------------
   4. COLOR EXPRESSION
   Uses Mapbox interpolate expression for data-driven styling.
   Maps rent values to a green→red color scale.
   Value = 0 means no data → show gray.
-------------------------------------------------- */
function buildColorExpression(bedType) {
    return [
        'case',
        // If the neighborhood has rent data (value > 0), interpolate color
        ['>', ['coalesce', ['get', bedType], 0], 0],
        [
            'interpolate',
            ['linear'],
            ['get', bedType],
            1,    '#1a9641',  // very affordable → dark green
            2000, '#a6d96a',  // affordable      → light green
            2800, '#ffffbf',  // moderate         → yellow
            3800, '#fdae61',  // expensive        → orange
            5000, '#d7191c'   // very expensive   → red
        ],
        '#d9d9d9'  // no data → gray
    ];
}

/* --------------------------------------------------
   5. SUBWAY LINE COLORS
   Uses Mapbox match expression.
   Matches first character of LINE property to MTA color.
   Example: "A-C-E" → first char "A" → blue
-------------------------------------------------- */
const subwayColorExpression = [
    'match',
    ['slice', ['get', 'line'], 0, 1],
    'A', '#0039A6',  'C', '#0039A6',  'E', '#0039A6',
    'B', '#FF6319',  'D', '#FF6319',  'F', '#FF6319',  'M', '#FF6319',
    'G', '#6CBE45',
    'J', '#996633',  'Z', '#996633',
    'L', '#A7A9AC',
    'N', '#FCCC0A',  'Q', '#FCCC0A',  'R', '#FCCC0A',  'W', '#FCCC0A',
    '1', '#EE352E',  '2', '#EE352E',  '3', '#EE352E',
    '4', '#00933C',  '5', '#00933C',  '6', '#00933C',
    '7', '#B933AD',
    'S', '#808183',
    '#808183'  // default gray
];

/* --------------------------------------------------
   6. ADD SOURCES AND LAYERS AFTER MAP LOADS
   map.on('load') ensures the basemap is ready
   before we add our data on top
-------------------------------------------------- */
map.on('load', () => {

    /* --- 6a. Neighborhood rent data source --- */
    // This GeoJSON was created in QGIS by joining
    // StreetEasy rent data to NTA boundary shapefile
    map.addSource('neighborhoods', {
        type: 'geojson',
        data: 'data/neighborhoods_rent.geojson'
    });

    /* --- 6b. Neighborhood fill layer (rent choropleth) --- */
    // fill-color uses our interpolate expression for data-driven styling
    map.addLayer({
        id: 'neighborhoods-fill',
        type: 'fill',
        source: 'neighborhoods',
        paint: {
            'fill-color': buildColorExpression(currentBedType),
            'fill-opacity': 0.75
        }
    });

    /* --- 6c. Neighborhood outline layer --- */
    // White borders between neighborhoods for readability
    map.addLayer({
        id: 'neighborhoods-outline',
        type: 'line',
        source: 'neighborhoods',
        paint: {
            'line-color': '#ffffff',
            'line-width': 0.8,
            'line-opacity': 0.6
        }
    });

    /* --- 6d. Highlight layer for clicked neighborhood --- */
    // Starts hidden (filter matches nothing).
    // Updated on click via setFilter().
    map.addLayer({
        id: 'neighborhoods-highlight',
        type: 'line',
        source: 'neighborhoods',
        paint: {
            'line-color': '#FFD166',
            'line-width': 2.5
        },
        filter: ['==', 'ntaname', '']
    });

    /* --- 6e. Subway stations source --- */
    // Downloaded directly from NYC Open Data as GeoJSON
    map.addSource('subway-stations', {
        type: 'geojson',
        data: 'data/subway_stations.geojson'
    });

    /* --- 6f. Subway station circles --- */
    // circle-color uses match expression for MTA line colors
    // circle-radius uses interpolate to scale with zoom level
    map.addLayer({
        id: 'subway-stations-layer',
        type: 'circle',
        source: 'subway-stations',
        paint: {
            'circle-radius': [
                'interpolate', ['linear'], ['zoom'],
                10, 4,   // small at zoom 10
                15, 8    // larger when zoomed in
            ],
            'circle-color': subwayColorExpression,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
        }
    });

    /* --- 6g. Map controls --- */
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.addControl(new mapboxgl.ScaleControl({ unit: 'imperial' }), 'bottom-right');

    /* --- 6h. Build the legend --- */
    buildLegend();
});

/* --------------------------------------------------
   7. INTERACTION: Neighborhood hover
   Change cursor to pointer when hovering a neighborhood
-------------------------------------------------- */
map.on('mouseenter', 'neighborhoods-fill', () => {
    map.getCanvas().style.cursor = 'pointer';
});
map.on('mouseleave', 'neighborhoods-fill', () => {
    map.getCanvas().style.cursor = '';
});

/* --------------------------------------------------
   8. INTERACTION: Neighborhood click
   Show rent info in sidebar and highlight the border
-------------------------------------------------- */
map.on('click', 'neighborhoods-fill', (e) => {
    const props = e.features[0].properties;
    lastClickedProps = props;

    // Show rent table in sidebar
    showNeighborhoodInfo(props);

    // Highlight this neighborhood's border
    map.setFilter('neighborhoods-highlight', ['==', 'ntaname', props.ntaname]);
});

/* --------------------------------------------------
   9. INTERACTION: Subway station click
   Show a popup with station name and lines
-------------------------------------------------- */
map.on('click', 'subway-stations-layer', (e) => {
    const props = e.features[0].properties;
    new mapboxgl.Popup({ closeButton: false, offset: 8 })
        .setLngLat(e.lngLat)
        .setHTML(`
            <div class="popup-station-name">${props.stop_name}</div>
            <div class="popup-station-lines">Lines: ${props.line}</div>
        `)
        .addTo(map);
});

map.on('mouseenter', 'subway-stations-layer', () => {
    map.getCanvas().style.cursor = 'pointer';
});
map.on('mouseleave', 'subway-stations-layer', () => {
    map.getCanvas().style.cursor = '';
});

/* --------------------------------------------------
   10. SIDEBAR: Show neighborhood rent info card
-------------------------------------------------- */
function showNeighborhoodInfo(props) {
    // Helper: format a number as "$3,200" or gray "N/A" if missing
    const fmt = (val) => (val && val > 0)
        ? '$' + Number(val).toLocaleString()
        : '<span style="color:#7d8590">N/A</span>';

    // Helper: add CSS class to highlight the currently selected bedroom row
    const active = (type) => currentBedType === type ? 'active-row' : '';

    document.getElementById('neighborhood-info').innerHTML = `
        <div class="info-card">
            <h2>${props.ntaname || 'Unknown'}</h2>
            <span class="borough-tag">${props.boroname || ''}</span>
            <table class="rent-table">
                <thead>
                    <tr><th>Bedroom Type</th><th>Median Rent/mo</th></tr>
                </thead>
                <tbody>
                    <tr class="${active('rent_data_rent_all')}">
                        <td>All Units</td><td>${fmt(props.rent_data_rent_all)}</td>
                    </tr>
                    <tr class="${active('rent_data_rent_studio')}">
                        <td>Studio</td><td>${fmt(props.rent_data_rent_studio)}</td>
                    </tr>
                    <tr class="${active('rent_data_rent_1bed')}">
                        <td>1 Bedroom</td><td>${fmt(props.rent_data_rent_1bed)}</td>
                    </tr>
                    <tr class="${active('rent_data_rent_2bed')}">
                        <td>2 Bedroom</td><td>${fmt(props.rent_data_rent_2bed)}</td>
                    </tr>
                    <tr class="${active('rent_data_rent_3plus')}">
                        <td>3+ Bedroom</td><td>${fmt(props.rent_data_rent_3plus)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
}

/* --------------------------------------------------
   11. BEDROOM FILTER BUTTONS
   Updates the map color and info card when user
   clicks Studio / 1BR / 2BR / etc.
-------------------------------------------------- */
document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
        // Update button highlight
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update current bed type
        currentBedType = btn.dataset.type;

        // Update the choropleth fill color using setPaintProperty
        // This changes the color without reloading any data
        if (map.getLayer('neighborhoods-fill')) {
            map.setPaintProperty(
                'neighborhoods-fill',
                'fill-color',
                buildColorExpression(currentBedType)
            );
        }

        // Refresh info card if a neighborhood is already selected
        if (lastClickedProps) {
            showNeighborhoodInfo(lastClickedProps);
        }
    });
});

/* --------------------------------------------------
   12. SUBWAY TOGGLE
   Show/hide subway station layer using setLayoutProperty
-------------------------------------------------- */
document.getElementById('toggle-subway').addEventListener('change', (e) => {
    if (map.getLayer('subway-stations-layer')) {
        map.setLayoutProperty(
            'subway-stations-layer',
            'visibility',
            e.target.checked ? 'visible' : 'none'
        );
    }
});

/* --------------------------------------------------
   13. LEGEND
   Draws color swatches in the sidebar legend div
-------------------------------------------------- */
function buildLegend() {
    const items = [
        { color: '#1a9641', label: 'Under $2,000' },
        { color: '#a6d96a', label: '$2,000 – $2,800' },
        { color: '#ffffbf', label: '$2,800 – $3,800' },
        { color: '#fdae61', label: '$3,800 – $5,000' },
        { color: '#d7191c', label: 'Over $5,000' },
        { color: '#d9d9d9', label: 'No data' }
    ];

    document.getElementById('legend-items').innerHTML = items.map(
        ({ color, label }) => `
            <div class="legend-row">
                <div class="legend-swatch" style="background:${color}"></div>
                <span>${label}</span>
            </div>`
    ).join('');
}