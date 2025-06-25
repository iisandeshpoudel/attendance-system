// Format seconds as hh:mm:ss
export function formatHMS(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(unit => String(unit).padStart(2, '0')).join(':');
} 