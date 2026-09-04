let loadedMapTiles = new Map(); 
let mapRenderTimeout = null;

function lon2tile(lon, zoom) { 
  return (lon + 180) / 360 * Math.pow(2, zoom); 
}

function lat2tile(lat, zoom) { 
  return (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom); 
}

function getTileUrl(source, zoom, x, y) {
  const sub = ['a', 'b', 'c', 'd'][(x + y) % 4];
  
  switch(source) {
    case 'carto_voyager':
      return `https://${sub}.basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${x}/${y}.png`;
    case 'carto_positron':
      return `https://${sub}.basemaps.cartocdn.com/light_nolabels/${zoom}/${x}/${y}.png`;
    case 'carto_dark':
      return `https://${sub}.basemaps.cartocdn.com/dark_nolabels/${zoom}/${x}/${y}.png`;
    case 'kartverket_topo': 
      return `https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/${zoom}/${y}/${x}.png`;
    case 'kartverket_gray': 
      return `https://cache.kartverket.no/v1/wmts/1.0.0/topograstone/default/webmercator/${zoom}/${y}/${x}.png`;
    case 'opentopo': 
      return `https://tile.opentopomap.org/${zoom}/${x}/${y}.png`;
    case 'osm': 
      return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
    case 'esri_sat': 
      return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${x}`;
    default: 
      return `https://${sub}.basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${x}/${y}.png`;
  }
}

function getTransformationParams() {
  let minLat = Infinity, maxLat = -Infinity; 
  let minLon = Infinity, maxLon = -Infinity;
  
  trackPoints.forEach(p => {
    if (p.lat < minLat) minLat = p.lat; 
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lon < minLon) minLon = p.lon; 
    if (p.lon > maxLon) maxLon = p.lon;
  });
  
  const latSpan = maxLat - minLat || 0.005; 
  const lonSpan = maxLon - minLon || 0.005;
  const cosLat = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
  const maxSpan = Math.max(latSpan, lonSpan * cosLat);
  const scale = ((canvas.width * 0.52) / maxSpan) * userZoom;
  const centerLat = (minLat + maxLat) / 2; 
  const centerLon = (minLon + maxLon) / 2;
  
  return { scale, centerLat, centerLon, cosLat };
}

function toCanvasCoords(lat, lon) {
  const { scale, centerLat, centerLon, cosLat } = getTransformationParams();
  return { 
    x: canvas.width / 2 + (lon - centerLon) * cosLat * scale + offsetX, 
    y: (canvas.height / 2 - 10) - (lat - centerLat) * scale + offsetY 
  };
}

function drawMapTiles() {
  if (!toggleMap.checked || trackPoints.length === 0) return;
  
  const { scale, centerLat, centerLon, cosLat } = getTransformationParams();
  const zoom = Math.min(15, Math.max(8, Math.floor(12 + Math.log2(userZoom))));
  const minX = Math.floor(lon2tile(centerLon - (canvas.width / (2 * scale * cosLat)), zoom));
  const maxX = Math.floor(lon2tile(centerLon + (canvas.width / (2 * scale * cosLat)), zoom));
  const minY = Math.floor(lat2tile(centerLat + (canvas.height / (2 * scale)), zoom));
  const maxY = Math.floor(lat2tile(centerLat - (canvas.height / (2 * scale)), zoom));
  
  ctx.globalAlpha = parseFloat(mapOpacity.value);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  const selectedSource = mapSourceSelect.value;
  ctx.filter = (selectedSource === 'kartverket_gray' || selectedSource === 'osm') ? 'grayscale(100%)' : 'none';
  
  const requiredKeys = [];
  for (let x = minX - 1; x <= maxX + 1; x++) {
    for (let y = minY - 1; y <= maxY + 1; y++) { 
      requiredKeys.push({ zoom, x, y, key: `${selectedSource}/${zoom}/${x}/${y}` }); 
    }
  }
  
  let totalTilesNeeded = requiredKeys.length; 
  let tilesLoaded = 0;
  
  requiredKeys.forEach(tile => {
    const { x, y, key } = tile;
    if (!loadedMapTiles.has(key)) {
      const img = new Image(); 
      img.crossOrigin = "Anonymous";
      const tileData = { img, loaded: false, error: false };
      loadedMapTiles.set(key, tileData);
      
      img.onload = () => { tileData.loaded = true; debouncedRedraw(); };
      img.onerror = () => { tileData.loaded = true; tileData.error = true; debouncedRedraw(); };
      img.src = getTileUrl(selectedSource, zoom, x, y);
    }
    
    const tileData = loadedMapTiles.get(key);
    if (tileData && tileData.loaded) {
      tilesLoaded++;
      if (!tileData.error) {
        const n = Math.pow(2, zoom);
        const tileLon = x / n * 360 - 180;
        const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)));
        const tileLat = latRad * 180 / Math.PI;
        const pos = toCanvasCoords(tileLat, tileLon);
        const tileSize = (360 / n) * cosLat * scale;
        
        ctx.drawImage(tileData.img, pos.x, pos.y, tileSize + 0.5, tileSize + 0.5);
      }
    }
  });
  
  if (tilesLoaded < totalTilesNeeded) {
    showProgress(translations[currentLang].statusLoadingTiles(tilesLoaded, totalTilesNeeded), Math.round((tilesLoaded / totalTilesNeeded) * 100));
  } else { 
    hideProgress(); 
  }
  
  ctx.filter = 'none'; 
  ctx.globalAlpha = 1.0;
  ctx.font = "8px sans-serif"; 
  ctx.fillStyle = "rgba(0,0,0,0.4)"; 
  ctx.textAlign = "right";
  ctx.fillText("© Kartverket / OpenTopoMap / OpenStreetMap / Esri / CARTO", canvas.width - 10, canvas.height - 10);
}

function debouncedRedraw() {
  if (mapRenderTimeout) clearTimeout(mapRenderTimeout);
  mapRenderTimeout = setTimeout(() => { redrawCanvasAndLines(); }, 30);
}
