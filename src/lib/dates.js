// Countdown helpers using the Asia/Singapore calendar day.
const TZ = 'Asia/Singapore';

// One countdown only: the final exam.
export const FINAL = { key: 'final', label: 'Final exam', when: 'Thu 12 Nov 2026 · 1 pm', date: '2026-11-12' };
export const EXAMS = [FINAL];

export function examMessage(n) {
  if (n > 1) return `${n} days left`;
  if (n === 1) return 'Tomorrow — light review, sleep early';
  if (n === 0) return 'Exam day! 1 pm · you have got this';
  return 'Done — well done';
}

function sgToday() {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  return fmt.format(new Date()); // YYYY-MM-DD
}

export function daysUntil(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const [ty, tm, td] = sgToday().split('-').map(Number);
  const a = Date.UTC(y, m - 1, d);
  const b = Date.UTC(ty, tm - 1, td);
  return Math.round((a - b) / 86400000);
}

export function daysLabel(n) {
  if (n < 0) return 'done';
  if (n === 0) return 'today';
  if (n === 1) return '1 day';
  return `${n} days`;
}

export function formatVisited(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString('en-SG', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
