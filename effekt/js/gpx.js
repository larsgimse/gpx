let trackPoints = [];
let gpxStats = {};

function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function parseGPX(xmlText) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, "text/xml");
  const trkpts = xml.querySelectorAll("trkpt");

  trackPoints = [];
  let totalDist = 0;
  let totalEleGain = 0;
  let maxEle = -Infinity;
  let maxElePt = null;

  trkpts.forEach((pt, index) => {
    const lat = parseFloat(pt.getAttribute("lat"));
    const lon = parseFloat(pt.getAttribute("lon"));
    const eleNode = pt.querySelector("ele");
    const ele = eleNode ? parseFloat(eleNode.textContent) : 0;
    const timeNode = pt.querySelector("time");
    const time = timeNode ? new Date(timeNode.textContent) : null;

    if (index > 0) {
      const prev = trackPoints[index - 1];
      totalDist += getDistanceMeters(prev.lat, prev.lon, lat, lon);
      const eleDiff = ele - prev.ele;
      if (eleDiff > 0) totalEleGain += eleDiff;
    }

    const pointData = { lat, lon, ele, dist: totalDist, time };
    trackPoints.push(pointData);

    if (ele > maxEle) {
      maxEle = ele;
      maxElePt = pointData;
    }
  });

  offsetX = 0;
  offsetY = 0;

  if (trackPoints.length > 0) {
    recalculateStats();
    const startPt = trackPoints[0];
    document.getElementById('coord-text').textContent = `${startPt.lat.toFixed(5)}° N, ${startPt.lon.toFixed(5)}° E`;
    document.getElementById('coord-container').style.display = 'inline-flex';
    document.getElementById('elevation-container').style.display = 'flex';
    applyTextColor();
    fetchPeaks();
  } else {
    hideProgress(translations[currentLang].statusNoPoints);
  }
}

function recalculateStats() {
  if (trackPoints.length === 0) return;
  const t = translations[currentLang];
  const u = t.units;

  const startTime = trackPoints[0].time;
  const endTime = trackPoints[trackPoints.length - 1].time;
  
  let maxEle = -Infinity, maxElePt = null;
  let totalDist = trackPoints[trackPoints.length - 1].dist;
  let totalEleGain = 0;

  trackPoints.forEach((pt, index) => {
    if (index > 0) {
      const eleDiff = pt.ele - trackPoints[index - 1].ele;
      if (eleDiff > 0) totalEleGain += eleDiff;
    }
    if (pt.ele > maxEle) {
      maxEle = pt.ele;
      maxElePt = pt;
    }
  });

  let durationStr = "N/A";
  let timeToPeakStr = "N/A";
  let dateStr = "N/A";

  if (startTime) {
    dateStr = startTime.toLocaleDateString(currentLang === 'no' ? 'no-NO' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  if (startTime && endTime) {
    const diffMs = endTime - startTime;
    const hrs = Math.floor(diffMs / 3600000);
    const mins = Math.round((diffMs % 3600000) / 60000);
    durationStr = `${hrs}${u.hrs} ${mins}${u.mins}`;

    if (maxElePt && maxElePt.time) {
      const peakDiffMs = maxElePt.time - startTime;
      const pHrs = Math.floor(peakDiffMs / 3600000);
      const pMins = Math.round((peakDiffMs % 3600000) / 60000);
      timeToPeakStr = `${pHrs}${u.hrs} ${pMins}${u.mins}`;
    }
  }

  const distToPeakVal = maxElePt ? (maxElePt.dist / 1000).toFixed(2) : 'N/A';

  gpxStats = {
    date: `${t.labels.date}${dateStr}`,
    dist: `${t.labels.dist}${(totalDist / 1000).toFixed(2)} ${u.km}`,
    distToPeak: `${t.labels.distToPeak}${distToPeakVal} ${u.km}`,
    elevationGain: `${t.labels.elevationGain}${Math.round(totalEleGain)} ${u.m}`,
    duration: `${t.labels.duration}${durationStr}`,
    startTime: startTime ? `${t.labels.startTime}${startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : `${t.labels.startTime}N/A`,
    endTime: endTime ? `${t.labels.endTime}${endTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : `${t.labels.endTime}N/A`,
    timeToPeak: `${t.labels.timeToPeak}${timeToPeakStr}`
  };

  customDataLabels.forEach(lbl => {
    const field = lbl.id;
    const labelSpan = lbl.element.querySelector('.draggable-label');
    if (labelSpan && gpxStats[field]) {
      labelSpan.textContent = gpxStats[field];
    }
  });

  drawElevationProfile();
}
