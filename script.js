const timeline = document.getElementById('timeline');
const playButton = document.getElementById('playButton');
const dateLabel = document.getElementById('dateLabel');
const startLabel = document.getElementById('startLabel');
const endLabel = document.getElementById('endLabel');
const todayChip = document.getElementById('todayChip');
const image = document.getElementById('image');
const frameStatus = document.getElementById('frameStatus');

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const today = new Date();
const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
const startDate = new Date(endDate);
startDate.setMonth(startDate.getMonth() - 1);

const totalDays = Math.round((endDate - startDate) / MS_PER_DAY);
let currentOffset = totalDays;
let playing = false;
let timerId;

function pad(value) {
  return value.toString().padStart(2, '0');
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return { label: `${year}-${month}-${day}`, file: `${year}_${month}_${day}.png` };
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

  timerId = setInterval(() => {
    const max = Number(timeline.max);
    if (currentOffset >= max) {
      stopPlayback();
      return;
    }
    updateFrame(currentOffset + 1);
  }, 700);
}

function showStatus(message) {
  frameStatus.textContent = message;
  frameStatus.classList.add('visible');
}

function hideStatus() {
  frameStatus.classList.remove('visible');
}

function updateFrame(offset) {
  currentOffset = offset;
  timeline.value = offset;

  const date = dateFromOffset(offset);
  const { label, file } = formatDate(date);
  dateLabel.textContent = label;
  todayChip.textContent = `今天：${formatDate(endDate).label}`;

  image.src = `images/${file}`;
  image.alt = `${label} 的图片`;
  showStatus('加载中…');
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

image.addEventListener('load', hideStatus);
image.addEventListener('error', () => {
  showStatus('找不到对应日期的图片');
});

initTimeline();
