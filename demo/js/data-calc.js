// Data's sums that draw nothing (tab-week.js draws them): goal days, a month's numbers for the strip under the Year
// chart, what grew and what shrank between two periods, the same days of the period before while one isn't over,
// a week's total across a month's edge, ISO week numbers, the days a task was done on.
// Plain functions of the days analyse() returns ({ start, key, work, byWork, tasks: { name: { ms, cats } }, ... }),
// so data-test.js can check them on their own.

export const WORKDAY = 15 * 60e3; // (a day with work: 15 minutes or more, as the Summary counts them)

/** The goal for a day, in hours: the weekend goal on Saturdays and Sundays when there is one, else the daily goal (0: none). */
export function goalFor(t, st) {
  const wd = new Date(t).getDay();
  return (wd === 0 || wd === 6) && st?.weekendGoal > 0 ? st.weekendGoal : st?.dailyGoal || 0;
}
/** Did the day reach its goal (the pink dot)? */
export const metGoal = (d, st) => { const g = goalFor(d.start, st); return g > 0 && d.work >= g * 3600e3; };

/** The ISO week number (weeks start on Monday; week 1 has the year's first Thursday). */
export function isoWeek(t) {
  const d = new Date(t), u = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const k = u.getUTCDay() || 7;
  u.setUTCDate(u.getUTCDate() + 4 - k);
  return Math.ceil(((u - Date.UTC(u.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7);
}

const past = (days, now) => days.filter((d) => d.start <= now);
const sum = (days, f = "work") => days.reduce((a, d) => a + (d[f] || 0), 0);

/** The most days with work in a row (days that haven't come yet don't count). */
export function longestRun(days, now = Date.now()) {
  let run = 0, best = 0;
  for (const d of past(days, now)) { run = d.work >= WORKDAY ? run + 1 : 0; best = Math.max(best, run); }
  return best;
}

/** Each category's work: { cat: ms }. */
export function catTotals(days) {
  const out = {};
  for (const d of days) for (const [c, ms] of Object.entries(d.byWork || {})) out[c] = (out[c] || 0) + ms;
  return out;
}
/** Each task's work: { name: { ms, cat } } (cat: the category most of it was in). */
export function taskTotals(days) {
  const out = {};
  for (const d of days) for (const [n, t] of Object.entries(d.tasks || {})) {
    const o = (out[n] = out[n] || { ms: 0, cats: {} });
    o.ms += t.ms;
    for (const [c, v] of Object.entries(t.cats || {})) o.cats[c] = (o.cats[c] || 0) + v;
  }
  for (const o of Object.values(out)) { o.cat = Object.entries(o.cats).sort((a, b) => b[1] - a[1])[0]?.[0] || "focus"; delete o.cats; }
  return out;
}

/**
 * The period before, to compare with. A period that isn't over yet (today is in it) is compared with the SAME days
 * of the one before: a week's Mon–Wed with Mon–Wed, a month's 1st–27th with the 1st–27th, a year's 1 Jan – 27 Oct with
 * 1 Jan – 27 Oct. A finished one: whole with whole.
 * → { soFar, n (the days of this one so far), other (the days of the one before to compare with), lastDay (this one's last day so far) }
 */
export function sameDays(range, days, before, now = Date.now()) {
  // (not over yet: today is in it, even on its last day; the days so far include today)
  const sofar = past(days, now), last = days[days.length - 1], soFar = !!last && (last.end ?? last.start + 864e5) > now, n = sofar.length;
  if (!soFar || !n) return { soFar, n: soFar ? n : days.length, other: soFar ? [] : before, lastDay: soFar ? null : days[days.length - 1] };
  const lastDay = sofar[n - 1], ld = new Date(lastDay.start);
  let other;
  if (range === "week") other = before.slice(0, n);
  else if (range === "month") other = before.filter((d) => new Date(d.start).getDate() <= ld.getDate());
  else other = before.filter((d) => { const x = new Date(d.start); return x.getMonth() < ld.getMonth() || (x.getMonth() === ld.getMonth() && x.getDate() <= ld.getDate()); });
  return { soFar, n, other, lastDay };
}

/** What grew and what shrank: [{ k, now, then, d }] for every key in either, the biggest change first. */
export function deltas(now, then) {
  return [...new Set([...Object.keys(now), ...Object.keys(then)])]
    .map((k) => ({ k, now: now[k] || 0, then: then[k] || 0, d: (now[k] || 0) - (then[k] || 0) }))
    .sort((a, b) => Math.abs(b.d) - Math.abs(a.d) || b.now - a.now);
}
/** Side by side's rows: per category and per task (each task's ms; its category to open it in "Where the time went"). */
export function changes(a, b) {
  const ta = taskTotals(a), tb = taskTotals(b), flat = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.ms]));
  const tasks = deltas(flat(ta), flat(tb)).map((r) => ({ ...r, cat: (ta[r.k] || tb[r.k]).cat }));
  return { cats: deltas(catTotals(a), catTotals(b)), tasks };
}

/**
 * A month's numbers (the strip under the Year chart): its days, and the month before's (for ▲▼).
 * While the month isn't over it's compared with the same days of the month before (sameDays).
 */
export function monthNumbers(days, before, st, now = Date.now()) {
  const p = past(days, now), cmp = sameDays("month", days, before, now), b = cmp.soFar ? cmp.other : before;
  const tasks = Object.entries(taskTotals(p)).filter(([n]) => n).sort((x, y) => y[1].ms - x[1].ms);
  const best = p.reduce((a, d) => (d.work > (a?.work || 0) ? d : a), null);
  const avg = (ds) => { const w = ds.filter((d) => d.work >= WORKDAY); return w.length ? sum(w) / w.length : 0; };
  return {
    total: sum(p), workdays: p.filter((d) => d.work >= WORKDAY).length, goalDays: p.filter((d) => metGoal(d, st)).length, daysSoFar: p.length,
    avg: avg(p), best: best?.work ? best : null, run: longestRun(days, now), top: tasks[0] ? { name: tasks[0][0], ms: tasks[0][1].ms } : null,
    soFar: cmp.soFar, n: cmp.n,
    was: { total: sum(b), workdays: b.filter((d) => d.work >= WORKDAY).length, avg: avg(b) },
  };
}

/** The Mondays of the rows of a month's calendar (each row a whole week, Monday to Sunday). */
export function weekRows(monthFirst, monthEnd, weekStart, addDays) {
  const out = [];
  for (let t = weekStart(monthFirst); t < monthEnd; t = addDays(t, 7)) out.push(t);
  return out;
}
/**
 * A whole week's numbers (the Week column): all seven days, also the ones in the month before or after.
 * → { total, goalDays, out (days of another month), outMonth (the first such day), soFar, task (ms on the marked task) }
 */
export function weekNumbers(days7, monthFirst, monthEnd, st, task = null, now = Date.now()) {
  const out = days7.filter((d) => d.start < monthFirst || d.start >= monthEnd);
  return { total: sum(days7), goalDays: days7.filter((d) => d.start <= now && metGoal(d, st)).length, out: out.length, outMonth: out[0]?.start ?? null,
    soFar: days7.some((d) => (d.end ?? d.start + 864e5) > now), task: task == null ? 0 : days7.reduce((a, d) => a + (d.tasks?.[task]?.ms || 0), 0) };
}

/** The days a task was done on, and the time on it: { days: n, ms, byDay: { key: ms } }. */
export function taskDays(days, name) {
  const byDay = {};
  for (const d of days) { const ms = d.tasks?.[name]?.ms || 0; if (ms >= 30e3) byDay[d.key] = ms; }
  return { days: Object.keys(byDay).length, ms: Object.values(byDay).reduce((a, b) => a + b, 0), byDay };
}
