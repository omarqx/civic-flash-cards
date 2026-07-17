export interface Holiday { name: string; message: string; }

function nthWeekday(date: Date, month: number, weekday: number, n: number): boolean {
  if (date.getMonth() !== month || date.getDay() !== weekday) return false;
  return Math.ceil(date.getDate() / 7) === n;
}
function lastWeekday(date: Date, month: number, weekday: number): boolean {
  if (date.getMonth() !== month || date.getDay() !== weekday) return false;
  const next = new Date(date); next.setDate(date.getDate() + 7);
  return next.getMonth() !== month;
}
function fixed(date: Date, month: number, day: number): boolean {
  return date.getMonth() === month && date.getDate() === day;
}

const RULES: Array<{ holiday: Holiday; match: (d: Date) => boolean }> = [
  { holiday: { name: "New Year's Day", message: 'A fresh year of study begins.' }, match: d => fixed(d, 0, 1) },
  { holiday: { name: 'Martin Luther King, Jr. Day', message: 'He worked for equality for all Americans.' }, match: d => nthWeekday(d, 0, 1, 3) },
  { holiday: { name: "Presidents' Day", message: "Honoring the nation's highest office." }, match: d => nthWeekday(d, 1, 1, 3) },
  { holiday: { name: 'Memorial Day', message: 'Honoring those who died in military service.' }, match: d => lastWeekday(d, 4, 1) },
  { holiday: { name: 'Flag Day', message: 'Fifty stars, thirteen stripes.' }, match: d => fixed(d, 5, 14) },
  { holiday: { name: 'Juneteenth', message: 'Celebrating the end of slavery in the United States.' }, match: d => fixed(d, 5, 19) },
  { holiday: { name: 'Independence Day', message: 'Free from Great Britain since 1776.' }, match: d => fixed(d, 6, 4) },
  { holiday: { name: 'Labor Day', message: 'Honoring the American worker.' }, match: d => nthWeekday(d, 8, 1, 1) },
  { holiday: { name: 'Constitution Day', message: 'The supreme law of the land, signed 1787.' }, match: d => fixed(d, 8, 17) },
  { holiday: { name: 'Columbus Day', message: 'A day of exploration.' }, match: d => nthWeekday(d, 9, 1, 2) },
  { holiday: { name: 'Veterans Day', message: 'Honoring all who served.' }, match: d => fixed(d, 10, 11) },
  { holiday: { name: 'Thanksgiving', message: 'A day of gratitude since 1621.' }, match: d => nthWeekday(d, 10, 4, 4) },
  { holiday: { name: 'Christmas Day', message: 'Merry Christmas.' }, match: d => fixed(d, 11, 25) },
];

export function getTodaysHoliday(date: Date = new Date()): Holiday | null {
  // Preview override: ?holiday=<name fragment> (e.g. ?holiday=independence)
  // forces a holiday on; ?holiday alone previews the next upcoming one.
  const params = new URLSearchParams(window.location.search);
  if (params.has('holiday')) {
    const q = (params.get('holiday') ?? '').trim().toLowerCase();
    if (q) {
      const hit = RULES.find(r => r.holiday.name.toLowerCase().includes(q));
      if (hit) return hit.holiday;
    }
    const probe = new Date(date);
    for (let i = 0; i < 366; i++) {
      const hit = RULES.find(r => r.match(probe));
      if (hit) return hit.holiday;
      probe.setDate(probe.getDate() + 1);
    }
  }
  return RULES.find(r => r.match(date))?.holiday ?? null;
}
