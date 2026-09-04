const canvas = document.getElementById('trackCanvas');
const ctx = canvas.getContext('2d');
const eleCanvas = document.getElementById('elevationCanvas');
const eleCtx = eleCanvas.getContext('2d');

const frame = document.getElementById('frame');
const infoOverlay = document.getElementById('info-overlay');
const labelsLayer = document.getElementById('labels-layer');
const statusEl = document.getElementById('status');
const progressBg = document.getElementById('progress-bg');
const progressFill = document.getElementById('progress-fill');

const titleContainer = document.getElementById('title-container');
const titleInput = document.getElementById('title-input');
const elevationContainer = document.getElementById('elevation-container');
const coordContainer = document.getElementById('coord-container');
const coordText = document.getElementById('coord-text');

const toggleMap = document.getElementById('toggle-map');
const mapSourceSelect = document.getElementById('map-source');
const mapOpacity = document.getElementById('map-opacity');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const toggleBorder = document.getElementById('toggle-border');
const borderWidth = document.getElementById('border-width');
const lineStyleSelect = document.getElementById('line-style');
const toggleInvert = document.getElementById('toggle-invert');
const langBtn = document.getElementById('lang-toggle-btn');

let currentLang = "no";
let selectedTrackColor = "#0077b6";
let selectedTextColor = "#0077b6";
let customDataLabels = [];

let offsetX = 0;
let offsetY = 0;
let userZoom = 1;
let isPanning = false;
let panStartX = 0, panStartY = 0;

// Paletter
const trackPaletteContainer = document.getElementById('track-color-palette');
paletteColors.forEach((color, idx) => {
  const dot = document.createElement('div');
  dot.className = 'color-dot' + (idx === 0 ? ' active' : '');
  dot.style.backgroundColor = color;
  dot.addEventListener('click', () => {
    trackPaletteContainer.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
    dot.classList.add('active');
    selectedTrackColor = color;
    redrawCanvasAndLines();
    drawElevationProfile();
  });
  trackPaletteContainer.appendChild(dot);
});

const textPaletteContainer = document.getElementById('text-color-palette');
paletteColors.forEach((color, idx) => {
  const dot = document.createElement('div');
  dot.className = 'color-dot' + (idx === 0 ? ' active' : '');
  dot.style.backgroundColor = color;
  dot.addEventListener('click', () => {
    textPaletteContainer.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
    dot.classList.add('active');
    selectedTextColor = color;
    applyTextColor();
  });
  textPaletteContainer.appendChild(dot);
});

function applyTextColor() {
  const renderColor = getDisplayColor(selectedTextColor);
  titleInput.style.color = renderColor;
  document.querySelectorAll('.draggable-label').forEach(el => el.style.color = renderColor);
  updateFrameBorder();
  drawElevationProfile();
}

function showProgress(text, percent) {
  statusEl.textContent = text;
  progressBg.style.display = 'block';
  progressFill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
}

function hideProgress(text = "") {
  if (text) statusEl.textContent = text;
  progressBg.style.display = 'none';
  progressFill.style.width = '0%';
}

function autoExpandTitle() {
  const len = titleInput.value.length;
  titleInput.style.width = Math.max(len + 2, 10) + 'ch';
}
titleInput.addEventListener('input', autoExpandTitle);

document.getElementById('gpx-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (infoOverlay) infoOverlay.style.display = 'none';

  showProgress(translations[currentLang].statusReading, 10);
  const reader = new FileReader();
  reader.onload = (event) => parseGPX(event.target.result);
  reader.readAsText(file);
});

document.getElementById('download-btn').addEventListener('click', downloadImage);

document.querySelectorAll('.draggable-element .delete-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    btn.parentElement.style.display = 'none';
  });
});

toggleBorder.addEventListener('change', updateFrameBorder);
borderWidth.addEventListener('input', updateFrameBorder);
lineStyleSelect.addEventListener('change', () => redrawCanvasAndLines());

function updateFrameBorder() {
  const renderColor = getDisplayColor(selectedTextColor);
  frame.style.border = toggleBorder.checked ? `${borderWidth.value}px solid ${renderColor}` : '0px solid transparent';
}

toggleInvert.addEventListener('change', () => {
  document.body.classList.toggle('inverted', toggleInvert.checked);
  frame.classList.toggle('inverted', toggleInvert.checked);
  applyTextColor();
  redrawCanvasAndLines();
  drawElevationProfile();
});

toggleMap.addEventListener('change', () => redrawCanvasAndLines());
mapSourceSelect.addEventListener('change', () => {
  loadedMapTiles.clear();
  redrawCanvasAndLines();
});
mapOpacity.addEventListener('input', () => redrawCanvasAndLines());

function changeZoom(delta) {
  userZoom = Math.min(3, Math.max(0.5, userZoom + delta));
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  updateLabelPositions();
  redrawCanvasAndLines();
}

zoomInBtn.addEventListener('click', () => changeZoom(0.2));
zoomOutBtn.addEventListener('click', () => changeZoom(-0.2));

frame.addEventListener('wheel', (e) => {
  e.preventDefault();
  let delta = e.deltaY < 0 ? 0.1 : -0.1;
  changeZoom(delta);
});

setupDraggable(titleContainer);
setupDraggable(elevationContainer);
setupDraggable(coordContainer);

function setupDraggable(element) {
  let isDragging = false;
  let startMouseX = 0, startMouseY = 0;
  let startPosX = 0, startPosY = 0;

  element.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('delete-btn')) return;
    if (e.target === document.activeElement && e.target.tagName === 'INPUT') return;

    isDragging = true;
    startMouseX = e.clientX;
    startMouseY = e.clientY;
    
    const rect = element.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    
    startPosX = rect.left - frameRect.left;
    startPosY = rect.top - frameRect.top;
    
    element.style.transform = 'none';
    element.style.left = `${startPosX}px`;
    element.style.top = `${startPosY}px`;
    element.style.bottom = 'auto';
    
    e.stopPropagation();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    let newX = startPosX + (e.clientX - startMouseX);
    let newY = startPosY + (e.clientY - startMouseY);
    element.style.left = `${newX}px`;
    element.style.top = `${newY}px`;
  });

  window.addEventListener('mouseup', () => { isDragging = false; });
}

frame.addEventListener('mousedown', (e) => {
  if (e.target.closest('.draggable-element')) return;
  isPanning = true;
  panStartX = e.clientX - offsetX;
  panStartY = e.clientY - offsetY;
  frame.classList.add('grabbing');
});

window.addEventListener('mousemove', (e) => {
  if (!isPanning) return;
  offsetX = e.clientX - panStartX;
  offsetY = e.clientY - panStartY;
  updateLabelPositions();
  redrawCanvasAndLines();
});

window.addEventListener('mouseup', () => {
  isPanning = false;
  frame.classList.remove('grabbing');
});

document.querySelectorAll('.data-field-toggle').forEach(chk => {
  chk.addEventListener('change', (e) => {
    const field = e.target.getAttribute('data-field');
    if (e.target.checked) {
      createCustomDataLabel(field, gpxStats[field] || '');
    } else {
      removeCustomDataLabel(field);
    }
  });
});

function createCustomDataLabel(field, text) {
  if (document.getElementById(`label-${field}`)) return;

  const labelContainer = document.createElement('div');
  labelContainer.className = 'draggable-element';
  labelContainer.id = `label-${field}`;
  
  const renderTextColor = getDisplayColor(selectedTextColor);
  labelContainer.innerHTML = `
    <span class="draggable-label" style="color: ${renderTextColor};">${text}</span>
    <span class="delete-btn" title="Slett">×</span>
  `;

  let pos = { x: 40, y: 50 + customDataLabels.length * 28 };
  labelContainer.style.left = `${pos.x}px`;
  labelContainer.style.top = `${pos.y}px`;

  labelsLayer.appendChild(labelContainer);

  const labelObj = { id: field, element: labelContainer, pos: pos };
  customDataLabels.push(labelObj);

  setupDraggable(labelContainer);

  labelContainer.querySelector('.delete-btn').addEventListener('click', () => {
    removeCustomDataLabel(field);
    const chk = document.querySelector(`.data-field-toggle[data-field="${field}"]`);
    if (chk) chk.checked = false;
  });
}

function removeCustomDataLabel(field) {
  const el = document.getElementById(`label-${field}`);
  if (el) el.remove();
  customDataLabels = customDataLabels.filter(item => item.id !== field);
}

function updateLabelPositions() {
  detectedPeaks.forEach(p => {
    const anchor = toCanvasCoords(p.lat, p.lon);
    p.element.style.left = `${anchor.x + p.relX}px`;
    p.element.style.top = `${anchor.y + p.relY}px`;
  });
}

function redrawCanvasAndLines() {
  if (trackPoints.length === 0) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMapTiles();

  const renderTrackColor = getDisplayColor(selectedTrackColor);

  ctx.beginPath();
  ctx.strokeStyle = renderTrackColor;
  ctx.lineWidth = 2.5;
  trackPoints.forEach((p, index) => {
    const pt = toCanvasCoords(p.lat, p.lon);
    if (index === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  });
  ctx.stroke();

  const style = lineStyleSelect.value;

  detectedPeaks.forEach(p => {
    const anchor = toCanvasCoords(p.lat, p.lon);
    
    ctx.beginPath();
    ctx.arc(anchor.x, anchor.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = renderTrackColor;
    ctx.fill();

    const labelHeight = p.element.offsetHeight || 15;
    const targetX = anchor.x + p.relX;
    const targetY = anchor.y + p.relY + (labelHeight / 2);

    ctx.beginPath();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = renderTrackColor;
    ctx.lineWidth = 1;

    if (style === 'arc') {
      const cpX = anchor.x + p.relX * 0.8;
      const cpY = anchor.y;
      ctx.moveTo(anchor.x, anchor.y);
      ctx.quadraticCurveTo(cpX, cpY, targetX, targetY);
    } else {
      ctx.moveTo(anchor.x, anchor.y);
      ctx.lineTo(targetX, anchor.y);
      ctx.lineTo(targetX, targetY);
    }

    ctx.stroke();
    ctx.setLineDash([]);
  });
}

function drawElevationProfile() {
  if (trackPoints.length === 0) return;

  eleCanvas.width = 292;
  eleCanvas.height = 60;
  eleCtx.clearRect(0, 0, eleCanvas.width, eleCanvas.height);

  let maxEle = -Infinity, minEle = Infinity;
  let maxPt = null;

  trackPoints.forEach(p => {
    if (p.ele > maxEle) { maxEle = p.ele; maxPt = p; }
    if (p.ele < minEle) minEle = p.ele;
  });

  const totalDistance = trackPoints[trackPoints.length - 1].dist;
  if (totalDistance <= 0 || maxEle === minEle) return;

  const eleSpan = maxEle - minEle || 1;
  const padding = 12;
  const w = eleCanvas.width;
  const h = eleCanvas.height - padding;

  function getProfileX(dist) { return (dist / totalDistance) * w; }
  function getProfileY(ele) { return h - ((ele - minEle) / eleSpan) * (h - 10) + padding; }

  const renderTrackColor = getDisplayColor(selectedTrackColor);
  const renderTextColor = getDisplayColor(selectedTextColor);

  eleCtx.beginPath();
  eleCtx.strokeStyle = renderTrackColor;
  eleCtx.lineWidth = 1.5;

  trackPoints.forEach((p, index) => {
    const px = getProfileX(p.dist);
    const py = getProfileY(p.ele);
    if (index === 0) eleCtx.moveTo(px, py);
    else eleCtx.lineTo(px, py);
  });
  eleCtx.stroke();

  if (maxPt) {
    const peakX = getProfileX(maxPt.dist);
    const peakY = getProfileY(maxPt.ele);

    eleCtx.beginPath();
    eleCtx.arc(peakX, peakY, 3, 0, Math.PI * 2);
    eleCtx.fillStyle = renderTrackColor;
    eleCtx.fill();

    eleCtx.font = "bold 9px -apple-system, BlinkMacSystemFont, sans-serif";
    eleCtx.fillStyle = renderTextColor;
    eleCtx.textAlign = "center";
    eleCtx.fillText(`${translations[currentLang].maxEle} ${Math.round(maxEle)}m`, peakX, peakY - 5);
  }
}

langBtn.addEventListener('click', () => {
  currentLang = currentLang === "no" ? "en" : "no";
  const t = translations[currentLang];

  langBtn.textContent = t.flag;

  document.getElementById('lbl-map').textContent = t.lblMap;
  document.getElementById('lbl-track-color').textContent = t.lblTrackColor;
  document.getElementById('lbl-text-color').textContent = t.lblTextColor;
  document.getElementById('lbl-zoom').textContent = t.lblZoom;
  document.getElementById('lbl-border').textContent = t.lblBorder;
  document.getElementById('lbl-line-style').textContent = t.lblLineStyle;
  document.getElementById('opt-corner').textContent = t.optCorner;
  document.getElementById('opt-arc').textContent = t.optArc;
  document.getElementById('lbl-invert').textContent = t.lblInvert;
  document.getElementById('download-btn').textContent = t.downloadBtn;

  document.getElementById('chk-date').textContent = t.chkDate;
  document.getElementById('chk-dist').textContent = t.chkDist;
  document.getElementById('chk-distToPeak').textContent = t.chkDistToPeak;
  document.getElementById('chk-elevationGain').textContent = t.chkElevationGain;
  document.getElementById('chk-duration').textContent = t.chkDuration;
  document.getElementById('chk-startTime').textContent = t.chkStartTime;
  document.getElementById('chk-endTime').textContent = t.chkEndTime;
  document.getElementById('chk-timeToPeak').textContent = t.chkTimeToPeak;

  document.getElementById('info-title').textContent = t.infoTitle;
  document.getElementById('info-li1').innerHTML = t.infoLi1;
  document.getElementById('info-li2').innerHTML = t.infoLi2;
  document.getElementById('info-li3').innerHTML = t.infoLi3;
  document.getElementById('info-li4').innerHTML = t.infoLi4;
  document.getElementById('info-note').textContent = t.infoNote;

  if (titleInput.value === translations.no.defaultTitle || titleInput.value === translations.en.defaultTitle) {
    titleInput.value = t.defaultTitle;
    autoExpandTitle();
  }

  if (trackPoints.length > 0) {
    recalculateStats();
  } else {
    statusEl.textContent = t.statusInitial;
  }
});

function downloadImage() {
  if (trackPoints.length === 0) {
    alert(translations[currentLang].alertGpx);
    return;
  }

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = canvas.width;
  exportCanvas.height = canvas.height;
  const exportCtx = exportCanvas.getContext('2d');

  exportCtx.fillStyle = "#ffffff";
  exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  exportCtx.drawImage(canvas, 0, 0);

  const frameRect = frame.getBoundingClientRect();
  const renderTextColor = getDisplayColor(selectedTextColor);

  if (titleContainer.style.display !== 'none') {
    const rect = titleContainer.getBoundingClientRect();
    const x = rect.left - frameRect.left + (rect.width / 2);
    const y = rect.top - frameRect.top + 16;
    exportCtx.font = "800 18px -apple-system, BlinkMacSystemFont, sans-serif";
    exportCtx.fillStyle = renderTextColor;
    exportCtx.textAlign = "center";
    exportCtx.fillText(titleInput.value, x, y);
  }

  if (elevationContainer.style.display !== 'none') {
    const rect = elevationContainer.getBoundingClientRect();
    const x = rect.left - frameRect.left;
    const y = rect.top - frameRect.top;
    exportCtx.drawImage(eleCanvas, x, y);
  }

  if (coordContainer.style.display !== 'none') {
    const rect = coordContainer.getBoundingClientRect();
    const x = rect.left - frameRect.left + (rect.width / 2);
    const y = rect.top - frameRect.top + 12;
    exportCtx.font = "600 10px -apple-system, BlinkMacSystemFont, sans-serif";
    exportCtx.fillStyle = renderTextColor;
    exportCtx.textAlign = "center";
    exportCtx.fillText(coordText.textContent, x, y);
  }

  detectedPeaks.forEach(p => {
    const rect = p.element.getBoundingClientRect();
    const x = rect.left - frameRect.left + 4;
    const y = rect.top - frameRect.top + 12;
    const text = p.element.querySelector('.draggable-label').textContent;
    exportCtx.font = "bold 11px -apple-system, BlinkMacSystemFont, sans-serif";
    exportCtx.fillStyle = renderTextColor;
    exportCtx.textAlign = "left";
    exportCtx.fillText(text, x, y);
  });

  customDataLabels.forEach(lbl => {
    const rect = lbl.element.getBoundingClientRect();
    const x = rect.left - frameRect.left + 4;
    const y = rect.top - frameRect.top + 12;
    const text = lbl.element.querySelector('.draggable-label').textContent;
    exportCtx.font = "bold 11px -apple-system, BlinkMacSystemFont, sans-serif";
    exportCtx.fillStyle = renderTextColor;
    exportCtx.textAlign = "left";
    exportCtx.fillText(text, x, y);
  });

  if (toggleBorder.checked) {
    const bw = parseInt(borderWidth.value);
    exportCtx.strokeStyle = renderTextColor;
    exportCtx.lineWidth = bw * 2;
    exportCtx.strokeRect(0, 0, exportCanvas.width, exportCanvas.height);
  }

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = canvas.width;
  finalCanvas.height = canvas.height;
  const finalCtx = finalCanvas.getContext('2d');

  if (toggleInvert.checked) {
    finalCtx.filter = "invert(1) hue-rotate(180deg)";
  }
  finalCtx.drawImage(exportCanvas, 0, 0);

  const link = document.createElement('a');
  link.download = 'gpx-spor.png';
  link.href = finalCanvas.toDataURL('image/png');
  link.click();
}

autoExpandTitle();
