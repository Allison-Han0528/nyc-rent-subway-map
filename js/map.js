/* =====================================================
   map.js — NYC Rent × Subway Map
===================================================== */

/* --------------------------------------------------
   1. MAPBOX TOKEN
-------------------------------------------------- */
mapboxgl.accessToken = 'pk.eyJ1IjoiYWxsaXNvbmhhbiIsImEiOiJjbW96YWo4MXUwaWFqMnNvdGhxMDN2aGpvIn0.E0XXnSX1O8eiOPLs_OzdkQ';

/* --------------------------------------------------
   2. STATE
-------------------------------------------------- */
let currentBedType = 'rent_data_rent_all';
let lastClickedProps = null;
let selectedNTAName = null;

/* --------------------------------------------------
   3. MAP INIT
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
   4. RENT COLOR EXPRESSION
   interpolate maps rent values to green→red.
   0 = no data → dark gray
-------------------------------------------------- */
function buildColorExpression(bedType) {
    return [
        'case',
        ['>', ['coalesce', ['get', bedType], 0], 0],
        [
            'interpolate', ['linear'], ['get', bedType],
            1,    '#1a9641',
            2000, '#a6d96a',
            2800, '#ffffbf',
            3800, '#fdae61',
            5000, '#d7191c'
        ],
        '#3a3a3a'
    ];
}

/* --------------------------------------------------
   5. SUBWAY LINE COLOR EXPRESSION
   Matches rt_symbol field (e.g. "1", "A", "N", "SI")
   to MTA official hex colors
-------------------------------------------------- */
function buildSubwayLineColorExpression() {
    return [
        'match', ['get', 'rt_symbol'],
        '1', '#EE352E',
        '2', '#EE352E',
        '3', '#EE352E',
        '4', '#00933C',
        '5', '#00933C',
        '6', '#00933C',
        '7', '#B933AD',
        'A', '#0039A6',
        'C', '#0039A6',
        'E', '#0039A6',
        'B', '#FF6319',
        'D', '#FF6319',
        'F', '#FF6319',
        'M', '#FF6319',
        'G', '#6CBE45',
        'J', '#996633',
        'Z', '#996633',
        'L', '#A7A9AC',
        'N', '#FCCC0A',
        'Q', '#FCCC0A',
        'R', '#FCCC0A',
        'W', '#FCCC0A',
        'S', '#808183',
        'SI','#0039A6',
        '#808183'
    ];
}

/* --------------------------------------------------
   6. SUBWAY STATION COLOR EXPRESSION
   Stations GeoJSON uses LINE field like "A-C-E"
   We take the first character to pick the color
-------------------------------------------------- */
function buildSubwayStationColorExpression() {
    return [
        'match', ['slice', ['get', 'LINE'], 0, 1],
        'A', '#0039A6', 'C', '#0039A6', 'E', '#0039A6',
        'B', '#FF6319', 'D', '#FF6319', 'F', '#FF6319', 'M', '#FF6319',
        'G', '#6CBE45',
        'J', '#996633', 'Z', '#996633',
        'L', '#A7A9AC',
        'N', '#FCCC0A', 'Q', '#FCCC0A', 'R', '#FCCC0A', 'W', '#FCCC0A',
        '1', '#EE352E', '2', '#EE352E', '3', '#EE352E',
        '4', '#00933C', '5', '#00933C', '6', '#00933C',
        '7', '#B933AD',
        'S', '#808183',
        '#808183'
    ];
}

/* --------------------------------------------------
   7. FADE EFFECT
-------------------------------------------------- */
function applyFadeEffect(selectedName) {
    map.setPaintProperty('neighborhoods-fill', 'fill-opacity', [
        'case',
        ['==', ['get', 'ntaname'], selectedName],
        0.88,
        0.25
    ]);
}

function clearFadeEffect() {
    map.setPaintProperty('neighborhoods-fill', 'fill-opacity', 0.75);
}

/* --------------------------------------------------
   8. SIDEBAR INFO CARD
-------------------------------------------------- */
function showNeighborhoodInfo(props) {
    const fmt = (val) => (val && val > 0)
        ? '$' + Number(val).toLocaleString()
        : '<span style="color:#7d8590">N/A</span>';

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
                        <td>All Units</td>
                        <td>${fmt(props.rent_data_rent_all)}</td>
                    </tr>
                    <tr class="${active('rent_data_rent_studio')}">
                        <td>Studio</td>
                        <td>${fmt(props.rent_data_rent_studio)}</td>
                    </tr>
                    <tr class="${active('rent_data_rent_1bed')}">
                        <td>1 Bedroom</td>
                        <td>${fmt(props.rent_data_rent_1bed)}</td>
                    </tr>
                    <tr class="${active('rent_data_rent_2bed')}">
                        <td>2 Bedroom</td>
                        <td>${fmt(props.rent_data_rent_2bed)}</td>
                    </tr>
                    <tr class="${active('rent_data_rent_3plus')}">
                        <td>3+ Bedroom</td>
                        <td>${fmt(props.rent_data_rent_3plus)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
}

/* --------------------------------------------------
   9. ADD SOURCES AND LAYERS
   Layer order matters — later layers render on top.
   Order: fill → outline → highlight → subway-lines → stations
   NO slot: 'bottom' — that was hiding the subway lines!
-------------------------------------------------- */
map.on('load', () => {

    /* --- Neighborhood data source --- */
    map.addSource('neighborhoods', {
        type: 'geojson',
        data: 'data/neighborhoods_rent.geojson'
    });

    /* --- Rent choropleth fill --- */
    map.addLayer({
        id: 'neighborhoods-fill',
        type: 'fill',
        source: 'neighborhoods',
        paint: {
            'fill-color': buildColorExpression(currentBedType),
            'fill-opacity': 0.75
        }
    });

    /* --- Neighborhood outline --- */
    map.addLayer({
        id: 'neighborhoods-outline',
        type: 'line',
        source: 'neighborhoods',
        paint: {
            'line-color': '#ffffff',
            'line-width': 0.5,
            'line-opacity': 0.25
        }
    });

    /* --- Selected neighborhood highlight --- */
    map.addLayer({
        id: 'neighborhoods-highlight',
        type: 'line',
        source: 'neighborhoods',
        paint: {
            'line-color': '#FFD166',
            'line-width': 3
        },
        filter: ['==', 'ntaname', '']
    });

    /* --- Subway lines source + layer ---
       Downloaded from github.com/chriswhong/mapboxgl-nyc-subway
       Colored by rt_symbol using MTA official colors
       Added AFTER neighborhood fill so it renders on top */
    map.addSource('subway-lines', {
        type: 'geojson',
        data: 'data/nyc-subway-routes.geojson'
    });

    map.addLayer({
        id: 'subway-lines-layer',
        type: 'line',
        source: 'subway-lines',
        paint: {
            'line-color': buildSubwayLineColorExpression(),
            'line-width': [
                'interpolate', ['linear'], ['zoom'],
                9,  1,
                12, 2,
                15, 3
            ],
            'line-opacity': 0.9
        }
    });

    /* --- Subway stations source + layer ---
       Hidden by default, toggled via checkbox */
    map.addSource('subway-stations', {
        type: 'geojson',
        data: 'data/subway_stations.geojson'
    });

    map.addLayer({
        id: 'subway-stations-layer',
        type: 'circle',
        source: 'subway-stations',
        layout: { visibility: 'none' },
        paint: {
            'circle-radius': [
                'interpolate', ['linear'], ['zoom'],
                10, 2, 15, 5
            ],
            'circle-color': buildSubwayStationColorExpression(),
            'circle-opacity': 0.9,
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#ffffff'
        }
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.addControl(new mapboxgl.ScaleControl({ unit: 'imperial' }), 'bottom-right');

    buildLegend();
    bindInteractions();
});

/* --------------------------------------------------
   10. INTERACTIONS
-------------------------------------------------- */
function bindInteractions() {

    map.on('mouseenter', 'neighborhoods-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'neighborhoods-fill', () => {
        map.getCanvas().style.cursor = '';
    });

    /* Neighborhood click */
    map.on('click', 'neighborhoods-fill', (e) => {
        e.originalEvent.stopPropagation();
        const props = e.features[0].properties;
        lastClickedProps = props;
        selectedNTAName = props.ntaname;
        showNeighborhoodInfo(props);
        map.setFilter('neighborhoods-highlight', ['==', 'ntaname', props.ntaname]);
        applyFadeEffect(props.ntaname);
    });

    /* Click empty area: clear selection */
    map.on('click', (e) => {
        const features = map.queryRenderedFeatures(e.point, {
            layers: ['neighborhoods-fill']
        });
        if (features.length === 0) {
            selectedNTAName = null;
            lastClickedProps = null;
            map.setFilter('neighborhoods-highlight', ['==', 'ntaname', '']);
            clearFadeEffect();
            document.getElementById('neighborhood-info').innerHTML =
                '<p class="placeholder-text">Select a neighborhood on the map to see median rent by bedroom type.</p>';
        }
    });

    map.on('mouseenter', 'subway-stations-layer', () => {
        map.getCanvas().style.cursor = 'crosshair';
    });
    map.on('mouseleave', 'subway-stations-layer', () => {
        map.getCanvas().style.cursor = '';
    });
}

/* --------------------------------------------------
   11. BEDROOM FILTER BUTTONS
-------------------------------------------------- */
document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentBedType = btn.dataset.type;

        if (map.getLayer('neighborhoods-fill')) {
            map.setPaintProperty(
                'neighborhoods-fill',
                'fill-color',
                buildColorExpression(currentBedType)
            );
        }
        if (lastClickedProps) showNeighborhoodInfo(lastClickedProps);
    });
});

/* --------------------------------------------------
   12. LAYER TOGGLES
-------------------------------------------------- */
document.getElementById('toggle-subway-lines').addEventListener('change', (e) => {
    if (map.getLayer('subway-lines-layer')) {
        map.setLayoutProperty('subway-lines-layer', 'visibility',
            e.target.checked ? 'visible' : 'none');
    }
});

document.getElementById('toggle-subway-stations').addEventListener('change', (e) => {
    if (map.getLayer('subway-stations-layer')) {
        map.setLayoutProperty('subway-stations-layer', 'visibility',
            e.target.checked ? 'visible' : 'none');
    }
});

/* --------------------------------------------------
   13. LEGEND
-------------------------------------------------- */
function buildLegend() {
    const items = [
        { color: '#1a9641', label: 'Under $2,000' },
        { color: '#a6d96a', label: '$2,000 – $2,800' },
        { color: '#ffffbf', label: '$2,800 – $3,800', border: '1px solid #888' },
        { color: '#fdae61', label: '$3,800 – $5,000' },
        { color: '#d7191c', label: 'Over $5,000' },
        { color: '#3a3a3a', label: 'No data', border: '1px solid #555' }
    ];

    document.getElementById('legend-items').innerHTML = items.map(
        ({ color, label, border }) => `
            <div class="legend-row">
                <div class="legend-swatch"
                     style="background:${color};${border ? 'border:' + border : ''}">
                </div>
                <span>${label}</span>
            </div>`
    ).join('');
}