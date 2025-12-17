const timeline = document.getElementById('timeline');
const playButton = document.getElementById('playButton');
const dateLabel = document.getElementById('dateLabel');
const startLabel = document.getElementById('startLabel');
const endLabel = document.getElementById('endLabel');
const todayChip = document.getElementById('todayChip');
const frameStatus = document.getElementById('frameStatus');
const mapContainer = document.getElementById('map');

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const today = new Date();
const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
const startDate = new Date(endDate);
startDate.setMonth(startDate.getMonth() - 1);

const totalDays = Math.round((endDate - startDate) / MS_PER_DAY);
let currentOffset = totalDays;
let playing = false;
let timerId;
let map;
let rasterLayer;
let georasterData;

function pad(value) {
  return value.toString().padStart(2, '0');
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return { label: `${year}-${month}-${day}`, file: `${year}_${month}_${day}.tif` };
}

function dateFromOffset(offset) {
  const date = new Date(startDate);
  date.setDate(startDate.getDate() + offset);
  return date;
}

function stopPlayback() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  playing = false;
  playButton.textContent = '▶ 播放';
  playButton.ariaLabel = '播放时间轴';
}

function startPlayback() {
  if (playing) return;
  playing = true;
  playButton.textContent = '⏸ 暂停';
  playButton.ariaLabel = '暂停播放';

  timerId = setInterval(async () => {
    const max = Number(timeline.max);
    if (currentOffset >= max) {
      stopPlayback();
      return;
    }
    await updateFrame(currentOffset + 1);
  }, 700);
}

function showStatus(message) {
  frameStatus.textContent = message;
  frameStatus.classList.add('visible');
}

function hideStatus() {
  frameStatus.classList.remove('visible');
}

async function loadTif(url) {
  showStatus('加载中…');
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`无法找到 ${url}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    georasterData = await parseGeoraster(arrayBuffer);

    if (rasterLayer) {
      map.removeLayer(rasterLayer);
    }

    rasterLayer = new GeoRasterLayer({
      georaster: georasterData,
      opacity: 0.92,
      pixelValuesToColorFn: ([value]) => {
        const min = -1;
        const max = 2.5;
        if (value === null || Number.isNaN(value)) return 'transparent';
        const clamped = Math.min(Math.max(value, min), max);
        const t = (clamped - min) / (max - min);
        const r = Math.round(255 * (1 - t));
        const g = Math.round(160 + 80 * t);
        const b = Math.round(64 * (1 - t));
        return `rgb(${r}, ${g}, ${b})`;
      },
      resolution: 64,
    });

    rasterLayer.addTo(map);
    map.fitBounds(rasterLayer.getBounds());
    hideStatus();
  } catch (error) {
    console.error(error);
    showStatus('找不到对应日期的TIF');
  }
}

async function updateFrame(offset) {
  currentOffset = offset;
  timeline.value = offset;

  const date = dateFromOffset(offset);
  const { label, file } = formatDate(date);
  dateLabel.textContent = label;
  todayChip.textContent = `今天：${formatDate(endDate).label}`;

  await loadTif(`images/${file}`);
}

function initTimeline() {
  timeline.min = 0;
  timeline.max = totalDays;
  timeline.value = currentOffset;

  startLabel.textContent = formatDate(startDate).label;
  endLabel.textContent = formatDate(endDate).label;
  dateLabel.textContent = formatDate(endDate).label;
  todayChip.textContent = `今天：${formatDate(endDate).label}`;

  updateFrame(currentOffset);
}

function initMap() {
  map = L.map(mapContainer, {
    center: [30, 104],
    zoom: 5,
    zoomControl: false,
    attributionControl: false,
    preferCanvas: true,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(map);

  map.on('click', async (event) => {
    if (!georasterData) return;
    showStatus('读取像元值…');
    try {
      const value = await geoblaze.identify(georasterData, [event.latlng.lng, event.latlng.lat]);
      const numeric = Array.isArray(value) ? value[0] : value;
      if (numeric === null || Number.isNaN(numeric)) {
        showStatus('该位置无数据');
      } else {
        showStatus(`值：${Number(numeric).toFixed(2)} mm/d`);
      }
      setTimeout(hideStatus, 1800);
    } catch (error) {
      console.error(error);
      showStatus('读取失败');
    }
  });
}

playButton.addEventListener('click', () => {
  if (playing) {
    stopPlayback();
  } else {
    startPlayback();
  }
});

timeline.addEventListener('input', (event) => {
  stopPlayback();
  updateFrame(Number(event.target.value));
});

initMap();
initTimeline();
