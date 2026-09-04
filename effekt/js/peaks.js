let detectedPeaks = [];

async function fetchPeaks() {
  let minLat = Infinity, maxLat = -Infinity;
  let minLon = Infinity, maxLon = -Infinity;

  trackPoints.forEach(p => {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lon < minLon) minLon = p.lon;
    if (p.lon > maxLon) maxLon = p.lon;
  });

  const buffer = 0.08;
  let peaks = [];

  showProgress(translations[currentLang].statusSearchingPeaks, 30);

  try {
    const url = `https://ws.geonorge.no/stedsnavn/v1/punkt?nordmin=${minLat - buffer}&nordmaks=${maxLat + buffer}&ostmin=${minLon - buffer}&ostmaks=${maxLon + buffer}&navneobjekttype=Fjell*&maxAntall=100`;
    const res = await fetch(url);
    showProgress(translations[currentLang].statusParsingPeaks, 60);
    if (res.ok) {
      const json = await res.json();
      peaks = parseKartverketGeonorge(json);
    }
  } catch (err) {
    console.warn("Kartverket API feilet, prøver Overpass fallback...", err);
  }

  if (peaks.length === 0) {
    try {
      showProgress(translations[currentLang].statusAltPeaks, 50);
      const overpassQuery = `[out:json];node["natural"="peak"](${minLat - buffer},${minLon - buffer},${maxLat + buffer},${maxLon + buffer});out;`;
      const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`);
      if (res.ok) {
        const json = await res.json();
        peaks = parseOverpass(json);
      }
    } catch (err) {
      console.error("Overpass API feilet:", err);
    }
  }

  showProgress(translations[currentLang].statusRendering, 85);
  renderPeaks(peaks);
  hideProgress(translations[currentLang].statusPeaksFound(peaks.length));
}

function parseKartverketGeonorge(data) {
  if (!data || !data.navn) return [];
  return data.navn.map(item => ({
    name: item.stedsnavn?.[0]?.skrivemåte || item.stedsnavn,
    lat: item.representasjonspunkt?.nord,
    lon: item.representasjonspunkt?.øst,
    elevation: item.meterOverHavet || item.stedsnavn?.[0]?.meterOverHavet
  })).filter(p => p.name && p.lat && p.lon);
}

function parseOverpass(data) {
  if (!data || !data.elements) return [];
  return data.elements.map(el => ({
    name: el.tags?.name || "Ukjent topp",
    lat: el.lat,
    lon: el.lon,
    elevation: el.tags?.ele ? parseInt(el.tags.ele) : null
  }));
}

function renderPeaks(apiPeaks) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  detectedPeaks.forEach(p => p.element.remove());
  detectedPeaks = [];

  const MARGIN_METER = 2000;
  const addedNames = new Set();

  apiPeaks.forEach(peak => {
    if (addedNames.has(peak.name)) return;

    let closestPt = null;
    let minDistance = Infinity;

    for (let i = 0; i < trackPoints.length; i += 5) {
      const p = trackPoints[i];
      const dist = getDistanceMeters(p.lat, p.lon, peak.lat, peak.lon);
      if (dist < minDistance) {
        minDistance = dist;
        closestPt = p;
      }
    }

    if (minDistance <= MARGIN_METER && closestPt) {
      addedNames.add(peak.name);
      createPeakAnnotation(peak);
    }
  });

  redrawCanvasAndLines();
}

function createPeakAnnotation(peak) {
  const labelContainer = document.createElement('div');
  labelContainer.className = 'draggable-element';
  
  const renderTextColor = getDisplayColor(selectedTextColor);
  const heightText = peak.elevation ? ` ${peak.elevation}m` : '';
  labelContainer.innerHTML = `
    <span class="draggable-label" style="color: ${renderTextColor};">${peak.name.toUpperCase()}${heightText}</span>
    <span class="delete-btn" title="Fjern">×</span>
  `;

  let relX = 25;
  let relY = -20;

  labelsLayer.appendChild(labelContainer);

  const peakData = {
    id: Date.now() + Math.random(),
    lat: peak.lat,
    lon: peak.lon,
    relX: relX,
    relY: relY,
    element: labelContainer
  };

  const anchor = toCanvasCoords(peak.lat, peak.lon);
  labelContainer.style.left = `${anchor.x + relX}px`;
  labelContainer.style.top = `${anchor.y + relY}px`;

  labelContainer.querySelector('.delete-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    labelContainer.remove();
    detectedPeaks = detectedPeaks.filter(p => p.id !== peakData.id);
    redrawCanvasAndLines();
  });

  detectedPeaks.push(peakData);
  makePeakDraggable(labelContainer, peakData);
}

function makePeakDraggable(element, data) {
  let isDragging = false;
  let startMouseX = 0, startMouseY = 0;
  let startRelX = 0, startRelY = 0;

  element.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('delete-btn')) return;
    isDragging = true;
    startMouseX = e.clientX;
    startMouseY = e.clientY;
    startRelX = data.relX;
    startRelY = data.relY;
    e.stopPropagation();
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    data.relX = startRelX + (e.clientX - startMouseX);
    data.relY = startRelY + (e.clientY - startMouseY);
    updateLabelPositions();
    redrawCanvasAndLines();
  });

  window.addEventListener('mouseup', () => { isDragging = false; });
}
