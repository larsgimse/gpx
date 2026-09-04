const apiKey = "cb1_2o3a_1_671194bbedbad28841272141";

const translations = {
  no: {
    flag: "🇬🇧 EN",
    statusInitial: "Last opp en GPX-fil",
    statusReading: "Leser GPX-fil...",
    statusNoPoints: "Ingen gyldige spor-punkter funnet.",
    statusSearchingPeaks: "Søker etter fjelltopper i Kartverket...",
    statusParsingPeaks: "Tolker fjelltopper...",
    statusAltPeaks: "Prøver alternativ kilde for fjelltopper...",
    statusRendering: "Genererer visning...",
    statusPeaksFound: (count) => `Funnet ${count} potensielle topper.`,
    statusLoadingTiles: (loaded, total) => `Laster kartfliser (${loaded}/${total})...`,
    infoTitle: "GPX-Visning & Kartgenerator",
    infoLi1: "<b>Last opp GPX:</b> Genererer automatisk sporlinje, fjelltopper, lengde og høydeprofil.",
    infoLi2: "<b>Flyttbare elementer:</b> Klikk og dra tittelen, høydekurven, koordinater og toppetiketter fritt. Klikk på <b>×</b> for å slette enkelt-elementer.",
    infoLi3: "<b>Bakgrunnskart:</b> Velg mellom Kartverket (med tette høydekoter), OpenTopoMap, Satellitt og stilrene vektorkart.",
    infoLi4: "<b>Tilpassing:</b> Juster zoom, panorering, rammestørrelse, og endre tema, sporfarge eller tekstfarge uavhengig av hverandre.",
    infoNote: "Merk: Kartflisene hentes direkte fra eksterne kartservere. Ved zooming eller navigering kan det ta noe tid før nye kartbilde-fliser er helt ferdig lastet ned og vises i full oppløsning.",
    lblMap: "Bakgrunnskart",
    lblTrackColor: "Sporfarge:",
    lblTextColor: "Tekst- & rammefarge:",
    lblZoom: "Zoom:",
    lblBorder: "Ramme",
    lblLineStyle: "Linjestil:",
    optCorner: "Rett vinkel",
    optArc: "Tilpasset bue",
    lblInvert: "Inverter",
    downloadBtn: "Last ned bilde",
    chkDate: "Dato",
    chkDist: "Lengde totalt",
    chkDistToPeak: "Lengde til topp",
    chkElevationGain: "Total stigning",
    chkDuration: "Tid totalt",
    chkStartTime: "Start",
    chkEndTime: "Slutt",
    chkTimeToPeak: "Tid til topp",
    defaultTitle: "LEGG TIL EGEN TITTEL",
    labels: {
      date: "DATO: ",
      dist: "LENGDE TOTALT: ",
      distToPeak: "LENGDE TIL TOPP: ",
      elevationGain: "STIGNING: ",
      duration: "TID: ",
      startTime: "START: ",
      endTime: "SLUTT: ",
      timeToPeak: "TID TIL TOPP: "
    },
    units: { km: "KM", m: "M", hrs: "t", mins: "m" },
    alertGpx: "Last opp en GPX-fil først!",
    maxEle: "MAKS"
  },
  en: {
    flag: "🇳🇴 NO",
    statusInitial: "Upload a GPX file",
    statusReading: "Reading GPX file...",
    statusNoPoints: "No valid track points found.",
    statusSearchingPeaks: "Searching for mountain peaks...",
    statusParsingPeaks: "Parsing mountain peaks...",
    statusAltPeaks: "Trying alternative peak source...",
    statusRendering: "Rendering view...",
    statusPeaksFound: (count) => `Found ${count} potential peaks.`,
    statusLoadingTiles: (loaded, total) => `Loading map tiles (${loaded}/${total})...`,
    infoTitle: "GPX Viewer & Map Generator",
    infoLi1: "<b>Upload GPX:</b> Automatically generates track line, mountain peaks, distance, and elevation profile.",
    infoLi2: "<b>Draggable elements:</b> Click and drag title, elevation graph, coordinates, and peak labels freely. Click <b>×</b> to delete individual items.",
    infoLi3: "<b>Background maps:</b> Choose between Kartverket topo maps, OpenTopoMap, Satellite, and clean vector basemaps.",
    infoLi4: "<b>Customization:</b> Adjust zoom, pan, border width, and change theme, track color, or text color independently.",
    infoNote: "Note: Map tiles are loaded directly from external servers. Zooming or panning may require a brief moment for new tiles to load in full resolution.",
    lblMap: "Background Map",
    lblTrackColor: "Track Color:",
    lblTextColor: "Text & Border Color:",
    lblZoom: "Zoom:",
    lblBorder: "Border",
    lblLineStyle: "Line Style:",
    optCorner: "Right angle",
    optArc: "Custom arc",
    lblInvert: "Invert",
    downloadBtn: "Download Image",
    chkDate: "Date",
    chkDist: "Total Distance",
    chkDistToPeak: "Distance to Peak",
    chkElevationGain: "Total Elevation Gain",
    chkDuration: "Total Time",
    chkStartTime: "Start",
    chkEndTime: "End",
    chkTimeToPeak: "Time to Peak",
    defaultTitle: "ADD CUSTOM TITLE",
    labels: {
      date: "DATE: ",
      dist: "TOTAL DISTANCE: ",
      distToPeak: "DISTANCE TO PEAK: ",
      elevationGain: "ELEVATION GAIN: ",
      duration: "TIME: ",
      startTime: "START: ",
      endTime: "END: ",
      timeToPeak: "TIME TO PEAK: "
    },
    units: { km: "KM", m: "M", hrs: "h", mins: "m" },
    alertGpx: "Please upload a GPX file first!",
    maxEle: "MAX"
  }
};

const paletteColors = [
  "#0077b6", "#ffffff", "#000000", "#e63946",
  "#2a9d8f", "#e76f51", "#457b9d", "#6a0572",
  "#2b9348", "#d4a373", "#d62828"
];

function getDisplayColor(hexColor) {
  const isInverted = document.getElementById('toggle-invert').checked;
  if (!isInverted) return hexColor;

  if (hexColor.toLowerCase() === '#ffffff' || hexColor.toLowerCase() === '#fff') return '#000000';
  if (hexColor.toLowerCase() === '#000000' || hexColor.toLowerCase() === '#000') return '#ffffff';

  let hex = hexColor.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  r = 255 - r; g = 255 - g; b = 255 - b;
  let rNorm = r / 255, gNorm = g / 255, bNorm = b / 255;
  let max = Math.max(rNorm, gNorm, bNorm), min = Math.min(rNorm, gNorm, bNorm);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
      case gNorm: h = (bNorm - rNorm) / d + 2; break;
      case bNorm: h = (rNorm - gNorm) / d + 4; break;
    }
    h /= 6;
  }

  h = (h + 0.5) % 1.0;

  function hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  }

  let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  let p = 2 * l - q;
  r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
  g = Math.round(hue2rgb(p, q, h) * 255);
  b = Math.round(hue2rgb(p, q, h - 1/3) * 255);

  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
