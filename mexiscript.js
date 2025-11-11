// Mexican Los Angeles Archive — Milan Janosov inspired map system

(() => {
  const state = {
    map: null,
    markers: [],
    allRecords: [],
    filteredRecords: [],
    selectedIndex: null,
    activeCategory: 'all',
    searchTerm: '',
    quickTour: false,
    specialLayers: {
      treaty: {
        highlight: null,
        mask: null,
        label: null,
        states: null,
        exitButton: null,
        prevState: null,
        isActive: false,
        suppressMove: false
      },
      olvera: {
        line: null,
        feature: null
      },
      boyle: {
        polygon: null,
        label: null,
        bounds: null
      },
      zanja: {
        polygon: null,
        label: null,
        bounds: null
      },
      blowouts: {
        group: null,
        bounds: null
      },
      moratorium: {
        polyline: null
      },
      bunker: {
        polygon: null,
        label: null,
        bounds: null
      },
      zoot: {
        group: null,
        bounds: null
      },
      chavez: {
        overlay: null,
        rectangle: null,
        manualVisible: false
      },
      railLabor: {
        entry: null,
        layer: null,
        index: null
      },
      rancho: {
        isActive: false,
        siteId: null,
        bounds: null
      }
    },
    initialView: null,
    previousMapView: null
  };

  let aboutDrawerOpen = false;

  function ensureTreatyExitButton() {
    const overlayStore = state.specialLayers.treaty;
    if (!overlayStore) return null;
    if (overlayStore.exitButton) return overlayStore.exitButton;

    const mapContainer = document.querySelector('.map-container');
    if (!mapContainer) return null;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'treaty-exit';
    button.textContent = 'Back to LA';
    button.setAttribute('aria-label', 'Exit Treaty view');
    button.addEventListener('click', () => {
      exitTreatyOverlay({ recenter: true });
    });

    mapContainer.appendChild(button);
    overlayStore.exitButton = button;
    return button;
  }

  function showTreatyExitButton() {
    const button = ensureTreatyExitButton();
    if (button) button.classList.add('visible');
  }

  function hideTreatyExitButton() {
    const overlayStore = state.specialLayers.treaty;
    const button = overlayStore?.exitButton;
    if (button) button.classList.remove('visible');
  }

  const TREATY_ID = 'treaty_guadalupe';
  const RANCHO_IDS = ['rancho_period'];
  const ranchoSites = new Set(RANCHO_IDS);
  const olveraLineId = "olvera_street";
  const railLaborLineId = 'early_rail_mexican_labor';
  const blowoutsSiteId = 'east_la_walkouts';
  const moratoriumSiteId = 'chicano_moratorium';
  const zanjaSiteId = 'zanja_madre';
  const boyleSiteIds = new Set(['boyle_heights_1930', 'boyle_heights_2020']);
  const bunkerSiteId = 'bunker_hill_renewal';
  const zootSiteId = 'zoot_suit_riots';
  const chavezCommunityId = 'chavez_ravine_1930';
  const chavezOverlayBounds = [
    [34.0658, -118.2468],
    [34.086, -118.2278]
  ];
  const chavezOverlayImage = 'images/chavezravinemap.png';
  const chavezOverlayOpacity = 0.88;
  const blowoutsSchools = [
    { name: 'Lincoln High School', coords: [34.074302, -118.202169], radius: 220 },
    { name: 'Garfield High School', coords: [34.026897, -118.157887], radius: 220 },
    { name: 'Roosevelt High School', coords: [34.0415, -118.2116], radius: 220 },
    { name: 'Wilson High School', coords: [34.068871, -118.186272], radius: 220 },
    { name: 'Belmont High School', coords: [34.062113, -118.262899], radius: 220 },
    { name: 'Jefferson High School', coords: [34.011032, -118.250842], radius: 220 },
    { name: 'Venice High School', coords: [33.997028, -118.443456], radius: 260 }
  ];
  const moratoriumRouteCoords = [
    [34.0414, -118.1711],
    [34.0363, -118.1765]
  ];
  const zootFlashpoints = [
    { name: 'Downtown Los Angeles', coords: [34.0486, -118.2493], radius: 900 },
    { name: 'East Los Angeles', coords: [34.0339, -118.1675], radius: 1100 },
    { name: 'Boyle Heights', coords: [34.0418, -118.2102], radius: 850 },
    { name: 'Watts', coords: [33.9399, -118.2382], radius: 1000 }
  ];
  const bunkerPolygonCoords = [
    [34.05737, -118.2549],
    [34.05737, -118.2486],
    [34.04845, -118.2486],
    [34.04845, -118.2554]
  ];
  const boylePolygonCoords = [
    [34.0665, -118.2242],
    [34.0665, -118.177],
    [34.0068, -118.177],
    [34.0068, -118.2242]
  ];
  const zanjaPolygonCoords = [
    [34.0608, -118.2395],
    [34.0608, -118.2328],
    [34.0563, -118.2328],
    [34.0563, -118.2395]
  ];

  const categoryColors = {
    event: '#f6a5a3',
    landmark: '#8fc5d8',
    neighborhood: '#c4b5ff',
    founding_site: '#f9d7a6',
    default: '#d4d6d0'
  };
  const customMaterialLinks = {
    bracero_program: [
      {
        title: 'California Bracero Program, 1958 — Estuary Press Photo Essay',
        type: 'Photo Essay',
        creator: 'Ernest Lowe / Estuary Press',
        year: '1958',
        description: 'High-resolution gallery documenting California bracero camps and field crews during Public Law 78 contracts.',
        url: 'https://estuarypress.com/hrma-photo-post/california-bracero-program-1958/'
      }
    ]
  };

  let debounceTimer = null;

  document.addEventListener('DOMContentLoaded', () => {
    setupIntro();
    displayASCIIArt();
    setupDateClock();
    setupModals();
    setupAboutDrawer();
    setupRadio();
  });

  /* ----------------------------------------------------------------------
     Intro + timing
  ---------------------------------------------------------------------- */
  function setupIntro() {
    const enterButton = document.getElementById('enter-button');
    const enterGhost = document.getElementById('enter-ghost');
    const skipIntro = document.getElementById('skip-intro');

    if (enterButton) enterButton.addEventListener('click', () => enterArchive());
    if (skipIntro) skipIntro.addEventListener('click', () => enterArchive());
    if (enterGhost) {
      enterGhost.addEventListener('click', () => {
        state.quickTour = true;
        enterArchive();
      });
    }

    // Safety fallback: if something prevents the button from firing, auto enter after a short delay.
    window.addEventListener('load', () => {
      setTimeout(() => {
        if (!document.body.classList.contains('entered')) {
          enterArchive();
        }
      }, 1200);
    });
  }

  async function loadASCIIArt() {
    try {
      const response = await fetch('ascii-art-2.txt');
      if (!response.ok) throw new Error('Request failed');
      return (await response.text()).split('\n');
    } catch (error) {
      console.warn('Could not load ASCII art:', error.message);
      return [];
    }
  }

  async function displayASCIIArt() {
    const asciiElement = document.getElementById('ascii-art');
    if (!asciiElement) return;

    const lines = await loadASCIIArt();
    asciiElement.textContent = lines.join('\n');
    requestAnimationFrame(() => asciiElement.classList.add('visible'));
  }

  function enterArchive() {
    const overlay = document.getElementById('ascii-welcome');
    if (overlay) overlay.classList.add('hidden');

    setTimeout(() => {
      document.body.classList.add('entered');
      const control = document.getElementById('control-panel');
      if (control) control.style.display = 'flex';
      initMap();
      wireUI();
      drawGridOverlay();
      loadData();
      requestAnimationFrame(() => {
        if (state.map) state.map.invalidateSize(true);
      });
    }, 260);
  }

  function setupDateClock() {
    updateDateTime();
    setInterval(updateDateTime, 1000);
  }

  function updateDateTime() {
    const now = new Date();
    const timeOptions = {
      timeZone: 'America/Los_Angeles',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    };
    const dateOptions = {
      timeZone: 'America/Los_Angeles',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    };

    const timeEl = document.getElementById('current-time');
    const dateEl = document.getElementById('current-date');
    if (timeEl) timeEl.textContent = now.toLocaleTimeString('en-US', timeOptions);
    if (dateEl) dateEl.textContent = now.toLocaleDateString('en-US', dateOptions);

    const laNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const hours = laNow.getHours();
    const minutes = laNow.getMinutes();
    const seconds = laNow.getSeconds();

    const hourDeg = ((hours % 12) + minutes / 60) * 30; // 360/12
    const minuteDeg = (minutes + seconds / 60) * 6; // 360/60
    const secondDeg = seconds * 6;

    const clockHourEl = document.querySelector('.clock-hand--hour');
    const clockMinuteEl = document.querySelector('.clock-hand--minute');
    const clockSecondEl = document.querySelector('.clock-hand--second');

    if (clockHourEl) clockHourEl.style.transform = `rotate(${hourDeg}deg)`;
    if (clockMinuteEl) clockMinuteEl.style.transform = `rotate(${minuteDeg}deg)`;
    if (clockSecondEl) clockSecondEl.style.transform = `rotate(${secondDeg}deg)`;
  }

  /* ----------------------------------------------------------------------
     Map + data
  ---------------------------------------------------------------------- */
  function initMap() {
    if (state.map) return;

    const initialCenter = [34.05, -118.25];
    const initialZoom = 11;

    state.map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView(initialCenter, initialZoom);
    state.initialView = { center: initialCenter, zoom: initialZoom };
    state.initialView = { center: initialCenter, zoom: initialZoom };

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Imagery © Esri, Maxar, Earthstar Geographics'
    });

    const streetLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles © Esri — Source: Esri, HERE, Garmin, Intermap, increment P, USGS, FAO, NPS, NRCAN, GeoBase, IGN, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), & the GIS User Community'
    });

    const blueprintLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors · © CartoDB'
    });

    satelliteLayer.addTo(state.map);

    const baseLayers = {
      Satellite: satelliteLayer,
      Street: streetLayer,
      Blueprint: blueprintLayer
    };

    L.control.layers(baseLayers, null, { position: 'bottomright' }).addTo(state.map);
    L.control.zoom({ position: 'bottomright' }).addTo(state.map);

    state.map.createPane('areas');
    const areasPane = state.map.getPane('areas');
    if (areasPane) {
      areasPane.style.zIndex = 420;
      areasPane.style.mixBlendMode = 'normal';
    }

    state.map.createPane('points');
    const pointsPane = state.map.getPane('points');
    if (pointsPane) {
      pointsPane.style.mixBlendMode = 'screen';
      pointsPane.style.zIndex = 650;
    }

    state.map.createPane('mask');
    const maskPane = state.map.getPane('mask');
    if (maskPane) {
      maskPane.classList.add('treaty-mask-pane');
      maskPane.style.zIndex = 600;
      maskPane.style.pointerEvents = 'none';
      maskPane.style.mixBlendMode = 'multiply';
    }

    const laBounds = L.latLngBounds(
      L.latLng(33.7, -118.95),
      L.latLng(34.8, -117.6)
    );

    const boundsPadding = 0.2;
    state.map.setMaxBounds(laBounds.pad(boundsPadding));
    state.map.setMinZoom(9);
    state.map.setMaxZoom(18);

    state.map.whenReady(() => {
      setTimeout(() => state.map.invalidateSize(true), 200);
    });

    state.map.on('movestart', hideHoverCard);
    state.map.on('zoomstart', hideHoverCard);
    state.map.on('movestart', handleTreatyMoveStart);
    state.map.on('zoomstart', handleTreatyMoveStart);
  }

  function drawGridOverlay() {
    const svg = document.getElementById('map-grid-overlay');
    if (!svg) return;

    const cols = 7;
    const rows = 5;
    svg.innerHTML = '';

    for (let c = 1; c < cols; c += 1) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', `${(c / cols) * 100}%`);
      line.setAttribute('y1', '0');
      line.setAttribute('x2', `${(c / cols) * 100}%`);
      line.setAttribute('y2', '100%');
      line.setAttribute('stroke', 'rgba(31, 28, 25, 0.22)');
      line.setAttribute('stroke-width', '0.5');
      line.setAttribute('stroke-dasharray', '4 10');
      svg.appendChild(line);
    }

    for (let r = 1; r < rows; r += 1) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', '0');
      line.setAttribute('y1', `${(r / rows) * 100}%`);
      line.setAttribute('x2', '100%');
      line.setAttribute('y2', `${(r / rows) * 100}%`);
      line.setAttribute('stroke', 'rgba(31, 28, 25, 0.16)');
      line.setAttribute('stroke-width', '0.5');
      line.setAttribute('stroke-dasharray', '4 12');
      svg.appendChild(line);
    }
  }

  async function loadData() {
    try {
      const datasetUrl = `data/la_mexican_history.geojson?v=${Date.now()}`;
      const response = await fetch(datasetUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const geojson = await response.json();

      state.allRecords = Array.isArray(geojson.features) ? geojson.features.slice() : [];
      applyDataHotfixes(state.allRecords);
      state.allRecords.sort((a, b) => {
        const yearA = Number(a?.properties?.era_year) || 0;
        const yearB = Number(b?.properties?.era_year) || 0;
        return yearA - yearB;
      });

      applyFilters();
      if (state.quickTour && state.filteredRecords.length) {
        setTimeout(() => selectRecord(0, { center: true }), 800);
        state.quickTour = false;
      }
    } catch (error) {
      console.error('Failed to load GeoJSON data:', error);
      reportEmptyState('Unable to load archive records. Please try reloading the page.');
    }
  }

  function applyFilters() {
    const query = state.searchTerm.trim().toLowerCase();

    state.filteredRecords = state.allRecords.filter(feature => {
      const props = feature.properties || {};
      if (state.activeCategory !== 'all' && props.category !== state.activeCategory) return false;
      if (!query) return true;

      const searchable = [
        props.site_name,
        props.status_summary,
        props.historical_significance,
        props.neighborhood_area,
        props.creator
      ].join(' ').toLowerCase();

      return searchable.includes(query);
    });

    updateRecordCount();
    renderMap();
    renderLocationsList();
    renderDetailsPanel();
  }

  function updateRecordCount() {
    const countEl = document.getElementById('record-count');
    if (!countEl) return;
    const total = state.filteredRecords.length;
    countEl.textContent = String(total);
  }

  function renderMap() {
    if (!state.map) return;
    clearTreatyOverlay();
    clearRanchoOverlay();
    clearOlveraOverlay();
    clearZanjaOverlay();
    clearBoyleOverlay();
    clearBunkerOverlay();
    clearBlowoutsOverlay();
    clearZootOverlay();
    clearRailLaborOverlay();

    const railStore = state.specialLayers.railLabor;
    if (railStore) {
      railStore.entry = null;
      railStore.index = null;
    }

    state.markers.forEach(entry => {
      if (entry?.layer) entry.layer.remove();
      else if (entry?.marker) entry.marker.remove();
    });
    state.markers = new Array(state.filteredRecords.length).fill(null);

    state.filteredRecords.forEach((feature, index) => {
      const siteId = (feature?.properties?.site_id || '').toLowerCase();
      if (siteId === olveraLineId) {
        const markerEntry = createOlveraMarker(feature, index);
        if (markerEntry) {
          markerEntry.layer.addTo(state.map);
          state.markers[index] = markerEntry;
          cacheOlveraLine(feature);
        }
        return;
      }

      if (siteId === railLaborLineId) {
        const lineEntry = createGeometryLayer(feature, index);
        if (!lineEntry) return;
        if (railStore) {
          railStore.entry = lineEntry;
          railStore.index = index;
        }
        state.markers[index] = lineEntry;
        return;
      }

      const layerEntry = createGeometryLayer(feature, index);
      if (!layerEntry) return;
      layerEntry.layer.addTo(state.map);
      state.markers[index] = layerEntry;
    });

    updateMarkerVisuals();
  }

  function createGeometryLayer(feature, index) {
    const geometry = feature?.geometry;
    if (!geometry) return null;

    if (geometry.type === 'Point') {
      const coords = geometry.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) return null;
      const lat = coords[1];
      const lng = coords[0];
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      const marker = L.marker([lat, lng], {
        pane: 'points',
        icon: buildMarkerIcon(feature)
      });
      marker.on('add', updateMarkerVisuals);

      marker.on('click', () => selectRecord(index, { center: true }));
      const props = feature?.properties || {};
      const siteId = (props.site_id || '').toLowerCase();
      marker.on('mousemove', evt => {
        const origin = evt?.originalEvent;
        if (origin) showHoverCard(feature, origin.clientX, origin.clientY);
      });
      marker.on('mouseout', hideHoverCard);
      marker.bindPopup(buildMarkerPopup(feature), {
        className: 'archive-popup',
        maxWidth: 220,
        closeButton: false,
        autoPan: false
      });

      const getBounds = () => {
        const ll = marker.getLatLng();
        return L.latLngBounds(ll, ll);
      };

      return {
        layer: marker,
        feature,
        mode: 'point',
        getCenter: () => marker.getLatLng(),
        getBounds,
        openPopup: () => marker.openPopup()
      };
    }

    if (geometry.type === 'LineString' || geometry.type === 'MultiLineString') {
      const subLayers = [];
      const lineLayer = L.geoJSON(feature, {
        pane: 'areas',
        style: {
          color: getMarkerColor(feature),
          weight: 3,
          opacity: 0.85
        },
        onEachFeature: (feat, layer) => {
          subLayers.push(layer);
          layer.on('click', () => selectRecord(index, { center: true }));
          layer.on('mousemove', evt => {
            const origin = evt?.originalEvent;
            if (origin) showHoverCard(feature, origin.clientX, origin.clientY);
          });
          layer.on('mouseout', hideHoverCard);
          layer.bindPopup(buildMarkerPopup(feature), {
            className: 'archive-popup',
            maxWidth: 240,
            closeButton: false,
            autoPan: false
          });
        }
      });

      const getBounds = () => lineLayer.getBounds();

      return {
        layer: lineLayer,
        feature,
        mode: 'line',
        getCenter: () => {
          const bounds = lineLayer.getBounds();
          return bounds?.isValid() ? bounds.getCenter() : null;
        },
        getBounds,
        openPopup: () => {
          if (subLayers.length) subLayers[0].openPopup();
        }
      };
    }

    if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
      const subLayers = [];
      const polygon = L.geoJSON(feature, {
        pane: 'areas',
        style: {
          color: getMarkerColor(feature),
          weight: 1,
          opacity: 0.35,
          fillColor: getMarkerColor(feature),
          fillOpacity: 0,
          dashArray: '2 10'
        },
        onEachFeature: (feat, layer) => {
          subLayers.push(layer);
          layer.on('click', () => selectRecord(index, { center: true }));
          layer.on('mousemove', evt => {
            const origin = evt?.originalEvent;
            if (origin) showHoverCard(feature, origin.clientX, origin.clientY);
          });
          layer.on('mouseout', hideHoverCard);
          layer.bindPopup(buildMarkerPopup(feature), {
            className: 'archive-popup',
            maxWidth: 240,
            closeButton: false,
            autoPan: false
          });
        }
      });

      const getBounds = () => polygon.getBounds();

      return {
        layer: polygon,
        feature,
        mode: 'area',
        getCenter: () => {
          const bounds = polygon.getBounds();
          return bounds?.isValid() ? bounds.getCenter() : null;
        },
        getBounds,
        openPopup: () => {
          if (subLayers.length) subLayers[0].openPopup();
        }
      };
    }

    return null;
  }

  function createOlveraMarker(feature, index) {
    const props = feature?.properties || {};
    const latLng = getFeatureLatLng(feature);
    if (!latLng) return null;
    const [lat, lng] = latLng;

    const marker = L.marker([lat, lng], {
      pane: 'points',
      icon: buildMarkerIcon(feature)
    });
    marker.on('add', updateMarkerVisuals);

    marker.on('click', () => selectRecord(index, { center: true }));
    marker.on('mousemove', evt => {
      const origin = evt?.originalEvent;
      if (origin) showHoverCard(feature, origin.clientX, origin.clientY);
    });
    marker.on('mouseout', hideHoverCard);
    marker.bindPopup(buildMarkerPopup(feature), {
      className: 'archive-popup',
      maxWidth: 220,
      closeButton: false,
      autoPan: false
    });

    return {
      layer: marker,
      feature,
      mode: 'point',
      getCenter: () => marker.getLatLng(),
      getBounds: () => {
        const ll = marker.getLatLng();
        return L.latLngBounds(ll, ll);
      },
      openPopup: () => marker.openPopup()
    };
  }

  function cacheOlveraLine(feature) {
    const overlay = state.specialLayers.olvera;
    if (!overlay) return;
    overlay.feature = {
      type: 'Feature',
      geometry: feature.geometry
    };
  }

  function activateOlveraLine(options = {}) {
    if (!state.map) return;
    const overlay = state.specialLayers.olvera;
    if (!overlay?.feature?.geometry) return;
    clearOlveraOverlay();
    overlay.line = L.geoJSON(overlay.feature, {
      pane: 'areas',
      style: {
        color: '#f5c542',
        weight: 6,
        opacity: 0.95,
        dashArray: '4 10'
      }
    }).addTo(state.map);
    if (overlay.line?.bringToFront) overlay.line.bringToFront();
    const bounds = overlay.line.getBounds();
    if (options.center && bounds?.isValid()) {
      state.map.fitBounds(bounds, { padding: [32, 32] });
    }
  }

  function clearOlveraOverlay() {
    const overlay = state.specialLayers.olvera;
    if (!overlay) return;
    if (overlay.line) {
      overlay.line.remove();
      overlay.line = null;
    }
  }

  function activateBlowoutsOverlay(options = {}) {
    if (!state.map) return;
    const overlay = state.specialLayers.blowouts;
    if (!overlay) return;

    clearBlowoutsOverlay();

    const layers = [];
    blowoutsSchools.forEach(school => {
      const circle = L.circle([school.coords[0], school.coords[1]], {
        pane: 'areas',
        radius: school.radius,
        color: '#3d4f84',
        weight: 2,
        opacity: 0.9,
        fillColor: '#3d4f84',
        fillOpacity: 0.18,
        interactive: false,
        className: 'blowout-circle'
      });

      const label = L.marker([school.coords[0], school.coords[1]], {
        pane: 'areas',
        icon: L.divIcon({
          className: 'blowout-label',
          html: `<span>${escapeHtml(school.name)}</span>`,
          iconSize: [0, 0]
        }),
        interactive: false
      });

      layers.push(circle, label);
    });

    const group = L.layerGroup(layers).addTo(state.map);
    overlay.group = group;

    const bounds = layers.reduce((acc, layer) => {
      if (layer.getBounds) {
        const layerBounds = layer.getBounds();
        if (layerBounds && typeof layerBounds.isValid === 'function' && layerBounds.isValid()) {
          acc.extend(layerBounds);
        }
      } else if (layer.getLatLng) {
        const point = layer.getLatLng();
        if (point) acc.extend(point);
      }
      return acc;
    }, L.latLngBounds());

    overlay.bounds = bounds.isValid() ? bounds : null;

    if (options.center && overlay.bounds) {
      state.map.fitBounds(overlay.bounds.pad(0.18), {
        animate: true,
        duration: 0.8
      });
    }
  }

  function clearBlowoutsOverlay() {
    const overlay = state.specialLayers.blowouts;
    if (!overlay) return;
    if (overlay.group) {
      overlay.group.remove();
      overlay.group = null;
    }
    overlay.bounds = null;
  }

  function activateMoratoriumRoute(options = {}) {
    if (!state.map) return;
    const store = state.specialLayers.moratorium;
    if (!store) return;

    clearMoratoriumRoute();

    const polyline = L.polyline(moratoriumRouteCoords, {
      pane: 'areas',
      color: '#b84033',
      weight: 4,
      opacity: 0.85,
      dashArray: '6 6'
    }).addTo(state.map);

    store.polyline = polyline;

    if (options.center && polyline.getBounds) {
      const bounds = polyline.getBounds();
      if (bounds?.isValid()) {
        state.map.fitBounds(bounds.pad(0.15), { animate: true, duration: 0.8 });
      }
    }
  }

  function clearMoratoriumRoute() {
    const store = state.specialLayers.moratorium;
    if (!store) return;
    if (store.polyline) {
      store.polyline.remove();
      store.polyline = null;
    }
  }

  function activateBoyleOverlay(options = {}) {
    if (!state.map) return;
    const overlay = state.specialLayers.boyle;
    if (!overlay) return;

    clearBoyleOverlay();

    const polygon = L.polygon(boylePolygonCoords, {
      pane: 'areas',
      color: '#bb3a82',
      weight: 2.5,
      opacity: 0.9,
      fillColor: '#bb3a82',
      fillOpacity: 0.12,
      dashArray: '6 8',
      className: 'boyle-heights-polygon'
    }).addTo(state.map);
    overlay.polygon = polygon;
    overlay.bounds = polygon.getBounds?.() || null;

    const labelCenter = overlay.bounds?.isValid() ? overlay.bounds.getCenter() : polygon.getBounds().getCenter();
    const label = L.marker(labelCenter, {
      pane: 'areas',
      icon: L.divIcon({
        className: 'boyle-label',
        html: '<span>Boyle Heights</span>',
        iconSize: [0, 0]
      }),
      interactive: false
    }).addTo(state.map);
    overlay.label = label;

    if (options.center && overlay.bounds?.isValid()) {
      state.map.fitBounds(overlay.bounds.pad(0.14), {
        animate: true,
        duration: 0.8
      });
    }
  }

  function clearBoyleOverlay() {
    const overlay = state.specialLayers.boyle;
    if (!overlay) return;
    if (overlay.polygon) {
      overlay.polygon.remove();
      overlay.polygon = null;
    }
    if (overlay.label) {
      overlay.label.remove();
      overlay.label = null;
    }
    overlay.bounds = null;
  }

  function activateZanjaOverlay(options = {}) {
    if (!state.map) return;
    const overlay = state.specialLayers.zanja;
    if (!overlay) return;

    clearZanjaOverlay();

    const polygon = L.polygon(zanjaPolygonCoords, {
      pane: 'areas',
      color: '#c24b40',
      weight: 2,
      opacity: 0.9,
      fillColor: '#c24b40',
      fillOpacity: 0.1,
      dashArray: '6 10',
      className: 'zanja-madre-polygon'
    }).addTo(state.map);
    overlay.polygon = polygon;
    overlay.bounds = polygon.getBounds?.() || null;

    const labelCenter = overlay.bounds?.isValid() ? overlay.bounds.getCenter() : polygon.getBounds().getCenter();
    const label = L.marker(labelCenter, {
      pane: 'areas',
      icon: L.divIcon({
        className: 'zanja-label',
        html: '<span>Zanja Madre</span>',
        iconSize: [0, 0]
      }),
      interactive: false
    }).addTo(state.map);
    overlay.label = label;

    if (options.center && overlay.bounds?.isValid()) {
      state.map.fitBounds(overlay.bounds.pad(0.12), {
        animate: true,
        duration: 0.8
      });
    }
  }

  function clearZanjaOverlay() {
    const overlay = state.specialLayers.zanja;
    if (!overlay) return;
    if (overlay.polygon) {
      overlay.polygon.remove();
      overlay.polygon = null;
    }
    if (overlay.label) {
      overlay.label.remove();
      overlay.label = null;
    }
    overlay.bounds = null;
  }

  function activateBunkerOverlay(options = {}) {
    if (!state.map) return;
    const overlay = state.specialLayers.bunker;
    if (!overlay) return;

    clearBunkerOverlay();

    const polygon = L.polygon(bunkerPolygonCoords, {
      pane: 'areas',
      color: '#bb3a82',
      weight: 2.5,
      opacity: 0.9,
      fillColor: '#bb3a82',
      fillOpacity: 0.12,
      dashArray: '6 8',
      className: 'bunker-hill-polygon'
    }).addTo(state.map);
    overlay.polygon = polygon;
    overlay.bounds = polygon.getBounds?.() || null;

    const labelCenter = overlay.bounds?.isValid() ? overlay.bounds.getCenter() : polygon.getBounds().getCenter();
    const label = L.marker(labelCenter, {
      pane: 'areas',
      icon: L.divIcon({
        className: 'bunker-label',
        html: '<span>Bunker Hill</span>',
        iconSize: [0, 0]
      }),
      interactive: false
    }).addTo(state.map);
    overlay.label = label;

    if (options.center && overlay.bounds?.isValid()) {
      state.map.fitBounds(overlay.bounds.pad(0.12), {
        animate: true,
        duration: 0.8
      });
    }
  }

  function clearBunkerOverlay() {
    const overlay = state.specialLayers.bunker;
    if (!overlay) return;
    if (overlay.polygon) {
      overlay.polygon.remove();
      overlay.polygon = null;
    }
    if (overlay.label) {
      overlay.label.remove();
      overlay.label = null;
    }
    overlay.bounds = null;
  }

  function activateZootOverlay(options = {}) {
    if (!state.map) return;
    const overlay = state.specialLayers.zoot;
    if (!overlay) return;

    clearZootOverlay();

    const circles = zootFlashpoints.map(point => L.circle([point.coords[0], point.coords[1]], {
      pane: 'areas',
      radius: point.radius,
      color: '#c24b40',
      weight: 2,
      opacity: 0.85,
      fillColor: '#c24b40',
      fillOpacity: 0.16,
      interactive: false,
      className: 'zoot-riots-circle'
    }));

    const group = L.layerGroup(circles).addTo(state.map);
    overlay.group = group;

    const bounds = circles.reduce((acc, circle) => {
      const circleBounds = circle.getBounds();
      if (circleBounds && typeof circleBounds.isValid === 'function' && circleBounds.isValid()) {
        acc.extend(circleBounds);
      }
      return acc;
    }, L.latLngBounds());

    overlay.bounds = bounds.isValid() ? bounds : null;

    if (options.center && overlay.bounds) {
      state.map.fitBounds(overlay.bounds.pad(0.2), {
        animate: true,
        duration: 0.8
      });
    }
  }

  function clearZootOverlay() {
    const overlay = state.specialLayers.zoot;
    if (!overlay) return;
    if (overlay.group) {
      overlay.group.remove();
      overlay.group = null;
    }
    overlay.bounds = null;
  }

  function activateChavezOverlay() {
    const store = state.specialLayers.chavez;
    if (store) store.manualVisible = false;
    ensureChavezOverlayElements();
    setChavezOverlayVisible(false);
  }

  function ensureChavezOverlayElements() {
    if (!state.map) return;
    const store = state.specialLayers.chavez;
    if (!store) return;

    if (!store.overlay) {
      store.overlay = L.imageOverlay(chavezOverlayImage, chavezOverlayBounds, {
        opacity: 0,
        interactive: false
      }).addTo(state.map);

      requestAnimationFrame(() => {
        const element = store.overlay?.getElement();
        if (element) element.style.transition = 'opacity 260ms ease';
      });
    } else if (!state.map.hasLayer(store.overlay)) {
      store.overlay.addTo(state.map);
    }

    if (!store.rectangle) {
      store.rectangle = L.rectangle(chavezOverlayBounds, {
        color: '#d97745',
        weight: 1.4,
        fillColor: '#d97745',
        fillOpacity: 0.08,
        dashArray: '6 6',
        className: 'chavez-hover-zone',
        keyboard: true
      }).addTo(state.map);

      const show = () => {
        if (store.manualVisible) return;
        setChavezOverlayVisible(true);
      };
      const hide = () => {
        if (store.manualVisible) return;
        setChavezOverlayVisible(false);
      };

      store.rectangle.on('mouseover', show);
      store.rectangle.on('mouseout', hide);
      store.rectangle.on('focus', show);
      store.rectangle.on('blur', hide);
      store.rectangle.bindTooltip('Hover to reveal 1930 barrio plat map', {
        direction: 'top',
        offset: [0, -10],
        sticky: true
      });
    } else if (!state.map.hasLayer(store.rectangle)) {
      store.rectangle.addTo(state.map);
    }

    if (store.rectangle?.bringToFront) store.rectangle.bringToFront();
  }

  function setChavezOverlayVisible(isVisible) {
    const overlay = state.specialLayers.chavez?.overlay;
    if (!overlay) return;
    overlay.setOpacity(isVisible ? chavezOverlayOpacity : 0);
  }

  function clearChavezOverlay() {
    const store = state.specialLayers.chavez;
    if (!store) return;
    store.manualVisible = false;
    setChavezOverlayVisible(false);
    if (store.rectangle) {
      store.rectangle.off();
      if (state.map?.hasLayer(store.rectangle)) store.rectangle.remove();
      store.rectangle = null;
    }
    if (store.overlay) {
      if (state.map?.hasLayer(store.overlay)) store.overlay.remove();
      store.overlay = null;
    }
  }

  function activateRailLaborOverlay(options = {}) {
    if (!state.map) return;
    const overlay = state.specialLayers.railLabor;
    if (!overlay?.entry?.layer) return;

    clearRailLaborOverlay();
    overlay.layer = overlay.entry.layer.addTo(state.map);
    if (overlay.layer?.bringToFront) overlay.layer.bringToFront();

    if (options.center) {
      const bounds = overlay.entry.getBounds?.();
      if (bounds && typeof bounds.isValid === 'function' && bounds.isValid()) {
        state.map.fitBounds(bounds, { padding: [36, 36] });
      } else {
        const center = overlay.entry.getCenter?.();
        if (center) {
          state.map.setView(center, Math.max(state.map.getZoom(), 11), {
            animate: true,
            duration: 0.8
          });
        }
      }
    }
  }

  function clearRailLaborOverlay() {
    const overlay = state.specialLayers.railLabor;
    if (!overlay) return;
    if (overlay.layer) {
      overlay.layer.remove();
      overlay.layer = null;
    }
  }

  function getFeatureLatLng(feature) {
    const props = feature?.properties || {};
    let lat = Number(props.latitude);
    let lng = Number(props.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];

    const geom = feature?.geometry;
    if (!geom) return null;

    const collectCoords = [];
    if (geom.type === 'Point' && Array.isArray(geom.coordinates) && geom.coordinates.length >= 2) {
      collectCoords.push(geom.coordinates);
    } else if (geom.type === 'LineString') {
      if (Array.isArray(geom.coordinates)) collectCoords.push(...geom.coordinates);
    } else if (geom.type === 'MultiLineString') {
      if (Array.isArray(geom.coordinates)) {
        geom.coordinates.forEach(segment => {
          if (Array.isArray(segment)) collectCoords.push(...segment);
        });
      }
    }

    if (!collectCoords.length) return null;
    const sum = collectCoords.reduce((acc, coord) => {
      if (!Array.isArray(coord) || coord.length < 2) return acc;
      acc.lng += Number(coord[0]);
      acc.lat += Number(coord[1]);
      acc.count += 1;
      return acc;
    }, { lat: 0, lng: 0, count: 0 });

    if (!sum.count) return null;
    return [sum.lat / sum.count, sum.lng / sum.count];
  }

  function activateTreatyOverlay(feature) {
    if (!state.map) return;
    clearTreatyOverlay();

    const overlayStore = state.specialLayers.treaty;
    if (!overlayStore.prevState) {
      overlayStore.prevState = {
        maxBounds: state.map.options.maxBounds || null,
        minZoom: typeof state.map.getMinZoom === 'function'
          ? state.map.getMinZoom()
          : state.map.options.minZoom || 9
      };
    }
    state.map.setMaxBounds(null);
    state.map.setMinZoom(3);
    overlayStore.suppressMove = true;
    if (state.map) {
      state.map.once('moveend', () => {
        overlayStore.suppressMove = false;
      });
    }

    const highlight = createTreatyHighlight(feature);
    if (highlight) {
      highlight.addTo(state.map);
      overlayStore.highlight = highlight;
      if (highlight.bringToFront) highlight.bringToFront();
    }

    const mask = createTreatyMask(feature);
    if (mask) {
      mask.addTo(state.map);
      overlayStore.mask = mask;
      if (mask.bringToBack) mask.bringToBack();
    }

    const statesLayer = createTreatyStateLabels();
    if (statesLayer) {
      statesLayer.addTo(state.map);
      overlayStore.states = statesLayer;
      if (statesLayer.bringToFront) statesLayer.bringToFront();
    }

    const label = createTreatyLabel(feature, highlight);
    if (label) {
      label.addTo(state.map);
      overlayStore.label = label;
      if (label.bringToFront) label.bringToFront();
    }

    document.body.classList.add('treaty-mode');
    overlayStore.isActive = true;
    showTreatyExitButton();

    if (highlight) {
      const bounds = highlight.getBounds();
      if (bounds?.isValid && bounds.isValid()) {
        state.map.fitBounds(bounds, { padding: [48, 48], maxZoom: 6 });
      }
    }
  }

  function clearTreatyOverlay() {
    const overlayStore = state.specialLayers.treaty;
    if (!overlayStore) return;
    ['highlight', 'mask', 'label', 'states'].forEach(key => {
      if (overlayStore[key]) {
        overlayStore[key].remove();
        overlayStore[key] = null;
      }
    });
    if (overlayStore.prevState && state.map) {
      const { maxBounds, minZoom } = overlayStore.prevState;
      if (maxBounds) state.map.setMaxBounds(maxBounds);
      else state.map.setMaxBounds(null);
      if (typeof minZoom === 'number') state.map.setMinZoom(minZoom);
      overlayStore.prevState = null;
    }
    document.body.classList.remove('treaty-mode');
    overlayStore.isActive = false;
    overlayStore.suppressMove = false;
    hideTreatyExitButton();
  }

  function activateRanchoOverlay() {
    if (!state.map) return;
    const overlayStore = state.specialLayers.rancho;
    const features = state.allRecords.filter(f => ranchoSites.has((f?.properties?.site_id || '').toLowerCase()));
    const points = [];
    features.forEach(feature => {
      collectGeometryLatLngs(feature).forEach(pt => points.push(pt));
    });
    if (!points.length) return;

    const bounds = L.latLngBounds(points.map(([lat, lng]) => [lat, lng]));
    overlayStore.isActive = true;
    overlayStore.bounds = bounds;
    state.map.fitBounds(bounds.pad(0.2), { animate: true, duration: 0.8 });
  }

  function clearRanchoOverlay() {
    const overlayStore = state.specialLayers.rancho;
    if (!overlayStore) return;
    overlayStore.isActive = false;
    overlayStore.siteId = null;
    overlayStore.bounds = null;
  }

  function exitTreatyOverlay(options = {}) {
    const overlayStore = state.specialLayers.treaty;
    if (!overlayStore?.isActive) return;
    clearTreatyOverlay();
    state.selectedIndex = null;
    renderDetailsPanel();
    highlightSelectedItem();
    if (options.recenter !== false && state.map) {
      const zoom = 11;
      state.map.setView([34.05, -118.25], zoom, {
        animate: true,
        duration: 0.8
      });
    }
  }

  function createTreatyHighlight(feature) {
    if (!feature?.geometry) return null;
    return L.geoJSON(feature, {
      pane: 'areas',
      style: {
        color: '#f27a52',
        weight: 3,
        opacity: 0.95,
        fillColor: '#fcd1c4',
        fillOpacity: 0.16,
        dashArray: '4 6'
      }
    });
  }

  function createTreatyMask(feature) {
    const geometry = feature?.geometry;
    if (!geometry) return null;

    const outerRing = closeRing([
      [85, -180],
      [85, 180],
      [-85, 180],
      [-85, -180]
    ]);

    const holes = extractTreatyRings(geometry);
    if (!holes.length) return null;

    return L.polygon([outerRing, ...holes], {
      pane: 'mask',
      color: '#0c0c0c',
      weight: 0,
      fillColor: '#0c0c0c',
      fillOpacity: 0.35,
      interactive: false
    });
  }

  function createTreatyLabel(feature, highlightLayer) {
    const props = feature?.properties || {};
    const bounds = highlightLayer?.getBounds?.();
    const center = bounds?.isValid && bounds.isValid() ? bounds.getCenter() : null;
    if (!center) return null;

    const statesList = treatyStateLabels.map(entry => entry.name).join(' • ');
    const html = `
      <div class="treaty-label__wrap">
        <div class="treaty-label__title">${coalesce(props.site_name, 'Treaty of Guadalupe Hidalgo')}</div>
        <div class="treaty-label__meta">1848 · U.S. pays $15M to Mexico · Mexican Cession</div>
        <div class="treaty-label__meta" style="margin-top:6px;">${statesList}</div>
      </div>
    `;

    return L.marker(center, {
      pane: 'areas',
      icon: L.divIcon({
        className: 'treaty-label',
        html,
        iconSize: [280, 68],
        iconAnchor: [140, -20]
      }),
      interactive: false
    });
  }

  const treatyStateLabels = [
    { name: 'California', coords: [37.3, -120.2] },
    { name: 'Nevada', coords: [39.0, -117.0] },
    { name: 'Utah', coords: [39.3, -112.0] },
    { name: 'Arizona', coords: [34.6, -112.0] },
    { name: 'New Mexico', coords: [34.8, -105.5] },
    { name: 'Colorado', coords: [38.5, -106.8] },
    { name: 'Wyoming', coords: [41.2, -109.7] },
    { name: 'Kansas', coords: [39.2, -101.6] },
    { name: 'Oklahoma', coords: [36.8, -102.7] }
  ];

  function createTreatyStateLabels() {
    const markers = treatyStateLabels.map(entry => L.marker([entry.coords[0], entry.coords[1]], {
      pane: 'areas',
      icon: L.divIcon({
        className: 'treaty-state-label',
        html: `<span>${entry.name}</span>`
      }),
      interactive: false
    }));
    return L.layerGroup(markers);
  }

  function handleTreatyMoveStart() {
    const overlayStore = state.specialLayers.treaty;
    if (!overlayStore?.isActive || overlayStore.suppressMove) return;
    exitTreatyOverlay({ recenter: false });
  }

  function extractTreatyRings(geometry) {
    const rings = [];
    const pushRing = ring => {
      if (!Array.isArray(ring) || ring.length < 3) return;
      const converted = closeRing(
        ring.map(pair => {
          if (!Array.isArray(pair) || pair.length < 2) return null;
          return [pair[1], pair[0]];
        }).filter(Boolean)
      );
      if (converted.length >= 4) {
        const reversed = converted
          .slice(0, -1)
          .reverse();
        reversed.push(reversed[0]);
        rings.push(reversed);
      }
    };

    if (geometry.type === 'Polygon') {
      geometry.coordinates.forEach(pushRing);
    } else if (geometry.type === 'MultiPolygon') {
      geometry.coordinates.forEach(poly => {
        if (Array.isArray(poly)) poly.forEach(pushRing);
      });
    }
    return rings;
  }

  function closeRing(coords) {
    if (!Array.isArray(coords) || !coords.length) return coords || [];
    const first = coords[0];
    const last = coords[coords.length - 1];
    if (!last || last[0] !== first[0] || last[1] !== first[1]) {
      coords = coords.slice();
      coords.push([first[0], first[1]]);
    }
    return coords;
  }

  function getMarkerColor(feature) {
    const category = feature?.properties?.category;
    return categoryColors[category] || categoryColors.default;
  }

  function hexToRgba(hex, alpha = 1) {
    if (!hex) return `rgba(0,0,0,${alpha})`;
    let normalized = String(hex).trim();
    if (normalized.startsWith('#')) normalized = normalized.slice(1);
    if (normalized.length === 3) {
      normalized = normalized.split('').map(char => char + char).join('');
    }
    if (normalized.length !== 6 || Number.isNaN(parseInt(normalized, 16))) {
      return `rgba(0,0,0,${alpha})`;
    }
    const num = parseInt(normalized, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function buildMarkerIcon(feature) {
    const color = getMarkerColor(feature);
    const halo = hexToRgba(color, 0.18);
    const glow = hexToRgba(color, 0.32);
    return L.divIcon({
      className: 'marker-badge',
      html: `<span class="marker-outer" style="--marker-color:${color};--marker-halo:${halo};--marker-glow:${glow};"><span class="marker-inner"></span></span>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  }

  function updateMarkerVisuals() {
    const selected = state.selectedIndex;
    state.markers.forEach((entry, idx) => {
      if (!entry || entry.mode !== 'point') return;
      const iconEl = entry.layer?._icon || entry.marker?._icon;
      if (!iconEl) return;
      iconEl.classList.remove('is-active', 'is-muted');
      if (selected == null) return;
      if (idx === selected) iconEl.classList.add('is-active');
      else iconEl.classList.add('is-muted');
    });
  }

  function storeMapView() {
    if (!state.map) return;
    state.previousMapView = {
      center: state.map.getCenter(),
      zoom: state.map.getZoom()
    };
  }

  function resetMapView() {
    if (!state.map) return;
    const target = state.previousMapView || state.initialView;
    if (target?.center && typeof target.zoom === 'number') {
      state.map.setView(target.center, target.zoom, {
        animate: true,
        duration: 0.8
      });
    }
    state.previousMapView = null;
    try {
      state.map.closePopup();
    } catch (err) {}
  }

  function buildMarkerPopup(feature) {
    const props = feature?.properties || {};
    const preview = sanitizeUrl(props.image_preview);
    return `
      <div style="font-family:'Inter',sans-serif;font-size:12px;line-height:1.5;color:#2c2622;">
        ${preview ? `<div class="popup-image"><img src="${preview}" alt="${escapeHtml(coalesce(props.site_name, 'Preview'))}"></div>` : ''}
        <strong style="display:block;font-size:14px;margin-bottom:4px;letter-spacing:0.02em;">${coalesce(props.site_name, 'Untitled record')}</strong>
        <div style="text-transform:uppercase;letter-spacing:0.16em;color:rgba(32,29,26,0.6);">${coalesce(props.era_year, 'Year unknown')} • ${prettyCategory(props.category)}</div>
        <p style="margin-top:10px;color:rgba(32,29,26,0.75);">${truncate(coalesce(props.status_summary, 'No description provided.'), 140)}</p>
      </div>
    `;
  }

  function wireUI() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', event => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          state.searchTerm = event.target.value;
          applyFilters();
        }, 200);
      });

      searchInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
          state.searchTerm = event.target.value;
          applyFilters();
          event.target.blur();
        }
      });
    }
    const laptopClose = document.querySelector('[data-close-laptop]');
    if (laptopClose) laptopClose.addEventListener('click', closeLaptop);
  }

  function renderLocationsList() {
    const list = document.getElementById('locations-list');
    if (!list) return;
    list.innerHTML = '';
    const resultsTotal = state.filteredRecords.length;
    const listCountEl = document.getElementById('list-count');
    if (listCountEl) listCountEl.textContent = resultsTotal === 1 ? '1 result' : `${resultsTotal} results`;

    if (!resultsTotal) {
      const empty = document.createElement('div');
      empty.className = 'details-empty';
      empty.innerHTML = '<h3>No Locations Found</h3><p>Adjust the filters to reveal additional stories.</p>';
      list.appendChild(empty);
      state.selectedIndex = null;
      updateMarkerVisuals();
      return;
    }

    state.filteredRecords.forEach((feature, index) => {
      const props = feature.properties || {};
      const item = document.createElement('article');
      item.className = 'location-item';
      item.dataset.index = String(index);

      const year = props.era_year ? `<span>${props.era_year}</span>` : '<span>Year unknown</span>';
      const category = `<span>${prettyCategory(props.category)}</span>`;
      const neighborhood = props.neighborhood_area ? `<span>${props.neighborhood_area}</span>` : '';

      item.innerHTML = `
        <div class="location-meta">${year}${category}${neighborhood}</div>
        <div class="location-title">${coalesce(props.site_name, 'Untitled record')}</div>
        <div class="location-summary">${truncate(coalesce(props.status_summary, 'No summary provided.'), 220)}</div>
      `;

      item.style.setProperty('--location-accent', getMarkerColor(feature));
      item.addEventListener('click', () => selectRecord(index, { center: true }));
      list.appendChild(item);
    });

    highlightSelectedItem();
  }

  function selectRecord(index, options = {}) {
    if (index == null || index < 0 || index >= state.filteredRecords.length) {
      state.selectedIndex = null;
      renderDetailsPanel();
      highlightSelectedItem();
      clearChavezOverlay();
      clearMoratoriumRoute();
      if (options.resetMap) resetMapView();
      return;
    }

    if (state.map && options.storeView !== false) storeMapView();

    state.selectedIndex = index;
    renderDetailsPanel();
    highlightSelectedItem();

    const feature = state.filteredRecords[index];
    const siteId = (feature?.properties?.site_id || '').toLowerCase();
    const isTreaty = siteId === TREATY_ID;
    const isRancho = ranchoSites.has(siteId);
    const isOlvera = siteId === olveraLineId;
    const isRailLabor = siteId === railLaborLineId;
    const isBoyle = boyleSiteIds.has(siteId);
    const isZanja = siteId === zanjaSiteId;
    const isBunker = siteId === bunkerSiteId;
    const isBlowouts = siteId === blowoutsSiteId;
    const isMoratorium = siteId === moratoriumSiteId;
    const isZoot = siteId === zootSiteId;
    const isChavezCommunity = siteId === chavezCommunityId;

    if (!isChavezCommunity) clearChavezOverlay();
    clearMoratoriumRoute();

    if (isTreaty) {
      clearRanchoOverlay();
      clearOlveraOverlay();
      clearZanjaOverlay();
      clearBoyleOverlay();
      clearBunkerOverlay();
      clearBlowoutsOverlay();
      clearZootOverlay();
      clearRailLaborOverlay();
      activateTreatyOverlay(feature);
    } else if (isRancho) {
      clearTreatyOverlay();
      clearOlveraOverlay();
      clearZanjaOverlay();
      clearBoyleOverlay();
      clearBunkerOverlay();
      clearBlowoutsOverlay();
      clearZootOverlay();
      clearRailLaborOverlay();
      activateRanchoOverlay(siteId);
    } else if (isOlvera) {
      clearTreatyOverlay();
      clearRanchoOverlay();
      clearZanjaOverlay();
      clearBoyleOverlay();
      clearBunkerOverlay();
      clearBlowoutsOverlay();
      clearZootOverlay();
      clearRailLaborOverlay();
      activateOlveraLine({ center: options.center });
    } else if (isRailLabor) {
      clearTreatyOverlay();
      clearRanchoOverlay();
      clearOlveraOverlay();
      clearZanjaOverlay();
      clearBoyleOverlay();
      clearBunkerOverlay();
      clearBlowoutsOverlay();
      clearZootOverlay();
      activateRailLaborOverlay({ center: options.center });
    } else if (isZanja) {
      clearTreatyOverlay();
      clearRanchoOverlay();
      clearOlveraOverlay();
      clearBoyleOverlay();
      clearBunkerOverlay();
      clearBlowoutsOverlay();
      clearZootOverlay();
      clearRailLaborOverlay();
      activateZanjaOverlay({ center: options.center });
    } else if (isBoyle) {
      clearTreatyOverlay();
      clearRanchoOverlay();
      clearOlveraOverlay();
      clearZanjaOverlay();
      clearBunkerOverlay();
      clearBlowoutsOverlay();
      clearZootOverlay();
      clearRailLaborOverlay();
      activateBoyleOverlay({ center: options.center });
    } else if (isBunker) {
      clearTreatyOverlay();
      clearRanchoOverlay();
      clearOlveraOverlay();
      clearZanjaOverlay();
      clearBoyleOverlay();
      clearRailLaborOverlay();
      clearBlowoutsOverlay();
      clearZootOverlay();
      activateBunkerOverlay({ center: options.center });
    } else if (isBlowouts) {
      clearTreatyOverlay();
      clearRanchoOverlay();
      clearOlveraOverlay();
      clearBoyleOverlay();
      clearZanjaOverlay();
      clearBunkerOverlay();
      clearRailLaborOverlay();
      clearZootOverlay();
      clearMoratoriumRoute();
      activateBlowoutsOverlay({ center: options.center });
    } else if (isMoratorium) {
      clearTreatyOverlay();
      clearRanchoOverlay();
      clearOlveraOverlay();
      clearBoyleOverlay();
      clearZanjaOverlay();
      clearBunkerOverlay();
      clearRailLaborOverlay();
      clearZootOverlay();
      clearBlowoutsOverlay();
      activateMoratoriumRoute({ center: options.center });
    } else if (isZoot) {
      clearTreatyOverlay();
      clearRanchoOverlay();
      clearOlveraOverlay();
      clearBoyleOverlay();
      clearZanjaOverlay();
      clearBunkerOverlay();
      clearBlowoutsOverlay();
      clearRailLaborOverlay();
      clearMoratoriumRoute();
      activateZootOverlay({ center: options.center });
    } else if (isChavezCommunity) {
      clearTreatyOverlay();
      clearRanchoOverlay();
      clearOlveraOverlay();
      clearBoyleOverlay();
      clearZanjaOverlay();
      clearBunkerOverlay();
      clearBlowoutsOverlay();
      clearRailLaborOverlay();
      activateChavezOverlay();
    } else {
      clearTreatyOverlay();
      clearRanchoOverlay();
      clearOlveraOverlay();
      clearBoyleOverlay();
      clearZanjaOverlay();
      clearBunkerOverlay();
      clearBlowoutsOverlay();
      clearZootOverlay();
      clearRailLaborOverlay();
    }

    const layerEntry = state.markers[index];

    if (options.center && state.map && layerEntry && !isTreaty && !isRancho && !isOlvera && !isRailLabor && !isZanja && !isBoyle && !isBunker && !isBlowouts && !isZoot) {
      if (layerEntry.mode === 'area' || layerEntry.mode === 'line') {
        const bounds = layerEntry.getBounds?.();
        if (bounds && typeof bounds.isValid === 'function' && bounds.isValid()) {
          state.map.fitBounds(bounds, { padding: [36, 36] });
        } else {
          const center = layerEntry.getCenter?.();
          if (center) {
            state.map.setView(center, Math.max(state.map.getZoom(), 11), {
              animate: true,
              duration: 0.8
            });
          }
        }
      } else {
        const center = layerEntry.getCenter?.();
        if (center) {
          state.map.setView(center, Math.max(state.map.getZoom(), 13), {
            animate: true,
            duration: 0.8
          });
        }
      }
    }

    if (!isTreaty && !isZanja && !isBoyle && !isBunker && !isBlowouts && !isZoot && !isMoratorium && layerEntry?.openPopup) layerEntry.openPopup();
  }

  function storeMapView() {
    if (!state.map) return;
    state.previousMapView = {
      center: state.map.getCenter(),
      zoom: state.map.getZoom()
    };
  }

  function resetMapView() {
    if (!state.map) return;
    const target = state.previousMapView || state.initialView;
    if (target?.center && typeof target.zoom === 'number') {
      state.map.setView(target.center, target.zoom, {
        animate: true,
        duration: 0.8
      });
    }
    state.previousMapView = null;
    try {
      state.map.closePopup();
    } catch (err) {}
  }

  function highlightSelectedItem() {
    const list = document.getElementById('locations-list');
    if (!list) return;
    const items = list.querySelectorAll('.location-item');
    items.forEach((item, idx) => {
      if (idx === state.selectedIndex) item.classList.add('selected');
      else item.classList.remove('selected');
    });
    updateMarkerVisuals();
  }

  function scrollListToIndex(index) {
    const list = document.getElementById('locations-list');
    if (!list) return;
    const items = list.querySelectorAll('.location-item');
    if (!items.length || index == null || index < 0 || index >= items.length) return;
    const target = items[index];
    if (typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function jumpToSiteId(siteId) {
    if (!siteId) return;
    const normalized = siteId.toLowerCase();
    const findIndex = records => records.findIndex(feature => (feature?.properties?.site_id || '').toLowerCase() === normalized);

    let index = findIndex(state.filteredRecords);
    if (index >= 0) {
      selectRecord(index, { center: true });
      scrollListToIndex(index);
      return;
    }

    const allIndex = findIndex(state.allRecords);
    if (allIndex < 0) return;

    state.activeCategory = 'all';
    state.searchTerm = '';
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';

    applyFilters();
    index = findIndex(state.filteredRecords);
    if (index >= 0) {
      selectRecord(index, { center: true });
      scrollListToIndex(index);
    }
  }

  function renderDetailsPanel() {
    const panel = document.getElementById('details-panel');
    if (!panel) return;
    const bottomSheet = document.querySelector('.bottom-panel');

    if (state.selectedIndex == null || !state.filteredRecords[state.selectedIndex]) {
      panel.innerHTML = `
        <div class="details-empty">
          <h3>Select a Location</h3>
          <p>Choose a marker or list entry to reveal detailed notes.</p>
        </div>
      `;
      if (bottomSheet) bottomSheet.classList.remove('detail-visible');
      return;
    }

    const feature = state.filteredRecords[state.selectedIndex];
    const props = feature.properties || {};
    const siteId = (props.site_id || '').toLowerCase();
    const materials = generateMaterialsSample(props);
    const sliderMarkup = buildImageSlider(props);
    const creditMarkup = buildImageCredit(props);
    const descriptionHtml = wrapParagraphs(coalesce(props.status_summary, 'No description available.'));
    const significanceHtml = wrapParagraphs(coalesce(props.historical_significance, 'Historical significance not documented.'));
    const mobileHeader = `
      <div class="detail-mobile-header">
        <button type="button" class="detail-close" data-close-detail aria-label="Back to locations list">
          <span aria-hidden="true">&larr;</span>
          <span class="detail-close-label">Back</span>
        </button>
        <span class="detail-mobile-pill">${escapeHtml(prettyCategory(props.category))}</span>
      </div>
    `;
    const chavezNote = siteId === 'chavez_ravine_1930'
      ? `
        <div class="detail-alert">
          <strong>Chavez Ravine barrios</strong>
          Chavez Ravine held three distinct, tight-knit Mexican-American neighborhoods—La Loma, Palo Verde, and Bishop—before clearance orders uprooted dozens of families in the mid-20th century.
          <button type="button" class="detail-toggle" data-chavez-toggle aria-pressed="false">
            Reveal barrio plat map
          </button>
          <span class="detail-credit">Map source: Portion of the 1928 Los Angeles Quadrangle, US Geological Survey; annotations by the author.</span>
        </div>
      `
      : '';
    const sleepyCrosslink = siteId === 'sleepy_lagoon_case'
      ? `
        <div class="detail-crosslink-wrap">
          <button type="button" class="detail-crosslink" data-related-site="zoot_suit_riots" aria-label="Jump to the Zoot Suit Riots map pin">
            <span class="crosslink-circle" aria-hidden="true"></span>
            <span class="crosslink-text">Zoot Suit Riots pin</span>
          </button>
          <p class="detail-crosslink-caption">This dragnet primed the riots mapped elsewhere—tap to pan directly to the Zoot Suit flashpoints.</p>
        </div>
      `
      : '';
    const moratoriumCrosslink = siteId === 'chicano_moratorium'
      ? `
        <div class="detail-crosslink-wrap">
          <button type="button" class="detail-crosslink" data-related-site="ruben_salazar_death" aria-label="Jump to the Ruben Salazar memorial pin">
            <span class="crosslink-circle" aria-hidden="true"></span>
            <span class="crosslink-text">Ruben Salazar pin</span>
          </button>
          <p class="detail-crosslink-caption">Journalist Ruben Salazar was killed after the march—tap to open the Silver Dollar Bar site.</p>
        </div>
      `
      : '';
    const kmexCrosslink = siteId === 'kmex_dt'
      ? `
        <div class="detail-crosslink-wrap">
          <button type="button" class="detail-crosslink" data-related-site="ruben_salazar_death" aria-label="Jump to the Ruben Salazar memorial pin">
            <span class="crosslink-circle" aria-hidden="true"></span>
            <span class="crosslink-text">Ruben Salazar pin</span>
          </button>
          <p class="detail-crosslink-caption">Rub\u00e9n Salazar led KMEX's newsroom before his 1970 killing—tap to jump to the Silver Dollar Bar record.</p>
        </div>
      `
      : '';

    panel.innerHTML = `
      <div class="detail-body">
        ${mobileHeader}
        <div class="detail-header">
        <div class="detail-title">${coalesce(props.site_name, 'Untitled record')}</div>
        <div class="detail-subtitle">${coalesce(props.neighborhood_area, 'Unknown location')} • ${coalesce(props.era_year, 'Year unknown')}</div>
      </div>
      ${sliderMarkup}
      ${creditMarkup}

      <div class="detail-grid">
        ${makeDetailField('Archive ID', buildArchiveId(feature))}
        ${makeDetailField('Category', prettyCategory(props.category))}
        ${makeDetailField('Year', coalesce(props.era_year, 'Unknown'))}
        ${makeDetailField('Creator', coalesce(props.creator, 'Not listed'))}
      </div>

      <div class="detail-section">
        <div class="section-header">Description</div>
        <div class="section-text">${descriptionHtml}</div>
      </div>
      ${chavezNote}

      <div class="detail-section">
        <div class="section-header">Historical Significance</div>
        <div class="section-text">${significanceHtml}</div>
      </div>
      ${sleepyCrosslink}
      ${moratoriumCrosslink}
      ${kmexCrosslink}

      <div class="archive-materials">
        <div class="materials-header">
          <span>Related Archive Materials</span>
          <button class="refresh-materials" type="button" aria-label="Refresh materials">↻</button>
        </div>
        ${materials.map(material => {
          const safeUrl = sanitizeUrl(material.url);
          const linkMarkup = safeUrl
            ? `<a class="material-link" href="${safeUrl}" target="_blank" rel="noopener">Open resource ↗</a>`
            : '';
          return `
          <div class="material-item">
            <div class="material-title">${material.title}</div>
            <div class="material-meta">${material.creator} • ${material.year} • ${material.type}</div>
            <div class="material-description">${material.description}</div>
            ${linkMarkup}
          </div>
        `;
        }).join('')}
      </div>

      <div style="margin-top: 28px; display:flex; gap:12px; flex-wrap:wrap;">
        <button class="view-details-btn" type="button" onclick="openLaptop()">View in Archive System</button>
        <button class="view-details-btn" type="button" style="background:${categoryColors.landmark};" onclick="showInternetArchive()">Browse Materials</button>
      </div>
    `;

    panel.scrollTop = 0;
    if (bottomSheet) bottomSheet.classList.add('detail-visible');

    const closeDetailButton = panel.querySelector('[data-close-detail]');
    if (closeDetailButton) closeDetailButton.addEventListener('click', () => selectRecord(null, { resetMap: true }));

    initializeDetailSlider(panel);
    initializeImageMagnifier(panel);
    setupChavezDetailControls(panel, siteId);
    setupDetailCrosslinks(panel);

    const refreshButton = panel.querySelector('.refresh-materials');
    if (refreshButton) refreshButton.addEventListener('click', () => renderDetailsPanel());
  }

  function makeDetailField(label, value) {
    return `
      <div class="detail-field">
        <div class="field-label">${label}</div>
        <div class="field-value">${value}</div>
      </div>
    `;
  }

  function prettyCategory(category) {
    if (!category) return 'Unclassified';
    return category.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  }

  function buildArchiveId(feature) {
    const index = state.allRecords.indexOf(feature);
    return index >= 0 ? `MLA-${String(index + 1).padStart(3, '0')}` : 'MLA-—';
  }

  function wrapParagraphs(text) {
    if (text == null) return '';
    const raw = String(text).trim();
    if (!raw) return '';
    if (/<\/?p[\s>]/i.test(raw)) return raw;
    const segments = raw.split(/\n{2,}/).map(segment => segment.trim()).filter(Boolean);
    if (!segments.length) return `<p>${raw}</p>`;
    return segments.map(segment => `<p>${segment}</p>`).join('');
  }

  function generateMaterialsSample(props) {
    const base = coalesce(props.site_name, 'Primary source');
    const year = coalesce(props.era_year, 'Unknown year');
    const siteKey = (props.site_id || '').toLowerCase();
    const templates = [
      {
        title: `${base} — Field Photograph`,
        type: 'Photo',
        creator: coalesce(props.creator, 'Community Archive'),
        description: 'High resolution image documenting landscape, signage, and environment.'
      },
      {
        title: `${base} — Oral History Excerpt`,
        type: 'Oral History',
        creator: 'Chicano Studies Research Center',
        description: 'Interview fragment capturing lived experience tied to this place.'
      },
      {
        title: `${base} — Municipal Record`,
        type: 'Document',
        creator: 'Los Angeles County Archives',
        description: 'Administrative paperwork situating the site within civic memory.'
      }
    ];

    const extras = customMaterialLinks[siteKey] || [];

    return templates
      .map(entry => ({ ...entry, year }))
      .concat(extras.map(entry => ({
        title: entry.title,
        type: entry.type || 'Resource',
        creator: entry.creator || 'External archive',
        year: entry.year || year,
        description: entry.description || '',
        url: entry.url || ''
      })));
  }

  function buildImageCredit(props, options = {}) {
    const credit = (props.image_credit || '').trim();
    if (!credit) return '';
    const body = `<span class="image-credit-label">Image credit</span> ${escapeHtml(credit)}`;
    if (options.inline) return `<figcaption class="image-credit-inline">${body}</figcaption>`;
    return `<div class="image-credit">${body}</div>`;
  }

  function parseImageEntries(props) {
    const preview = sanitizeUrl(props.image_preview);
    const galleryRaw = props.image_gallery || '';
    const captionsRaw = props.image_captions || '';
    const urls = galleryRaw.split('|').map(sanitizeUrl).filter(Boolean);
    const captions = captionsRaw.split('|').map(s => s.trim());
    return urls
      .filter(url => url && url !== preview)
      .map((url, idx) => ({ url, caption: captions[idx] || '' }));
  }

  function buildPrimaryImage(props) {
    const preview = sanitizeUrl(props.image_preview);
    if (!preview) return '';

    const captions = (props.image_captions || '').split('|').map(s => s.trim());
    const caption = captions[0] || '';
    const alt = escapeHtml(caption || `${coalesce(props.site_name, 'Archive image')} preview`);

    return `
      <figure class="detail-image">
        <img src="${preview}" alt="${alt}">
        ${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ''}
      </figure>
    `;
  }

  function buildImageSlider(props) {
    const slides = collectImageSlides(props);
    if (!slides.length) return '';

    const slidesMarkup = slides.map((slide, index) => `
      <figure class="slider-slide${index === 0 ? ' is-active' : ''}" data-index="${index}">
        <img src="${slide.url}" alt="${escapeHtml(slide.alt)}" loading="lazy">
        ${slide.caption ? `<figcaption>${escapeHtml(slide.caption)}</figcaption>` : ''}
      </figure>
    `).join('');

    return `
      <div class="detail-slider" data-slider>
        <button type="button" class="slider-btn prev" aria-label="Previous image">
          <span aria-hidden="true">‹</span>
        </button>
        <div class="slider-frame">
          ${slidesMarkup}
        </div>
        <button type="button" class="slider-btn next" aria-label="Next image">
          <span aria-hidden="true">›</span>
        </button>
      </div>
    `;
  }

  function collectImageSlides(props) {
    const slides = [];
    const name = coalesce(props.site_name, 'Archive image');

    const galleryRaw = props.image_gallery || '';
    const captions = (props.image_captions || '').split('|').map(s => s.trim());

    const urls = galleryRaw.split('|').map(sanitizeUrl).filter(Boolean);
    urls.forEach((url, index) => {
      if (!url) return;
      const caption = captions[index] || '';
      slides.push({
        url,
        caption,
        alt: caption || name
      });
    });

    return slides;
  }

  function initializeDetailSlider(root) {
    const slider = root.querySelector('[data-slider]');
    if (!slider) return;

    const slides = Array.from(slider.querySelectorAll('.slider-slide'));
    if (!slides.length) return;

    let current = slides.findIndex(slide => slide.classList.contains('is-active'));
    if (current < 0) current = 0;

    const prevBtn = slider.querySelector('.slider-btn.prev');
    const nextBtn = slider.querySelector('.slider-btn.next');

    function show(index) {
      slides.forEach(slide => slide.classList.remove('is-active'));
      slides[index].classList.add('is-active');
      current = index;
    }

    function showNext() {
      const nextIndex = (current + 1) % slides.length;
      show(nextIndex);
    }

    function showPrev() {
      const prevIndex = (current - 1 + slides.length) % slides.length;
      show(prevIndex);
    }

    prevBtn?.addEventListener('click', showPrev);
    nextBtn?.addEventListener('click', showNext);

    slider.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        showPrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        showNext();
      }
    });
  }

  function initializeImageMagnifier(root) {
    if (!root) return;

    const targets = root.querySelectorAll('.detail-image img, .detail-gallery img, .slider-slide img');
    targets.forEach(image => attachMagnifier(image));
  }

  function setupChavezDetailControls(panel, siteId) {
    if (!panel || siteId !== chavezCommunityId) return;
    const button = panel.querySelector('[data-chavez-toggle]');
    if (!button) return;
    const store = state.specialLayers.chavez;
    if (!store) return;

    const syncButtonState = () => {
      const active = Boolean(store.manualVisible);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
      button.textContent = active ? 'Hide barrio plat map' : 'Reveal barrio plat map';
    };

    syncButtonState();

    button.addEventListener('click', () => {
      ensureChavezOverlayElements();
      store.manualVisible = !store.manualVisible;
      if (store.manualVisible) setChavezOverlayVisible(true);
      else setChavezOverlayVisible(false);
      syncButtonState();
    });
  }

  function setupDetailCrosslinks(panel) {
    if (!panel) return;
    const buttons = panel.querySelectorAll('[data-related-site]');
    if (!buttons.length) return;
    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const target = (button.getAttribute('data-related-site') || '').trim();
        if (target) jumpToSiteId(target);
      });
    });
  }

  function attachMagnifier(image) {
    if (!image || image.dataset.magnifierAttached === 'true') return;
    image.dataset.magnifierAttached = 'true';

    const figure = image.closest('figure') || image.parentElement;
    if (!figure) return;
    if (getComputedStyle(figure).position === 'static') {
      figure.style.position = 'relative';
    }

    let lens = null;
    const zoom = 1.6;

    function ensureLens() {
      if (lens && lens.isConnected) return lens;
      lens = document.createElement('div');
      lens.className = 'image-magnifier-lens';
      figure.appendChild(lens);
      return lens;
    }

    function removeLens() {
      if (lens) {
        lens.classList.remove('is-visible');
      }
    }

    function updateLens(event) {
      if (event.pointerType === 'touch') {
        removeLens();
        return;
      }
      const activeLens = ensureLens();
      if (!activeLens || !image.isConnected) return;

      const rect = image.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        removeLens();
        return;
      }

      const naturalWidth = image.naturalWidth || rect.width;
      const naturalHeight = image.naturalHeight || rect.height;

      const relX = x / rect.width;
      const relY = y / rect.height;
      const focusX = naturalWidth * relX;
      const focusY = naturalHeight * relY;

      const lensSize = Math.min(220, Math.max(120, rect.width * 0.45));
      activeLens.style.width = `${lensSize}px`;
      activeLens.style.height = `${lensSize}px`;
      activeLens.style.left = `${x}px`;
      activeLens.style.top = `${y}px`;
      activeLens.style.backgroundImage = `url(${image.currentSrc || image.src})`;
      activeLens.style.backgroundSize = `${naturalWidth * zoom}px ${naturalHeight * zoom}px`;
      const bgX = -(focusX * zoom - lensSize / 2);
      const bgY = -(focusY * zoom - lensSize / 2);
      activeLens.style.backgroundPosition = `${bgX}px ${bgY}px`;

      activeLens.classList.add('is-visible');
    }

    image.addEventListener('pointerenter', updateLens);
    image.addEventListener('pointermove', updateLens);
    image.addEventListener('pointerleave', removeLens);
    figure.addEventListener('pointerleave', removeLens);
  }

  function reportEmptyState(message) {
    const list = document.getElementById('locations-list');
    if (list) list.innerHTML = `<div class="details-empty"><h3>Archive Offline</h3><p>${message}</p></div>`;
    const panel = document.getElementById('details-panel');
    if (panel) panel.innerHTML = `<div class="details-empty"><h3>Archive Offline</h3><p>${message}</p></div>`;
  }

  /* ----------------------------------------------------------------------
     Hover card helpers
  ---------------------------------------------------------------------- */
  let hoverCard = document.getElementById('hover-card');
  if (!hoverCard) {
    hoverCard = document.createElement('div');
    hoverCard.id = 'hover-card';
    hoverCard.className = 'map-hover-card';
    document.body.appendChild(hoverCard);
  }

  function showHoverCard(feature, clientX, clientY) {
    const props = feature?.properties || {};
    const preview = sanitizeUrl(props.image_preview);
    hoverCard.innerHTML = `
      ${preview ? `<div class="hover-image"><img src="${preview}" alt="${escapeHtml(coalesce(props.site_name, 'Preview'))}"></div>` : ''}
      <div class="hover-title">${coalesce(props.site_name, 'Untitled record')}</div>
      <div class="hover-meta">${coalesce(props.era_year, 'Year unknown')} • ${prettyCategory(props.category)}</div>
      <div class="hover-summary">${truncate(coalesce(props.status_summary, 'No description provided.'), 160)}</div>
    `;

    hoverCard.classList.add('active');

    const rect = hoverCard.getBoundingClientRect();
    const width = rect.width || 280;
    const height = rect.height || 160;
    let left = clientX + 18;
    let top = clientY - height / 2;

    if (left + width > window.innerWidth) left = clientX - width - 18;
    if (top < 16) top = 16;
    if (top + height > window.innerHeight) top = window.innerHeight - height - 16;

    hoverCard.style.left = `${left}px`;
    hoverCard.style.top = `${top}px`;
  }

  function hideHoverCard() {
    hoverCard.classList.remove('active');
  }

  /* ----------------------------------------------------------------------
     Laptop + modal hooks
  ---------------------------------------------------------------------- */
  window.openLaptop = function openLaptop() {
    if (state.selectedIndex == null) return;

    const modal = document.getElementById('laptop-modal');
    if (!modal) return;

    const content = document.getElementById('laptop-content');
    if (content) {
      const feature = state.filteredRecords[state.selectedIndex];
      const props = feature.properties || {};
      content.innerHTML = `
        <div class="terminal-prompt">root@mexican-la-archive:~$ cat ${buildArchiveId(feature)}.txt</div>
        <div class="ascii-border">Digital finding aid extract prepared for newsroom briefings.</div>
        <div class="data-table">
          <div><span class="data-label">SITE_NAME:</span><span class="data-value">${coalesce(props.site_name, 'Untitled record')}</span></div>
          <div><span class="data-label">LOCATION:</span><span class="data-value">${coalesce(props.neighborhood_area, 'Unknown')}</span></div>
          <div><span class="data-label">YEAR:</span><span class="data-value">${coalesce(props.era_year, 'Unknown')}</span></div>
          <div><span class="data-label">CATEGORY:</span><span class="data-value">${prettyCategory(props.category)}</span></div>
          <div><span class="data-label">NOTE:</span><span class="data-value">${truncate(coalesce(props.historical_significance, 'Record queued for cataloguing.'), 220)}</span></div>
        </div>
      `;
    }

    modal.classList.add('active');
  };

  function closeLaptop() {
    const modal = document.getElementById('laptop-modal');
    if (modal) modal.classList.remove('active');
  }

  window.showInternetArchive = function showInternetArchive() {
    const modal = document.getElementById('materials-modal');
    if (!modal) return;
    modal.classList.add('active');

    const content = document.getElementById('materials-content');
    if (content) {
      content.innerHTML = `
        <p style="color:var(--page-muted); margin-bottom:16px;">Connecting to curated Internet Archive set…</p>
        <ul style="padding-left:18px; line-height:1.7;">
          <li>La Opinión (Spanish-language press)</li>
          <li>Chicano Moratorium flyers &amp; ephemera</li>
          <li>Boyle Heights oral history cassettes</li>
        </ul>
      `;
    }
  };

  function setupModals() {
    document.querySelectorAll('.modal-close').forEach(button => {
      button.addEventListener('click', () => {
        const targetId = button.getAttribute('data-close');
        const modal = document.getElementById(targetId);
        if (modal) modal.classList.remove('active');
      });
    });

    document.querySelectorAll('.control-button').forEach(button => {
      if (button.id === 'btn-about') button.addEventListener('click', () => toggleModal('about-modal'));
      if (button.id === 'btn-materials') button.addEventListener('click', () => toggleModal('materials-modal'));
      if (button.id === 'btn-radio') button.addEventListener('click', toggleRadio);
    });

    // (no topbar + handler)
  }

  function setupAboutDrawer() {
    const drawer = document.getElementById('about-drawer');
    if (!drawer) return;

    const trigger = document.getElementById('about-trigger');
    const closeButton = document.getElementById('about-close');

    trigger?.addEventListener('click', () => toggleAboutDrawer());
    closeButton?.addEventListener('click', () => closeAboutDrawer());

    document.addEventListener('pointerdown', event => {
      if (!aboutDrawerOpen) return;
      const target = event.target;
      if (drawer.contains(target) || (trigger && trigger.contains(target))) return;
      closeAboutDrawer();
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && aboutDrawerOpen) {
        event.preventDefault();
        closeAboutDrawer();
      }
    });
  }

  function setAboutDrawerVisible(open) {
    const drawer = document.getElementById('about-drawer');
    if (!drawer) return;
    const trigger = document.getElementById('about-trigger');
    aboutDrawerOpen = open;
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (trigger) {
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      trigger.classList.toggle('is-active', open);
    }
    document.body.classList.toggle('about-open', open);
  }

  function openAboutDrawer() {
    setAboutDrawerVisible(true);
  }

  function closeAboutDrawer() {
    setAboutDrawerVisible(false);
  }

  function toggleAboutDrawer() {
    setAboutDrawerVisible(!aboutDrawerOpen);
  }

  function toggleModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.toggle('active');
    modal.setAttribute('aria-hidden', modal.classList.contains('active') ? 'false' : 'true');
  }

  /* ----------------------------------------------------------------------
     Radio stub
  ---------------------------------------------------------------------- */
  function setupRadio() {
    const radio = document.getElementById('radio-player');
    if (!radio) return;
    const closeButton = radio.querySelector('[data-toggle-radio]');
    if (closeButton) closeButton.addEventListener('click', toggleRadio);
  }

  function toggleRadio() {
    const radio = document.getElementById('radio-player');
    if (!radio) return;
    radio.classList.toggle('hidden');
    radio.setAttribute('aria-hidden', radio.classList.contains('hidden') ? 'true' : 'false');
  }

  /* ----------------------------------------------------------------------
     Utility helpers
  ---------------------------------------------------------------------- */
  function truncate(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 1)}…`;
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sanitizeUrl(url) {
    if (!url) return '';
    const trimmed = String(url).trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (/^(?:\/|\.\/|\.\.\/)/.test(trimmed)) return trimmed;
    if (!/^[a-z]+:/i.test(trimmed)) return trimmed;
    return '';
  }

  function coalesce(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback;
    return value;
  }

  /* ----------------------------------------------------------------------
     Draggable radio player
  ---------------------------------------------------------------------- */
  (function makeRadioDraggable() {
    const radio = document.getElementById('radio-player');
    if (!radio) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    const header = radio.querySelector('.radio-header');
    const dragHandle = header || radio;

    function onPointerDown(event) {
      if (event.target.closest('button')) return;
      isDragging = true;

      const rect = radio.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      startX = event.clientX;
      startY = event.clientY;

      radio.style.transition = 'none';
      if (radio.setPointerCapture && event.pointerId !== undefined) {
        try { radio.setPointerCapture(event.pointerId); } catch (err) {}
      }

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    }

    function onPointerMove(event) {
      if (!isDragging) return;

      const dx = event.clientX - startX;
      const dy = event.clientY - startY;

      let nextLeft = initialLeft + dx;
      let nextTop = initialTop + dy;

      const maxLeft = window.innerWidth - radio.offsetWidth - 16;
      const maxTop = window.innerHeight - radio.offsetHeight - 16;
      nextLeft = Math.min(Math.max(16, nextLeft), maxLeft);
      nextTop = Math.min(Math.max(16, nextTop), maxTop);

      radio.style.left = `${nextLeft}px`;
      radio.style.top = `${nextTop}px`;
      radio.style.right = 'auto';
      radio.style.bottom = 'auto';
    }

    function onPointerUp(event) {
      isDragging = false;
      if (radio.releasePointerCapture && event.pointerId !== undefined) {
        try { radio.releasePointerCapture(event.pointerId); } catch (err) {}
      }
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    }

    dragHandle.style.cursor = 'grab';
    dragHandle.addEventListener('pointerdown', onPointerDown);
  })();
})();
  function applyDataHotfixes(records = []) {
    records.forEach(feature => {
      const props = feature?.properties;
      if (!props) return;
      const siteId = (props.site_id || '').toLowerCase();
      if (siteId === 'zoot_suit_riots') {
        props.image_preview = './images/1943zoot.jpg';
        props.image_gallery = [
          './images/1943zoot.jpg',
          './images/june1943.jpg',
          './images/zootsarrests.jpg',
          './images/authority1943.jpg',
          './images/pachuca1944.jpg'
        ].join('|');
        props.image_captions = [
          'June 9, 1943: LAPD corrals arrested zoot suiters beside a Los Angeles County Sheriff’s bus (Library of Congress).',
          'Bodies stripped of their suits lie on a downtown sidewalk while crowds and police look on during the June 1943 attacks (Harold P. Matosian / Associated Press).',
          'Mexican American youths are hauled away after being beaten by servicemen; no sailors were arrested (New York World-Telegram & Sun Photograph Collection / Library of Congress, cph.3c13319).',
          'Sheriff Eugene W. Biscailuz, LAPD Captain Thad Brown, District Attorney Frederick N. Howser, and investigator Carl Moritz meet to manage the riots, June 1943 (Los Angeles Daily News / UCLA Digital Library, ark:/13030/hb100003z8).',
          'Ramona Fonseca in her pachuca suit, 1944, embodying the femininity that frightened authorities during the riots (Los Angeles Public Library, Shades of L.A. Collection).'
        ].join('|');
        props.image_credit = 'Library of Congress; Associated Press; UCLA Digital Library; Los Angeles Public Library';
        props.source_citation = 'LA Times; KCET *Lost LA*; Smithsonian Latino Center; UCLA Chicano Studies Research Center; Judy Baca, *Las Tres Marías*';
        props.notes = 'Multi-neighborhood flashpoints; overlay draws affected districts and marks Navy travel ban + zoot ordinance.';
        props.status_summary = 'Nightly mobs of white servicemen and civilians spilled out of the downtown naval armory between June 3 and June 8, 1943, hunting any youth in flamboyant <span class="term-zoot" data-definition="Zoot suit — Harlem jazz-born style of long jackets and draped trousers that signaled bold wartime self-expression for Mexican American youth.">zoot suits</span>. Newspapers labeled the attackers “vigilantes” while LAPD wagons hauled away more than 500 Mexican, Black, and Filipino teens—charging almost no white assailants—until the Navy restricted shore leave and City Council rushed through a zoot ban to protect the Bracero Program.';
        props.historical_significance = 'Mexican American leaders, including the Sleepy Lagoon Defense Committee, decried the racialized policing of style even as prosecutors and columnists fixated on drape jackets to brand defendants “foreign criminals.” Sailors tore suits from pachucos, pachucas, and bystanders from San Diego to Watts, with violence spreading to Black neighborhoods and Filipino dance halls. Pachucas—far from spoils—asserted their own agency through sharp jackets, bouffants, and dark lipstick, a lineage Judy Baca later honored in *Las Tres Marías*. Governor Earl Warren ordered an inquiry, Eleanor Roosevelt blamed anti-Mexican discrimination, and the riots became shorthand for state-sanctioned anti-Mexican terror.';
      } else if (siteId === 'east_la_walkouts') {
        props.image_preview = './images/1968graffiti.jpeg';
        props.image_gallery = [
          './images/1968graffiti.jpeg',
          './images/1968walkouts.jpeg',
          './images/1968flyers.jpeg',
          './images/protestors1968.jpeg',
          './images/police1968.jpeg',
          './images/cityjail1968.jpeg'
        ].join('|');
        props.image_captions = [
          'Sidewalk graffiti urging students to “Walk Out,” East Los Angeles, March 1968 (c) UCLA Chicano Studies Research Center.',
          'Conchita Mares Thornton (left) and “Little John” demonstrate outside Roosevelt High School during the blowouts (c) UCLA Chicano Studies Research Center.',
          'Walkout schedule flyer documenting Wilson, Garfield, Roosevelt, Garfield, Belmont actions and organizing meetings (c) UCLA Chicano Studies Research Center.',
          'Roosevelt High protestors hold signs reading “Student Power,” “School Not Prison,” “We Are Not ‘Dirty Mexicans’” (c) UCLA Chicano Studies Research Center.',
          'Los Angeles Police Department “paddy wagon” deployed to arrest student leaders outside school offices (c) UCLA Chicano Studies Research Center.',
          'Families and supporters—including Ed Bonnilla, Sal Castro, Esteban Torres—await the release of detained activists outside Los Angeles City Jail (c) UCLA Chicano Studies Research Center.'
        ].join('|');
        props.image_credit = 'All images © UCLA Chicano Studies Research Center';
        props.status_summary = 'Wilson High’s March 1, 1968 protest over a censored play sparked citywide strikes; by March 6 about 15,000 students from Wilson, Lincoln, Garfield, Roosevelt, Belmont, Jefferson, Venice, and junior highs walked out demanding more Latine teachers and textbooks that reflected Mexican American history.';
        props.historical_significance = 'Students exposed Spanish-language bans, counselors who discouraged college, and dropout rates topping 57%; even with police blocking doors and arresting youth, Brown Berets, UMAS, and Sal Castro delivered 36 demands to the March 11 LAUSD board meeting, pushing the district toward bilingual/bicultural curricula and Chicano representation.';
        props.source_citation = 'UCLA Chicano Studies Research Center; LA Times; Brown Berets archive; Sal Castro oral histories';
        props.notes = 'Overlay circles highlight each participating campus.';
      } else if (siteId === 'chicano_moratorium') {
        props.image_preview = './images/1970moratorium.jpeg';
        props.image_gallery = [
          './images/1970moratorium.jpeg',
          './images/1970flyer.jpeg',
          './images/chicanomen1970.jpeg',
          './images/munoz1970.jpeg',
          './images/wedding1970.jpeg',
          './images/riot1970.jpeg',
          './images/deputies1970.jpeg'
        ].join('|');
        props.image_captions = [
          'Chicano Moratorium marchers hold the August 29 banner along Whittier Boulevard (Sal Castro / Security Pacific National Bank Collection, Los Angeles Public Library).',
          'Flyer for the August 29, 1970 National Chicano Moratorium designed and distributed by the organizing committee (courtesy Lucy Pollack Public Relations).',
          'Two Chicano men ride the hood of a car raising their fists during a National Chicano Moratorium Committee march opposing the Vietnam War, February 28, 1970 (David Fenton / Getty Images).',
          'Rosalío Muñoz addresses 8,000 people at Laguna Park before law enforcement moved in, August 29, 1970 (Raul Ruiz Papers, Library of Congress).',
          'A wedding party joins the Chicano Moratorium anti-war march on Whittier Boulevard, August 1970 (Raul Ruiz Papers, Library of Congress).',
          'Sheriff’s deputies and fire crews take positions on Whittier Boulevard as the Laguna Park clash erupts, August 29, 1970 (Raul Ruiz Papers, Library of Congress).',
          'Deputies near the Silver Dollar Café minutes from Ruben Salazar’s death by tear-gas projectile, August 29, 1970 (Raul Ruiz Papers, Library of Congress).'
        ].join('|');
        props.image_credit = 'Sal Castro / LAPL; Lucy Pollack Public Relations; David Fenton/Getty Images; Raul Ruiz Papers, Library of Congress';
        props.source_citation = 'National Chicano Moratorium Committee archives; LA Times; KCET *Lost LA*; Ruben Salazar Press Club; National Register of Historic Places';
        props.notes = 'Route highlight drawn when selected; tap Ruben Salazar pin for the Silver Dollar Bar site.';
      } else if (siteId === 'ruben_salazar_death') {
        props.image_preview = './images/silverdollar1970.jpeg';
        props.image_gallery = [
          './images/silverdollar1970.jpeg',
          './images/dollar1970.jpeg',
          './images/unknownpublication1970.jpeg',
          './images/silverdollarinterior1970.jpeg',
          './images/portraitofruben.jpeg'
        ].join('|');
        props.image_captions = [
          'Los Angeles County sheriff’s deputies crouch outside the Silver Dollar Bar during the Chicano Moratorium sweep, August 29, 1970 (David Sandoval Papers, Special Collections, Cal State LA).',
          'Raul Ruiz photograph of deputies firing tear gas into the Silver Dollar Café, killing Ruben Salazar (La Raza Magazine, Vol. 3 Special Issue, Raul Ruiz Papers, Library of Congress — non-commercial use).',
          'Layout from an unknown publication decrying Salazar’s killing and announcing the September 16, 1970 memorial march (Raul Ruiz Papers, Library of Congress).',
          'Interior of the Silver Dollar Bar & Café where Salazar’s body was found, August 29, 1970 (Frank Q. Brown / Los Angeles Times).',
          'Portrait of Ruben Salazar, East Los Angeles, 1970 (Los Angeles Times via UCLA Digital Library, CC BY 4.0).'
        ].join('|');
        props.image_credit = 'David Sandoval Papers, CSULA; Raul Ruiz Papers, Library of Congress; Frank Q. Brown / Los Angeles Times; UCLA Digital Library';
        props.notes = 'Site of the former Silver Dollar Bar, now Sounds of Music Records; memorialized during Moratorium anniversaries.';
      }
    });
  }
