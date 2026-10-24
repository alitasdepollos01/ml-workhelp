// Data: a week, a month or a year. A bar at the top (which one, ‹ ›, a picture, export) and three tabs:
// Summary (how did it go: the numbers with their trend, what stands out, each day by category; a year: a
// square for every day too), Analysis (where, when and how: where the time went, breaks, when you work,
// your typical day, focus quality, side by side) and Calendar (the days; a day opens below, to look at
// and change, day-log.js). A year: click a month and Summary and Analysis are that month. Export CSV: every entry.
// Whatever way you keep time, it's the same: it shows what's in the log (🍅 rounds when there are some).

import { L, zh, el, host, work, state, hm, hours, clock, dayKey, addDays, weekStart, dayName, dateShort, catName, catOf, catColor, deco, modal, toast, LOC, pageTop } from "./app-common.js";
import { dayLog, closeDayLog } from "./day-log.js";
import { wordOfDay } from "./word-card.js";
import { startTour } from "./tour.js";

let range = "week";              // "week" | "month" | "year"
let shown = weekStart(Date.now()); // the first day of the one shown
let tab = "sum";       // "sum" (Summary) | "ana" (Analysis) | "cal" (Calendar)
let openDay = null;    // the day open in the calendar (its dayKey), or null
let yearMonth = null;  // a year's overview: the month picked (0–11): the page is that month

const monthStart = (t) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); };
const yearStart = (t) => new Date(new Date(t).getFullYear(), 0, 1).getTime();
const startOf = (r, t) => (r === "week" ? weekStart(t) : r === "month" ? monthStart(t) : yearStart(t));
/** The one n before (−) or after (+). */
function step(r, t, n) {
  const d = new Date(t);
  return r === "week" ? addDays(t, 7 * n) : r === "month" ? new Date(d.getFullYear(), d.getMonth() + n, 1).getTime() : new Date(d.getFullYear() + n, 0, 1).getTime();
}
const WORDS = {
  week: { now: () => L("This week", "本週"), prev: () => L("the week before", "上週"), all: () => L("whole week", "整週"), it: () => L("this week", "本週"), each: () => L("Weekly / daily analysis", "每週／每日分析") },
  month: { now: () => L("This month", "這個月"), prev: () => L("the month before", "上個月"), all: () => L("whole month", "整個月"), it: () => L("this month", "這個月"), each: () => L("Monthly / daily analysis", "每月／每日分析") },
  year: { now: () => L("This year", "今年"), prev: () => L("the year before", "去年"), all: () => L("whole year", "整年"), it: () => L("this year", "今年"), each: () => L("Yearly / monthly analysis", "每年／每月分析") },
};
const monthName = (t) => new Date(t).toLocaleDateString(LOC, { month: zh ? "numeric" : "long" }).replace(/^(\d+)$/, "$1 月");

/** The log from `from` to `to`, sorted into days, categories, tasks and hours. */
export function analyse(h, from, to = addDays(from, 7)) {
  const days = [];
  for (let t = from, i = 0; t < to; t = addDays(t, 1), i++) {
    days.push({ i, start: t, end: addDays(t, 1), key: dayKey(t), work: (h?.days?.[dayKey(t)] || 0) * 1000, breaks: 0, away: 0,
      byWork: {}, byBreak: {}, tasks: {}, segs: [], entries: [], hours: new Array(24).fill(0), focus: h?.focus?.[dayKey(t)] || "", rounds: h?.rounds?.[dayKey(t)] || 0 });
  }
  if (!days.length) return days;
  const end = days[days.length - 1].end;
  // (the first day an entry touches: a search, so a year of entries stays quick)
  const firstDay = (t) => { let lo = 0, hi = days.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (days[mid].start <= t) lo = mid; else hi = mid - 1; } return lo; };
  for (const e of h?.entries || []) {
    const s0 = Math.max(e.start, from), e0 = Math.min(e.end, end);
    if (e0 <= s0) continue;
    const workMs = e.kind === "work" ? (e.worked || 0) * 1000 : 0, span = Math.max(1, e.end - e.start);
    for (let k = firstDay(s0); k < days.length && days[k].start < e0; k++) {
      const d = days[k], s = Math.max(e.start, d.start), en = Math.min(e.end, d.end);
      if (en <= s) continue;
      d.segs.push({ kind: e.kind, start: s, end: en, e });
      if (e.start >= d.start && e.start < d.end) d.entries.push(e);
      if (e.kind === "work") {
        const ms = workMs * ((en - s) / span), c = e.cat || "focus", n = e.name || "";
        d.byWork[c] = (d.byWork[c] || 0) + ms;
        d.tasks[n] = d.tasks[n] || { ms: 0, cats: {} };
        d.tasks[n].ms += ms; d.tasks[n].cats[c] = (d.tasks[n].cats[c] || 0) + ms;
        for (let t = s; t < en;) { const next = Math.min(en, new Date(t).setMinutes(60, 0, 0)); d.hours[new Date(t).getHours()] += (next - t) * (workMs / span); t = next; }
      } else if (e.kind === "break") { d.breaks += en - s; d.byBreak[e.type] = (d.byBreak[e.type] || 0) + (en - s); }
      else d.away += en - s;
    }
  }
  return days;
}

const sumObj = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const total = (list, f) => list.reduce((a, d) => a + d[f], 0);
function merge(list, f) { const out = {}; for (const d of list) for (const [k, v] of Object.entries(d[f])) out[k] = (out[k] || 0) + v; return out; }
function mergeTasks(list) {
  const out = {};
  for (const d of list) for (const [n, t] of Object.entries(d.tasks)) {
    out[n] = out[n] || { ms: 0, cats: {} }; out[n].ms += t.ms;
    for (const [c, v] of Object.entries(t.cats)) out[n].cats[c] = (out[n].cats[c] || 0) + v;
  }
  return Object.entries(out).map(([name, t]) => ({ name, ms: t.ms, cat: Object.entries(t.cats).sort((a, b) => b[1] - a[1])[0]?.[0] })).sort((a, b) => b.ms - a.ms);
}
/** The days of a year by month: [{ i, start, days }]. */
function byMonth(days) {
  const out = [];
  for (const d of days) { const m = new Date(d.start).getMonth(); (out[m] = out[m] || { i: m, start: monthStart(d.start), days: [] }).days.push(d); }
  return out.filter(Boolean);
}
/** The focuses set most often: [[focus, days]]. */
const topFocus = (days) => Object.entries(days.reduce((o, d) => (d.focus ? ((o[d.focus] = (o[d.focus] || 0) + 1), o) : o), {})).sort((a, b) => b[1] - a[1]);

/** A few plain sentences about the week (month, year). */
export function insights(days, last, goalH, r = "week") {
  const out = [], w = WORDS[r];
  const work = total(days, "work"), breaks = total(days, "breaks");
  if (!work && !breaks) return [L(`Nothing logged ${w.it()} yet. Your work, breaks and time away show up here as they happen.`, `${w.now()}還沒有紀錄。你一開始工作、休息或離開，這裡就會跟著出現。`)];
  const lastWork = total(last, "work");
  if (lastWork > 0) {
    const pct = Math.round(((work - lastWork) / lastWork) * 100);
    out.push(L(`${hours(work)} of work, ${pct >= 0 ? `${pct}% more` : `${-pct}% less`} than ${w.prev()} (${hours(lastWork)}).`, `工作 ${hours(work)}，比${w.prev()}（${hours(lastWork)}）${pct >= 0 ? `多 ${pct}%` : `少 ${-pct}%`}。`));
  }
  if (r === "year") {
    const ms = byMonth(days).map((m) => ({ ...m, work: total(m.days, "work") })).filter((m) => m.work);
    const best = ms.reduce((a, m) => (!a || m.work > a.work ? m : a), null);
    if (best) out.push(L(`Your biggest month was ${monthName(best.start)}: ${hours(best.work)} of work.`, `工作最多的月份是 ${monthName(best.start)}：${hours(best.work)}。`));
  } else {
    const best = days.reduce((a, d) => (d.work > a.work ? d : a), days[0]);
    if (best.work > 0) out.push(L(`Your biggest day was ${r === "week" ? dayName(best.start, "long") : dateShort(best.start)}: ${hm(best.work)} of work.`, `工作最多的一天是${r === "week" ? dayName(best.start, "long") : dateShort(best.start)}：${hm(best.work)}。`));
  }
  if (r !== "week") {
    // Which day of the week, on average.
    const wd = Array.from({ length: 7 }, () => ({ ms: 0, n: 0 }));
    for (const d of days) if (d.start <= Date.now()) { const k = (new Date(d.start).getDay() + 6) % 7; wd[k].ms += d.work; wd[k].n++; }
    const avg = wd.map((x, k) => ({ k, ms: x.n ? x.ms / x.n : 0 })).sort((a, b) => b.ms - a.ms);
    if (avg[0].ms >= 30 * 60e3) out.push(L(`${dayName(addDays(weekStart(Date.now()), avg[0].k), "long")}s are your biggest days: ${hm(avg[0].ms)} on average.`, `${dayName(addDays(weekStart(Date.now()), avg[0].k), "long")}通常做最多，平均 ${hm(avg[0].ms)}。`));
  }
  const byHour = new Array(24).fill(0); for (const d of days) d.hours.forEach((v, i) => { byHour[i] += v; });
  let bh = -1, bm = 0; for (let i = 0; i < 23; i++) { const m = byHour[i] + byHour[i + 1]; if (m > bm) { bm = m; bh = i; } }
  if (bh >= 0 && bm >= 30 * 60e3) { const a = `${String(bh).padStart(2, "0")}:00`, b = `${String(bh + 2).padStart(2, "0")}:00`; out.push(L(`You get the most done between ${a} and ${b}.`, `你在 ${a}–${b} 之間最有效率。`)); }
  const cats = Object.entries(merge(days, "byWork")).sort((a, b) => b[1] - a[1]);
  if (cats[0] && work) out.push(L(`${catName(catOf("work", cats[0][0]), true)} took ${Math.round((cats[0][1] / work) * 100)}% of your work.`, `${catName(catOf("work", cats[0][0]), true)}佔了 ${Math.round((cats[0][1] / work) * 100)}% 的工作時間。`));
  const tasks = mergeTasks(days).filter((t) => t.name);
  if (tasks[0]) out.push(L(`${tasks[0].name} took ${hm(tasks[0].ms)}.`, `「${tasks[0].name}」花了 ${hm(tasks[0].ms)}。`));
  const focus = topFocus(days);
  if (r !== "week" && focus[0]?.[1] > 1) out.push(L(`Your most frequent focus: ${focus[0][0]} (${focus[0][1]} days).`, `最常設定的主題：「${focus[0][0]}」（${focus[0][1]} 天）。`));
  const brk = Object.entries(merge(days, "byBreak")).sort((a, b) => b[1] - a[1]);
  if (brk[0]) out.push(L(`Most of your break time went to ${catName(catOf("break", brk[0][0]), true)}: ${hm(brk[0][1])}.`, `休息時大多在${catName(catOf("break", brk[0][0]), true)}：${hm(brk[0][1])}。`));
  const away = total(days, "away");
  if (away >= 20 * 60e3) out.push(L(`${hm(away)} away you haven't labelled. Say what it was in Today${r === "week" ? "" : " (or open the day here)"}.`, `有 ${hm(away)} 的離開時間還沒標記，可以到「今天」${r === "week" ? "" : "（或在這裡打開那天）"}說明是在做什麼。`));
  if (goalH) { const n = days.filter((d) => d.work >= goalH * 3600e3).length; out.push(L(`Daily goal (${goalH} h) reached on ${n} day${n === 1 ? "" : "s"}.`, `有 ${n} 天達成每日目標（${goalH} 小時）。`)); }
  const withFocus = days.filter((d) => d.focus && d.work), without = days.filter((d) => !d.focus && d.work);
  if (withFocus.length && without.length) {
    const avg = (l) => l.reduce((a, d) => a + d.work, 0) / l.length, diff = avg(withFocus) - avg(without);
    // (more and less as two sentences: one with "more"/"less" put in can't be translated well)
    const n = withFocus.length, t = hm(Math.abs(diff));
    if (Math.abs(diff) >= 15 * 60e3) out.push(diff > 0
      ? L(`On the ${n} day${n === 1 ? "" : "s"} you set a focus, you worked ${t} more a day on average.`, `有設定主題的那 ${n} 天，平均每天多工作 ${t}。`)
      : L(`On the ${n} day${n === 1 ? "" : "s"} you set a focus, you worked ${t} less a day on average.`, `有設定主題的那 ${n} 天，平均每天少工作 ${t}。`));
  }
  return out;
}

let goTab = null;
/** Where Data is (the menu marks it): { range, tab }. */
export const dataState = () => ({ range, tab, page: 0 });
const RANGE = () => ({ week: L("Week", "週"), month: L("Month", "月"), year: L("Year", "年") });
const TABS = () => [["sum", L("Summary", "總覽")], ["ana", L("Analysis", "分析")], ["cal", L("Calendar", "日曆")]];
export async function renderWeek(main, { redraw, ask, go: goTo }) {
  goTab = goTo;
  if (ask?.tab && ["sum", "cal", "ana"].includes(ask.tab)) tab = ask.tab;
  if (ask?.range) { range = ask.range; shown = startOf(range, Date.now()); peek = null; openDay = null; yearMonth = null; catOpen = null; }
  if (ask?.openDay) { openDay = dayKey(Date.now()); tab = "cal"; } // (the tour: today, opened in the calendar)
  const st = state.st;
  const end = step(range, shown, 1), prevStart = step(range, shown, -1);
  // (and for the little trend lines: the eight before it; a year: its months)
  const trailStart = range === "year" ? shown : step(range, shown, -7);
  const [h, prev, hTrail] = await Promise.all([work.history(shown, end), work.history(prevStart, shown), range === "year" ? null : work.history(trailStart, end)]);
  const days = analyse(h, shown, end), last = analyse(prev, prevStart, shown);
  const trail = range === "year" ? byMonth(days).filter((m) => m.start <= Date.now()).map((m) => m.days)
    : Array.from({ length: 8 }, (_, i) => { const a = step(range, shown, i - 7); return analyse(hTrail, a, step(range, a, 1)); });
  const prev2 = range === "year" ? null : trail[5];
  const isNow = shown === startOf(range, Date.now());
  const go = (t) => { shown = t; peek = null; openDay = null; yearMonth = null; window.scrollTo(0, 0); redraw(); };
  const btn = (label, fn, extra = {}) => { const b = el("button", { type: "button", className: "btn small", textContent: label, ...extra }); b.addEventListener("click", fn); return b; };
  // The bar: week, month or year; ‹ which one ›; back to now; export; the tour. It stays at the top.
  const ranges = el("div", { className: "seg", role: "radiogroup", "aria-label": L("Week, month or year", "週、月或年") }, Object.entries(RANGE()).map(([k, t]) => {
    const b = el("button", { type: "button", className: range === k ? "on" : "", textContent: t, role: "radio", "aria-checked": String(range === k) });
    b.addEventListener("click", () => { if (range === k) return; range = k; go(startOf(k, Date.now())); });
    return b;
  }));
  const title = range === "week"
    ? `${isNow ? L("This week", "本週") : shown === weekStart(addDays(Date.now(), -7)) ? L("Last week", "上週") : L(`The week of ${dateShort(shown)}`, `${dateShort(shown)} 那一週`)} · ${dateShort(shown)} – ${dateShort(addDays(shown, 6))}`
    : range === "month" ? (isNow ? L("This month · ", "這個月 · ") : "") + new Date(shown).toLocaleDateString(LOC, { year: "numeric", month: "long" })
      : (isNow ? L("This year · ", "今年 · ") : "") + (zh ? `${new Date(shown).getFullYear()} 年` : String(new Date(shown).getFullYear()));
  main.append(pageTop({ title: L("Data", "數據"), sub: L("Your weeks, months and years of work", "你每週、每月、每年的工作"), spot: "app-data-top" }));
  main.append(el("div", { className: "dbar" }, ranges,
    btn("‹", () => go(step(range, shown, -1)), { "aria-label": L("The one before", "上一個") }),
    el("h2", { className: "period", textContent: title }),
    btn("›", () => go(Math.min(step(range, shown, 1), startOf(range, Date.now()))), { "aria-label": L("The one after", "下一個"), disabled: isNow }),
    isNow ? null : btn(L(`Back to ${WORDS[range].it()}`, `回到${WORDS[range].now()}`), () => go(startOf(range, Date.now()))),
    el("span", { style: "flex:1" }),
    btn(L("Make a picture", "存成圖片"), () => sharePicture(days, st), { className: "btn small share-btn" }),
    btn(L("Export CSV", "匯出 CSV"), () => showCsv(days), { className: "btn small csv-btn" }),
    btn(L("Show me Data", "帶我看數據"), () => startTour(goTab, "data"), { className: "btn small data-tour" })),
    el("div", { className: "dtabs", role: "tablist" }, TABS().map(([k, t]) => {
      const b = el("button", { type: "button", role: "tab", className: tab === k ? "on" : "", "aria-selected": String(tab === k), "data-tab": k, textContent: t });
      b.addEventListener("click", () => { tab = k; window.scrollTo(0, 0); redraw(); });
      return b;
    })));
  if (tab === "cal") calendarTab(main, days, st, redraw);
  else if (tab === "ana") analysis(main, days, last, st, redraw, prev2);
  else summary(main, days, last, st, redraw, trail);
}

// ---- Summary ("how did it go?"): the numbers, each with its little trend (the goal days as a ring), what stands
// out, each day's bar by category (work, breaks or both; the one before as an outline); a year: each month, and a
// square for every day. A year: click a month and the page is that month; a week or a month: click a day for a quick look.
// ---- Analysis ("where, when and how?"): where the time went (and each category's tasks), breaks, when you work, your
// typical day, focus quality, two periods side by side. ----

let catOpen = null;      // "Where the time went": the category opened to its tasks
let peek = null;         // a week's or a month's day, looked at under the chart (its key)
let chartShow = "work";  // the chart: "work" | "breaks" | "both"
let compareBack = 1;     // Analysis › Side by side: with the one before (1) or the one before that (2)

/** What a page is about: all of it, or (a year) the month picked; and the one before it. */
function selection(days, last) {
  const yr = range === "year", months = yr ? byMonth(days) : null;
  if (yr && yearMonth != null && !months.find((m) => m.i === yearMonth)) yearMonth = null;
  const sel = yr && yearMonth != null ? months.find((m) => m.i === yearMonth).days : days;
  const selLast = yr && yearMonth != null ? (yearMonth > 0 ? months.find((m) => m.i === yearMonth - 1)?.days || [] : last.filter((d) => new Date(d.start).getMonth() === 11)) : last;
  return { yr, months, sel, selLast, sr: yr && yearMonth != null ? "month" : range };
}
function monthChip(main, months, redraw) {
  if (range !== "year" || yearMonth == null) return;
  const back = el("button", { type: "button", className: "chip on month-chip", textContent: L(`Showing ${monthName(months.find((m) => m.i === yearMonth).start)} · ✕ the whole year`, `正在看 ${monthName(months.find((m) => m.i === yearMonth).start)} · ✕ 看全年`) });
  back.addEventListener("click", () => { yearMonth = null; redraw(); });
  main.append(back);
}
const NS = "http://www.w3.org/2000/svg";
function svgEl(tag, attrs = {}, text) { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (text != null) e.textContent = text; return e; }
/** A little line of the periods before this one (the last point: this one). */
function sparkline(vals) {
  const m = Math.max(...vals, 1e-9), svg = svgEl("svg", { viewBox: "0 0 100 22", preserveAspectRatio: "none", class: "spark", "aria-hidden": "true" });
  svg.append(svgEl("polyline", { points: vals.map((v, i) => `${(i / Math.max(1, vals.length - 1)) * 100},${20 - (v / m) * 18}`).join(" ") }));
  return svg;
}
/** A ring: how much of it is done (goal days). */
function ring(frac) {
  const svg = svgEl("svg", { viewBox: "0 0 44 44", class: "dring", "aria-hidden": "true" });
  svg.append(svgEl("circle", { cx: 22, cy: 22, r: 18, class: "bg" }), svgEl("circle", { cx: 22, cy: 22, r: 18, class: "fg", "stroke-dasharray": `${113.1 * Math.max(0, Math.min(1, frac))} 113.1`, transform: "rotate(-90 22 22)" }));
  return svg;
}

function summary(main, days, last, st, redraw, trail) {
  const { yr, months, sel, selLast, sr } = selection(days, last), w = WORDS[sr];
  monthChip(main, months, redraw);
  const soFar = sel.filter((d) => d.start <= Date.now());
  const work = total(sel, "work"), breaks = total(sel, "breaks"), away = total(sel, "away"), rounds = total(sel, "rounds");
  const lastWork = total(selLast, "work");
  const workdays = sel.filter((d) => d.work >= 15 * 60e3).length, lastWorkdays = selLast.filter((d) => d.work >= 15 * 60e3).length;
  const goalH = st?.dailyGoal || 0, goalDays = goalH ? sel.filter((d) => d.work >= goalH * 3600e3).length : 0;
  // 1. The numbers, each with the periods before it as a little line.
  const cmp = (now, was) => {
    if (!was) return el("span", { className: "muted", textContent: L(`nothing ${w.prev()}`, `${w.prev()}沒有紀錄`) });
    const pct = Math.round(((now - was) / was) * 100);
    return el("span", { className: pct > 0 ? "up" : pct < 0 ? "down" : "muted", textContent: pct === 0 ? L(`same as ${w.prev()}`, `跟${w.prev()}一樣`) : `${pct > 0 ? "▲" : "▼"} ${Math.abs(pct)}% ` + L(`on ${w.prev()}`, `比${w.prev()}`) });
  };
  const series = (f) => (trail?.length ? trail.map(f) : []);
  const tile = (label, value, sub, extra) => el("div", { className: "dtile" }, el("span", { className: "muted", textContent: label }), el("b", { textContent: value }),
    typeof sub === "string" ? el("span", { className: "muted", textContent: sub }) : sub, extra || null);
  const avg = workdays ? work / workdays : 0, lastAvg = lastWorkdays ? lastWork / lastWorkdays : 0;
  const wdOf = (ds) => ds.filter((d) => d.work >= 15 * 60e3);
  const goalTile = goalH ? el("div", { className: "dtile ring-tile" }, el("div", {}, el("span", { className: "muted", textContent: L("Goal days", "達標天數") }), el("b", { textContent: `${goalDays} / ${soFar.length}` }),
    el("span", { className: "muted", textContent: L(`${goalH} h a day`, `每天 ${goalH} 小時`) })), ring(soFar.length ? goalDays / soFar.length : 0))
    : tile(L("Days with work", "有工作的天數"), String(workdays), "", sparkline(series((t) => wdOf(t).length)));
  main.append(el("section", { className: "dtiles", "aria-label": L("In numbers", "數據") },
    tile(L("Work", "工作"), hm(work), cmp(work, lastWork), sparkline(series((t) => total(t, "work")))),
    tile(L("A workday", "平均每個工作天"), workdays ? hm(avg) : "–", workdays ? cmp(avg, lastAvg) : L(`${workdays} days with work`, `${workdays} 天有工作`), sparkline(series((t) => { const n = wdOf(t).length; return n ? total(t, "work") / n : 0; }))),
    goalTile,
    rounds || total(selLast, "rounds") ? tile(L("Pomodoros", "番茄鐘"), L(`${rounds}`, `${rounds} 輪`), L(`${hm(rounds * (st?.pomo?.focus || 25) * 60e3)} of focus`, `專注 ${hm(rounds * (st?.pomo?.focus || 25) * 60e3)}`), sparkline(series((t) => total(t, "rounds"))))
      : tile(L("Breaks", "休息"), hm(breaks), away >= 60e3 ? L(`away ${hm(away)}`, `離開 ${hm(away)}`) : "", sparkline(series((t) => total(t, "breaks"))))));
  // 2. What stands out.
  let longest = null; for (const d of sel) for (const s of d.segs) if (s.kind === "work" && (!longest || s.e.worked > longest.worked)) longest = s.e;
  const focus = topFocus(sel)[0];
  main.append(el("section", { className: "card stands sum-card" }, deco("app-data-sum", "sum-deco"),
    el("h3", { textContent: L("Summary", "重點整理") }),
    el("div", { className: "dpills" },
      longest ? el("span", { className: "dpill", textContent: L(`Longest stretch · ${hm(longest.worked * 1000)}${longest.name ? ` (${longest.name})` : ""}`, `最長一次連續工作 · ${hm(longest.worked * 1000)}${longest.name ? `（${longest.name}）` : ""}`) }) : null,
      el("span", { className: "dpill", textContent: L(`Days with work · ${workdays}`, `有工作的天數 · ${workdays}`) }),
      rounds ? el("span", { className: "dpill", textContent: L(`${rounds} Pomodoro${rounds === 1 ? "" : "s"}`, `番茄鐘 ${rounds} 輪`) }) : null,
      focus && sr !== "week" ? el("span", { className: "dpill", textContent: L(`Focus set most: ${focus[0]} · ${focus[1]} day${focus[1] === 1 ? "" : "s"}`, `最常的主題：${focus[0]} · ${focus[1]} 天`) }) : null,
      away >= 60e3 ? el("span", { className: "dpill warn", textContent: L(`${hm(away)} away not labelled yet (label it in Calendar)`, `${hm(away)} 的離開還沒標記（到「日曆」那天標記）`) }) : null),
    el("ul", { className: "ins" }, insights(sel, selLast, goalH, sr).map((t) => el("li", { textContent: t })))));
  // 3. The chart, by category; a year: also a square for every day.
  main.append(workChart(days, last, st, redraw, months, yr ? byMonth(last) : null));
  if (yr) main.append(yearSquares(days, redraw));
}

function analysis(main, days, last, st, redraw, prev2) {
  const { months, sel, selLast } = selection(days, last);
  monthChip(main, months, redraw);
  const breaks = total(sel, "breaks"), away = total(sel, "away");
  // Where the time went (and each category's tasks), and the breaks.
  const byW = merge(sel, "byWork"), byB = merge(sel, "byBreak"), tasks = mergeTasks(sel);
  const ranked = (kind, o, open) => { const top = Math.max(1, ...Object.values(o)), tot = sumObj(o) || 1; return el("div", { className: "ranked" }, Object.entries(o).sort((a, b) => b[1] - a[1]).flatMap(([c, ms]) => {
    const name = el("span", { className: "ell", textContent: catName(catOf(kind, c), true) + (open ? (catOpen === c ? " ▾" : " ▸") : "") });
    const row = el("div", { className: open ? "clickable" : "" }, name, el("span", { className: "meter" }, el("i", { style: `width:${(ms / top) * 100}%;background:${catColor(kind, c)}` })), el("span", { className: "muted", textContent: `${hm(ms)} · ${Math.round((ms / tot) * 100)}%` }));
    if (open) { row.tabIndex = 0; row.setAttribute("role", "button"); row.setAttribute("aria-expanded", String(catOpen === c)); const t = () => { catOpen = catOpen === c ? null : c; redraw(); }; row.addEventListener("click", t); row.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); t(); } }); }
    const sub = open && catOpen === c ? el("div", { className: "subtasks" }, tasks.filter((x) => (x.cat || "focus") === c).slice(0, 8).map((x) => el("span", {}, `${x.name || L("(not named)", "（未命名）")} `, el("b", { textContent: hm(x.ms) })))) : null;
    return [row, sub];
  })); };
  // (its sticker grows with what the card holds: more categories, or a category's tasks open, a bigger sticker)
  const whereRows = Object.keys(byW).length + (catOpen && byW[catOpen] ? Math.ceil(Math.min(8, tasks.filter((x) => (x.cat || "focus") === catOpen).length) / 2) : 0);
  const whereArt = Math.round(Math.max(72, Math.min(170, 40 + whereRows * 22)));
  const whereCard = el("section", { className: "card where-card" }, deco("app-week-analysis", "where-deco"), el("h3", { textContent: L("Where the time went", "時間花在哪裡") }), el("p", { className: "muted small", textContent: L("Click a category for its tasks.", "點一個分類，看裡面的每件事。") }),
      Object.keys(byW).length ? ranked("work", byW, true) : el("span", { className: "muted", textContent: L("No work here yet.", "這裡還沒有工作紀錄。") }));
  whereCard.style.setProperty("--where-art", whereArt + "px");
  main.append(el("div", { className: "two-col dash-row" },
    whereCard,
    el("section", { className: "card breaks-card" }, el("h3", { textContent: L("Breaks", "休息") + (breaks ? ` · ${hm(breaks)}` : "") }),
      away >= 60e3 ? el("p", { className: "muted small", textContent: L(`Away from the computer: ${hm(away)}`, `離開電腦：${hm(away)}`) }) : null,
      Object.keys(byB).length ? ranked("break", byB, false) : el("span", { className: "muted", textContent: L("No breaks logged.", "沒有休息紀錄。") }))));
  // When you work, and your typical day.
  main.append(el("div", { className: "two-col dash-row" },
    el("section", { className: "card when-card" }, el("h3", { textContent: L("When you work", "什麼時候工作") }), heatmap(sel)),
    typicalDay(sel)));
  // Focus quality, and two periods side by side.
  main.append(el("div", { className: "two-col dash-row" }, focusQuality(sel), sideBySide(sel, selLast, prev2, st, redraw)));
}

/** Your typical day: when you usually start, have lunch and stop (days with work). */
function typicalDay(sel) {
  const card = el("section", { className: "card typical-card" }, el("h3", { textContent: L("Your typical day", "你平常的一天") }));
  const days = sel.filter((d) => d.work >= 30 * 60e3);
  if (!days.length) { card.append(el("p", { className: "muted", textContent: L("Not enough logged yet.", "紀錄還不夠多。") })); return card; }
  const tod = (t, d) => (t - d.start) / 3600e3;
  const starts = [], ends = [], lunches = [];
  for (const d of days) {
    const ws = d.segs.filter((s) => s.kind === "work");
    if (!ws.length) continue;
    starts.push(tod(Math.min(...ws.map((s) => s.start)), d)); ends.push(tod(Math.max(...ws.map((s) => s.end)), d));
    const meal = d.segs.find((s) => s.kind === "break" && s.e.type === "meal" && tod(s.start, d) >= 10.5 && tod(s.start, d) <= 15);
    if (meal) lunches.push([tod(meal.start, d), tod(meal.end, d)]);
  }
  const mid = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  const st0 = mid(starts), en = mid(ends), lu = lunches.length >= Math.max(2, days.length / 3) ? [mid(lunches.map((x) => x[0])), mid(lunches.map((x) => x[1]))] : null;
  const pos = (h) => `${Math.max(0, Math.min(100, ((h - 6) / 17) * 100))}%`, wid = (a, b) => `${Math.max(0.5, ((b - a) / 17) * 100)}%`;
  const hhmm = (h) => `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
  const bar = el("div", { className: "ribbon" });
  const block = (a, b, c) => { const i = el("i"); i.style.left = pos(a); i.style.width = wid(a, b); i.style.background = c; bar.append(i); };
  if (lu) { block(st0, lu[0], "var(--work)"); block(lu[0], lu[1], catColor("break", "meal")); block(lu[1], en, "var(--work)"); } else block(st0, en, "var(--work)");
  card.append(bar, el("div", { className: "peek-ticks muted" }, ["6", "9", "12", "15", "18", "21", "23"].map((h) => el("span", { textContent: h }))),
    el("p", { className: "muted small", style: "margin:4px 0 0", textContent: lu
      ? L(`You usually start at ${hhmm(st0)}, have lunch around ${hhmm(lu[0])} and stop at ${hhmm(en)}.`, `你通常 ${hhmm(st0)} 開始，${hhmm(lu[0])} 左右吃午餐，${hhmm(en)} 收工。`)
      : L(`You usually start at ${hhmm(st0)} and stop at ${hhmm(en)}.`, `你通常 ${hhmm(st0)} 開始，${hhmm(en)} 收工。`) }));
  return card;
}

/** Focus quality: how much of the work came in stretches of 25 minutes or more, and how often you switched tasks. */
function focusQuality(sel) {
  const card = el("section", { className: "card focusq-card" }, el("h3", { textContent: L("Focus quality", "專注品質") }));
  const all = [], perDay = [];
  for (const d of sel) {
    const ws = d.segs.filter((s) => s.kind === "work" && s.e.start >= d.start).map((s) => s.e).sort((a, b) => a.start - b.start);
    if (!ws.length) continue;
    all.push(...ws);
    let sw = 0; for (let i = 1; i < ws.length; i++) if ((ws[i].name || "") !== (ws[i - 1].name || "")) sw++;
    perDay.push(sw);
  }
  const totalS = all.reduce((a, e) => a + (e.worked || 0), 0);
  if (!totalS) { card.append(el("p", { className: "muted", textContent: L("Not enough logged yet.", "紀錄還不夠多。") })); return card; }
  const longS = all.filter((e) => (e.worked || 0) >= 25 * 60).reduce((a, e) => a + e.worked, 0), pct = Math.round((longS / totalS) * 100);
  const sw = perDay.length ? Math.round(perDay.reduce((a, b) => a + b, 0) / perDay.length) : 0, best = Math.max(...all.map((e) => e.worked || 0));
  const meter = el("div", { className: "meter big-meter" }, el("i", { style: `width:${pct}%;background:var(--primary)` }));
  card.append(el("div", { className: "row-flex" }, el("b", { className: "big-num", textContent: `${pct}%` }), el("span", { className: "muted small", textContent: L("of your work came in stretches of 25 minutes or more (no break, no switching)", "的工作時間是連續 25 分鐘以上（沒休息、沒換事情）") })),
    meter, el("p", { className: "muted small", style: "margin:0", textContent: L(`${sw} switch${sw === 1 ? "" : "es"} between tasks on a usual day · longest unbroken stretch ${hm(best * 1000)}`, `平常一天換 ${sw} 次事情 · 最長一次連續 ${hm(best * 1000)}`) }));
  return card;
}

/** Two periods side by side: the numbers and each category, with what grew and what shrank. */
function sideBySide(sel, selLast, prev2, st, redraw) {
  const other = compareBack === 2 && prev2 ? prev2 : selLast;
  const pick = el("select", { "aria-label": L("Compare with", "跟哪一段比") },
    new Option(L(`with ${WORDS[range].prev()}`, `跟${WORDS[range].prev()}比`), "1"), prev2 ? new Option(L(`with the one before that`, `跟再前一段比`), "2") : null);
  pick.value = String(compareBack);
  pick.addEventListener("change", () => { compareBack = Number(pick.value); redraw(); });
  const row = (label, a, b, fmt = hm) => [el("span", { textContent: label }), el("b", { textContent: fmt(a) }), el("span", { className: "muted", textContent: fmt(b) }),
    el("span", { className: a > b ? "up" : a < b ? "down" : "muted", textContent: a === b ? "–" : `${a > b ? "▲" : "▼"} ${fmt(Math.abs(a - b))}` })];
  const cats = [...new Set([...Object.keys(merge(sel, "byWork")), ...Object.keys(merge(other, "byWork"))])];
  const A = merge(sel, "byWork"), B = merge(other, "byWork");
  return el("section", { className: "card compare-card" }, el("div", { className: "spread" }, el("h3", { textContent: L("Side by side", "前後比較") }), pick),
    el("div", { className: "cmp-grid" }, el("span"), el("span", { className: "muted small", textContent: L("now", "這段") }), el("span", { className: "muted small", textContent: L("then", "那段") }), el("span"),
      row(L("Work", "工作"), total(sel, "work"), total(other, "work")), row(L("Breaks", "休息"), total(sel, "breaks"), total(other, "breaks")),
      row(L("Pomodoros", "番茄鐘"), total(sel, "rounds"), total(other, "rounds"), (x) => String(x)),
      cats.sort((x, y) => (A[y] || 0) - (A[x] || 0)).slice(0, 6).flatMap((c) => row(catName(catOf("work", c), true), A[c] || 0, B[c] || 0))));
}

/** A year: a square for every day, darker for more work; click one to open it in the calendar. */
function yearSquares(days, redraw) {
  const first = days[0]?.start || Date.now(), pad = (new Date(first).getDay() + 6) % 7, most = Math.max(4 * 3600e3, ...days.map((d) => d.work));
  const grid = el("div", { className: "ysq", role: "img", "aria-label": L("Every day of the year", "這一年的每一天") });
  for (let i = 0; i < pad; i++) grid.append(el("i", { className: "blank" }));
  for (const d of days) {
    const future = d.start > Date.now(), sq = el("i", { className: future ? "future" : "", title: `${new Date(d.start).toLocaleDateString(LOC, { weekday: "short", month: "short", day: "numeric" })}: ${hm(d.work)}` });
    if (!future) { sq.style.opacity = String(d.work ? 0.18 + 0.82 * Math.min(1, d.work / most) : 0.07); sq.addEventListener("click", () => { range = "month"; shown = monthStart(d.start); tab = "cal"; openDay = d.key; yearMonth = null; window.scrollTo(0, 0); redraw(); }); }
    grid.append(sq);
  }
  return el("section", { className: "card ysq-card" }, el("div", { className: "spread" }, el("h3", { textContent: L("The year, a square a day", "這一年，一天一格") }),
    el("span", { className: "muted small", textContent: L("Darker: more work. Click a day to open it.", "顏色越深，做得越多。點一天就能打開。") })),
    el("div", { className: "ysq-wrap" }, grid), el("div", { className: "peek-ticks muted" }, Array.from({ length: 12 }, (_, i) => el("span", { textContent: zh ? `${i + 1}月` : new Date(2026, i, 1).toLocaleDateString(L("en-GB", "en-GB"), { month: "short" }) }))));
}

/** The chart: each day (a year: each month), split by category: the work, the breaks, or both; the one before as an
 *  outline; the daily goal as a line. A week or a month: click a day for a quick look. A year: click a month and the page is that month. */
function workChart(days, last, st, redraw, months, lastMonths) {
  const yr = range === "year", goalH = st?.dailyGoal || 0, today = dayKey(Date.now());
  const parts = (ds) => {
    const out = [];
    if (chartShow !== "breaks") for (const [c, ms] of Object.entries(merge(ds, "byWork"))) out.push([catColor("work", c), ms, catName(catOf("work", c), true)]);
    if (chartShow !== "work") for (const [c, ms] of Object.entries(merge(ds, "byBreak"))) out.push([catColor("break", c), ms, catName(catOf("break", c), true)]);
    return out;
  };
  const amount = (ds) => (chartShow === "work" ? total(ds, "work") : chartShow === "breaks" ? total(ds, "breaks") : total(ds, "work") + total(ds, "breaks"));
  const units = yr ? Array.from({ length: 12 }, (_, i) => { const m = months.find((x) => x.i === i), lm = lastMonths?.find((x) => x.i === i);
    const start = new Date(new Date(shown).getFullYear(), i, 1).getTime();
    return { key: i, label: zh ? `${i + 1}月` : new Date(start).toLocaleDateString(L("en-GB", "en-GB"), { month: "short" }), long: monthName(start), ds: m ? m.days : [], was: lm ? amount(lm.days) : 0, work: m ? total(m.days, "work") : 0, future: start > Date.now() }; })
    : days.map((d, i) => ({ key: d.key, label: range === "week" ? dayName(d.start) : String(new Date(d.start).getDate()), long: new Date(d.start).toLocaleDateString(LOC, { weekday: "short", month: "short", day: "numeric" }),
      ds: [d], was: last[i] ? amount([last[i]]) : 0, work: d.work, future: d.start > Date.now(), today: d.key === today }));
  for (const u of units) { u.parts = parts(u.ds); u.v = u.parts.reduce((a, p) => a + p[1], 0); }
  const n = units.length, W = 680, H = 210, padL = 40, padB = 24, top = 12, slot = (W - padL) / n, bw = Math.max(3, Math.min(22, slot * 0.5));
  const showGoal = !yr && goalH && chartShow === "work";
  const max = Math.max(yr ? 40 * 3600e3 : 4 * 3600e3, ...units.map((u) => Math.max(u.v, u.was)), showGoal ? goalH * 3600e3 * 1.1 : 0) * 1.08;
  const step0 = max > 200 * 3600e3 ? 50 * 3600e3 : max > 80 * 3600e3 ? 20 * 3600e3 : max > 20 * 3600e3 ? 10 * 3600e3 : max > 8 * 3600e3 ? 2 * 3600e3 : 3600e3;
  const y = (v) => top + (H - top - padB) * (1 - v / max);
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, class: "wchart", role: "img", "aria-label": yr ? L("Each month", "每個月") : L("Each day", "每一天") });
  for (let t = 0; t < max; t += step0) { svg.append(svgEl("line", { x1: padL, x2: W, y1: y(t), y2: y(t), class: "grid" }), svgEl("text", { x: padL - 6, y: y(t) + 4, "text-anchor": "end", class: "lab" }, `${Math.round(t / 3600e3)}h`)); }
  if (showGoal) svg.append(svgEl("line", { x1: padL, x2: W, y1: y(goalH * 3600e3), y2: y(goalH * 3600e3), class: "goal" }), svgEl("text", { x: W - 2, y: y(goalH * 3600e3) - 5, "text-anchor": "end", class: "lab" }, L(`goal ${goalH} h`, `目標 ${goalH} 小時`)));
  const picked = yr ? yearMonth : peek;
  units.forEach((u, i) => {
    const cx = padL + slot * i + slot / 2, x = cx - bw / 2, on = picked === u.key;
    const g = svgEl("g", { class: "col" + (on ? " on" : "") + (picked != null && !on ? " dim" : "") + (u.future ? " future" : ""), tabindex: u.future ? "-1" : "0", role: "button", "aria-label": `${u.long}: ${hm(u.v)}`, "data-ms": String(Math.round(u.work)) });
    g.append(svgEl("rect", { x: cx - slot / 2, y: top, width: slot, height: H - top - padB, class: "hit" }));
    if (u.was > 0) g.append(svgEl("rect", { x: x - 2, y: y(u.was), width: bw + 4, height: Math.max(1, y(0) - y(u.was)), rx: 3, class: "was" }));
    let acc = 0;
    for (const [c, ms, name] of u.parts.sort((a, b) => b[1] - a[1])) {
      if (ms <= 0) continue;
      const r = svgEl("rect", { x, y: y(acc + ms), width: bw, height: Math.max(0.5, y(acc) - y(acc + ms) - (u.parts.length > 1 ? 1 : 0)), rx: 2 });
      r.style.fill = c; r.append(svgEl("title", {}, `${u.long} · ${name}: ${hm(ms)}`)); g.append(r); acc += ms;
    }
    g.append(svgEl("title", {}, `${u.long}: ${hm(u.v)} · ${WORDS[range].prev()}: ${hm(u.was)}`));
    svg.append(g);
    if (n <= 12 || i % 2 === 0 || u.today) svg.append(svgEl("text", { x: cx, y: H - 7, "text-anchor": "middle", class: "lab" + (on || u.today ? " strong" : "") }, u.label));
    if (!u.future) {
      const pickIt = () => { if (yr) yearMonth = yearMonth === u.key ? null : u.key; else peek = peek === u.key ? null : u.key; redraw(); };
      g.addEventListener("click", pickIt); g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pickIt(); } });
    }
  });
  // Work, breaks or both.
  const show = el("div", { className: "seg small-seg", role: "radiogroup", "aria-label": L("Show", "顯示") }, [["work", L("Work", "工作")], ["breaks", L("Breaks", "休息")], ["both", L("Both", "兩者")]].map(([k, t]) => {
    const b = el("button", { type: "button", className: chartShow === k ? "on" : "", textContent: t, role: "radio", "aria-checked": String(chartShow === k) });
    b.addEventListener("click", () => { chartShow = k; redraw(); });
    return b;
  }));
  const prevName = WORDS[range].prev().replace(/^the /, "").replace(/^./, (c) => c.toUpperCase());
  const head = el("div", { className: "spread" }, el("h3", { textContent: yr ? L("Each month, by category", "每個月，依分類") : L("Each day, by category", "每一天，依分類") }), show);
  const legendRow = el("span", { className: "legend" }, ...[...new Map(units.flatMap((u) => u.parts.map((p) => [p[2], p[0]]))).entries()].slice(0, 8).map(([nm, c]) => legend(c, nm)), legend("transparent", prevName));
  legendRow.lastChild.classList.add("was-legend");
  const hint = el("p", { className: "muted small", textContent: yr ? L("Click a month: the whole page shows that month.", "點一個月，整頁就換成那個月。") : L("Click a day for a quick look.", "點一天，看那天的樣子。") });
  // A week's or a month's day: a quick look, and the way to change it.
  let look = null;
  const d = !yr && peek ? days.find((x) => x.key === peek) : null;
  if (d) {
    const strip = el("div", { className: "peek-line" });
    const t0 = d.start + 6 * 3600e3, span = 17 * 3600e3;
    for (const s of d.segs) {
      const left = Math.max(0, (s.start - t0) / span), wdt = Math.max(0.004, (s.end - s.start) / span);
      if (left > 1) continue;
      const c = s.kind === "work" ? catColor("work", s.e.cat || "focus") : s.kind === "break" ? catColor("break", s.e.type) : "var(--away)";
      strip.append(el("i", { style: `left:${left * 100}%;width:${Math.min(wdt, 1 - left) * 100}%;background:${c}`, title: `${clock(s.start)}–${clock(s.end)} ${s.kind === "work" ? s.e.name || "" : s.kind === "break" ? catName(catOf("break", s.e.type), true) : L("Away", "離開")}` }));
    }
    const open = el("button", { type: "button", className: "linkish", textContent: L("Change it in Calendar ›", "到「日曆」修改 ›") });
    open.addEventListener("click", () => { tab = "cal"; openDay = d.key; peek = null; window.scrollTo(0, 0); redraw(); });
    const when = new Date(d.start).toLocaleDateString(LOC, { weekday: "long", month: "short", day: "numeric" });
    look = el("div", { className: "peek" }, el("div", { className: "spread" }, el("b", { textContent: d.focus ? `${when} · ${d.focus}` : when }), open),
      el("span", { className: "muted small", textContent: L(`Work ${hm(d.work)} · breaks ${hm(d.breaks)}${d.rounds ? ` · ${d.rounds} Pomodoros` : ""}${d.away >= 60e3 ? ` · away ${hm(d.away)}` : ""}`, `工作 ${hm(d.work)} · 休息 ${hm(d.breaks)}${d.rounds ? ` · 番茄鐘 ${d.rounds} 輪` : ""}${d.away >= 60e3 ? ` · 離開 ${hm(d.away)}` : ""}`) }),
      strip, el("div", { className: "peek-ticks muted" }, ["6", "9", "12", "15", "18", "21", "23"].map((h) => el("span", { textContent: h }))));
  }
  return el("section", { className: "card chart-card" }, head, legendRow, hint, svg, look);
}
const legend = (c, t) => { const s = el("span", { textContent: t }); s.style.setProperty("--c", c); return s; };

/**
 * Make a picture: a little card of this week (month, year) or today, saved as an image in Downloads. Nothing is sent
 * anywhere. Six designs; the sticker is one of ten picked at random from photos by the photographers who let us
 * share their photos (PICTURE_BY), with their credit on the card.
 */
const PICTURE_BY = ["Blumoon", "Lyrac", "NGMin", "otter", "alitasdepollo"];
let pictureKind = "week";
async function sharePicture(days, st) {
  const work = total(days, "work"), rounds = total(days, "rounds"), top = mergeTasks(days).find((t) => t.name), best = days.reduce((a, d) => (d.work > a.work ? d : a), days[0]);
  const what = range === "week" ? L("My week", "我的這一週") : range === "month" ? L(`My ${monthName(shown)}`, `我的${monthName(shown)}`) : L(`My ${new Date(shown).getFullYear()}`, `我的 ${new Date(shown).getFullYear()} 年`);
  const goal = Number(st?.goal || st?.dailyGoal || 0), past = days.filter((d) => d.start <= Date.now());
  const goalDays = goal ? past.filter((d) => d.work >= goal * 3600e3).length : 0;
  const word = await wordOfDay().catch(() => null);
  // The stickers to pick from: from photos credited only to the photographers above.
  let credits = null; try { credits = await host.photoCredits(); } catch { credits = null; }
  const pool = (credits?.stickers || []).filter((s) => { const t = [].concat(credits.credits?.[s.source] || []); return t.length && t.every((x) => PICTURE_BY.includes(x)); });
  const nameOf = (s) => [].concat(credits.credits[s.source]).map((t) => credits.people?.[t]?.name || (t === "alitasdepollo" ? "alitasdepollos" : t)).join(" & ");
  const urlOf = (s) => `photos/stickers/${s.set}/${String(s.name).split("/").map(encodeURIComponent).join("/")}`;
  let ten = [], pick = null;
  const shuffle = () => { ten = pool.slice().sort(() => Math.random() - 0.5).slice(0, 10); pick = ten[0] || null; };
  shuffle();

  const KINDS = [["week", range === "week" ? L("My week", "我的這一週") : range === "month" ? L("My month", "我的這個月") : L("My year", "我的這一年")], ["day", L("My day", "我的今天")], ["pomo", L("Pomodoros", "番茄鐘")],
    ["thai", L("Thai word of the day", "今日泰文")], ["goal", L("Goal days", "達標天數")], ["month", range === "week" ? L("My week at a glance", "這一週一覽") : L("At a glance", "一覽")]];
  const card = el("div", { className: "share-card" });
  const bar = (i, h, hit) => el("i", { className: hit ? "hit" : "", style: `height:${Math.max(4, h)}px` });
  function body() {
    if (pictureKind === "day") return [el("span", { className: "share-k", textContent: new Date().toLocaleDateString(LOC, { weekday: "short", day: "numeric", month: "short" }) }),
      st?.focus ? el("b", { className: "share-focus", textContent: st.focus }) : null, el("b", { className: "share-n", textContent: hm(st?.today || 0) }),
      el("span", { textContent: [st?.rounds ? L(`${st.rounds} Pomodoros`, `番茄鐘 ${st.rounds} 輪`) : L("of work today", "今天的工作"), word ? L(`Thai word: ${word.th} (${word.en})`, `泰文：${word.th}（${word.en}）`) : ""].filter(Boolean).join(" · ") })];
    if (pictureKind === "pomo") return [el("span", { className: "share-k", textContent: L(`Pomodoros · ${what}`, `番茄鐘 · ${what}`) }), el("b", { className: "share-n", textContent: String(rounds) }),
      el("div", { className: "share-dots" }, Array.from({ length: Math.min(rounds, 40) }, () => el("i"))), rounds > 40 ? el("span", { textContent: L(`and ${rounds - 40} more`, `還有 ${rounds - 40} 輪`) }) : null];
    if (pictureKind === "thai") return word ? [el("span", { className: "share-k", textContent: L("Thai word of the day", "今日泰文") }), el("b", { className: "share-th", lang: "th", textContent: word.th }),
      el("span", {}, el("b", { textContent: word.rom || "" }), word.rom ? " · " : "", word.en)] : [el("b", { className: "share-what", textContent: L("No Thai word today", "今天沒有泰文單字") })];
    if (pictureKind === "goal") { const most = Math.max(goal * 3600e3, ...past.map((d) => d.work), 1);
      return [el("span", { className: "share-k", textContent: L(`Goal days · ${what}`, `達標天數 · ${what}`) }), el("b", { className: "share-n", textContent: goal ? `${goalDays} / ${past.length}` : "–" }),
        el("span", { textContent: goal ? L(`days with ${goal} h of work`, `天工作滿 ${goal} 小時`) : L("No daily goal set", "還沒設每日目標") }),
        el("div", { className: "share-bars" }, past.slice(-14).map((d, i) => bar(i, (d.work / most) * 80, goal && d.work >= goal * 3600e3)))]; }
    if (pictureKind === "month") { const most = Math.max(...days.map((d) => d.work), 1);
      return [el("span", { className: "share-k", textContent: what }), el("b", { className: "share-n", textContent: hm(work) }), el("span", { textContent: L(`of work · ${past.filter((d) => d.work > 60e3).length} days`, `的工作 · ${past.filter((d) => d.work > 60e3).length} 天`) }),
        el("div", { className: "share-cal" }, days.slice(0, 31).map((d) => el("i", { style: `opacity:${d.work ? 0.25 + 0.75 * d.work / most : 0.1}` })))]; }
    return [el("span", { className: "share-k", textContent: what }), el("b", { className: "share-n", textContent: hm(work) }), el("span", { textContent: rounds ? L(`of work · ${rounds} Pomodoros`, `的工作 · 番茄鐘 ${rounds} 輪`) : L("of work", "的工作") }),
      top ? el("span", { textContent: L(`Most: ${top.name}`, `做最多：${top.name}`) }) : null,
      best?.work ? el("span", { textContent: L(`Best day: ${new Date(best.start).toLocaleDateString(LOC, { weekday: "short", month: "short", day: "numeric" })}`, `最好的一天：${new Date(best.start).toLocaleDateString(LOC, { month: "numeric", day: "numeric", weekday: "short" })}`) }) : null];
  }
  const kinds = el("div", { className: "share-kinds", role: "radiogroup", "aria-label": L("Which card", "哪一種卡片") });
  const strip = el("div", { className: "share-strip", role: "radiogroup", "aria-label": L("The sticker", "貼圖") });
  function draw() {
    card.className = `share-card k-${pictureKind}`;
    card.replaceChildren(el("span", { className: "muted small share-brand", textContent: "ML WorkHelp" }), ...body().filter(Boolean),
      pick ? el("img", { className: "share-st", src: urlOf(pick), alt: "" }) : deco("app-data-sum", "share-deco"),
      pick ? el("span", { className: "share-credit", textContent: L(`Sticker from a photo by ${nameOf(pick)}`, `貼圖取自 ${nameOf(pick)} 的照片`) }) : null);
    kinds.replaceChildren(...KINDS.map(([k, t]) => { const b = el("button", { type: "button", className: "chip" + (k === pictureKind ? " on" : ""), role: "radio", "aria-checked": String(k === pictureKind), textContent: t }); b.addEventListener("click", () => { pictureKind = k; draw(); }); return b; }));
    strip.replaceChildren(...ten.map((s) => { const b = el("button", { type: "button", className: s === pick ? "on" : "", role: "radio", "aria-checked": String(s === pick), "aria-label": L(`Sticker, photo by ${nameOf(s)}`, `貼圖，照片：${nameOf(s)}`) },
      el("img", { src: urlOf(s), alt: "", "data-credit": L(`Photo: ${nameOf(s)}`, `照片：${nameOf(s)}`) })); b.addEventListener("click", () => { pick = s; draw(); }); return b; }));
  }
  const { box } = modal(L("Make a picture", "存成圖片"));
  box.classList.add("share-box");
  const again = el("button", { type: "button", className: "btn small", textContent: L("Shuffle: 10 new ones", "換一批：10 張") });
  again.addEventListener("click", () => { shuffle(); draw(); });
  const save = el("button", { type: "button", className: "btn primary", textContent: L("Save to Downloads", "存到下載") });
  save.addEventListener("click", async () => {
    const r = card.getBoundingClientRect();
    const file = await host.savePicture?.({ x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }, what);
    toast(file ? L("Saved to Downloads", "已存到下載") : L("Couldn't save it", "沒辦法存"));
  });
  box.append(el("div", { className: "share-layout" }, el("div", {}, card, el("p", { className: "muted small", textContent: L("Saved as an image in your Downloads folder; nothing is sent anywhere.", "存成圖片放在「下載」資料夾，不會傳到任何地方。") }), el("div", { className: "row-flex" }, save)),
    el("div", { className: "share-side" }, el("b", { textContent: L("Card", "卡片") }), kinds,
      pool.length ? el("div", { className: "spread" }, el("b", { textContent: L("Sticker", "貼圖") }), again) : null, pool.length ? strip : null,
      pool.length ? el("p", { className: "muted small", textContent: L("Ten at random, from photos by Blumoon, Lyrac, NGMin, otter and alitasdepollos.", "隨機 10 張，來自 Blumoon、Lyrac、NGMin、otter 和 alitasdepollos 的照片。") }) : null)));
  draw();
}

// ---- 📅 Calendar: a week's day cards, a month's calendar, a year's months; a day opens below, to look at and change ----

function calendarTab(main, days, st, redraw) {
  const pomo = false, today = dayKey(Date.now()); // (the hours, whatever way you keep time)
  const openIt = (d) => { if (d.start > Date.now()) return; openDay = openDay === d.key ? null : d.key; closeDayLog(); redraw(); };
  const keyed = (node, fn) => { node.addEventListener("click", fn); node.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } }); return node; };
  if (range === "week") {
    main.append(el("section", { className: "week-cards", "aria-label": L("Each day", "每一天") }, days.map((d) => {
      const future = d.start > Date.now();
      return keyed(el("div", { className: "wcard" + (d.key === today ? " today" : "") + (openDay === d.key ? " open" : "") + (future ? " future" : ""), role: "button", tabIndex: future ? -1 : 0, "aria-expanded": String(openDay === d.key) },
        el("span", { className: "muted", textContent: `${dayName(d.start)} · ${dateShort(d.start)}` }),
        el("b", { textContent: pomo ? (d.rounds ? `🍅 ${d.rounds}` : "–") : d.work >= 60e3 ? hm(d.work) : "–" }),
        el("div", { className: "mini" }, el("i", { style: `width:${Math.min(100, (d.work / (10 * 3600e3)) * 100)}%;background:var(--work)` }), el("i", { style: `width:${Math.min(40, (d.breaks / (10 * 3600e3)) * 100)}%;background:var(--break)` })),
        el("span", { className: "ell muted", textContent: d.focus ? "" + d.focus : future ? "" : L("(no focus set)", "（沒有設定主題）") }),
        !pomo && d.rounds ? el("span", { className: "tom", textContent: `🍅 ${d.rounds}` }) : null), () => openIt(d));
    })));
  } else if (range === "month") main.append(calendar(days, st, openIt, pomo));
  else main.append(months(days, redraw, pomo));
  const d = range !== "year" && days.find((x) => x.key === openDay);
  if (d) main.append(dayPanel(d, st, redraw));
  else if (range !== "year") main.append(el("p", { className: "muted", textContent: L("Click a day to see what you did, and change it.", "點一天看那天做了什麼，也能直接改。") }));
}

/** A month: a calendar, each day with its focus and hours (the deeper the green, the more work). */
function calendar(days, st, openIt, roundsOnly = false) {
  const most = Math.max(3600e3, ...days.map((d) => d.work)), today = dayKey(Date.now());
  const lead = (new Date(days[0].start).getDay() + 6) % 7;
  const grid = el("div", { className: "cal-grid" },
    Array.from({ length: 7 }, (_, k) => el("span", { className: "cal-wd", textContent: dayName(addDays(weekStart(days[0].start), k)) })),
    Array.from({ length: lead }, () => el("span")));
  for (const d of days) {
    const future = d.start > Date.now();
    const cell = el("div", { className: "cal-day" + (d.key === today ? " today" : "") + (openDay === d.key ? " open" : "") + (future ? " future" : ""), role: "button", tabIndex: future ? -1 : 0,
      title: future ? "" : L("Click to see this day", "點一下看這一天"), "aria-expanded": String(openDay === d.key) },
      el("b", { textContent: String(new Date(d.start).getDate()) }),
      d.focus ? el("span", { className: "ell", textContent: d.focus }) : null,
      el("span", { className: "muted", textContent: roundsOnly ? (d.rounds ? `🍅 ${d.rounds}` : "") : d.work >= 3 * 60e3 ? `${(d.work / 3600e3).toFixed(1)} h` : "" }));
    cell.style.setProperty("--h", String(roundsOnly ? Math.min(1, d.rounds / 8) : d.work / most));
    cell.addEventListener("click", () => openIt(d));
    cell.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openIt(d); } });
    grid.append(cell);
  }
  return el("section", { className: "card cal-card" }, el("div", { className: "spread" }, el("h3", { textContent: roundsOnly ? L("Each day's rounds", "每天的番茄鐘") : L("Each day's focus and hours", "每天的主題和時數") }),
    el("span", { className: "muted", textContent: L("Today has a frame", "今天有外框") })), grid);
}

/** A year: the twelve months; click one to see its calendar. */
function months(days, redraw, roundsOnly = false) {
  const ms = byMonth(days).map((m) => ({ ...m, work: total(m.days, "work"), rounds: total(m.days, "rounds"), top: mergeTasks(m.days).find((t) => t.name) }));
  const most = Math.max(3600e3, ...ms.map((m) => m.work));
  return el("section", { className: "card year-card" }, el("h3", { textContent: L("Each month · click one to see its calendar", "每個月・點一個月看那個月的月曆") }),
    el("div", { className: "year-grid" }, ms.map((m) => {
      const future = m.start > Date.now();
      const b = el("button", { type: "button", className: "year-month" + (future ? " future" : ""), disabled: future },
        el("b", { textContent: monthName(m.start) }),
        el("span", { textContent: roundsOnly ? (m.rounds ? `🍅 ${m.rounds}` : "–") : m.work ? hm(m.work) : "–" }),
        el("span", { className: "muted ell", textContent: !roundsOnly && m.top ? L(`Most: ${m.top.name}`, `最多：${m.top.name}`) : "" }),
        el("i", { style: `width:${(roundsOnly ? Math.min(1, m.rounds / 80) : m.work / most) * 100}%` }));
      b.addEventListener("click", () => { range = "month"; shown = m.start; openDay = null; redraw(); });
      return b;
    })));
}

/** A day, opened below the calendar: its log to look at and change (day-log.js), its focus, ‹ › to the days beside it. */
function dayPanel(d, st, redraw) {
  const focusIn = el("input", { type: "text", value: d.focus, maxLength: 120, placeholder: L("(no focus set)", "（沒有設定主題）"), "aria-label": L("That day's focus", "那天的主題") });
  focusIn.addEventListener("change", async () => { await work.call("setFocus", focusIn.value, d.key); toast(L("Saved", "已儲存")); });
  const stepDay = (n) => { const t = addDays(d.start, n); if (t > Date.now()) return; if (t < shown || t >= step(range, shown, 1)) shown = startOf(range, t); openDay = dayKey(t); closeDayLog(); redraw(); };
  const b = (label, fn, extra = {}) => { const x = el("button", { type: "button", className: "btn small", textContent: label, ...extra }); x.addEventListener("click", fn); return x; };
  const isToday = d.key === dayKey(Date.now());
  return el("section", { className: "card day-panel" },
    el("div", { className: "spread" },
      el("div", { className: "row-flex" }, b("‹", () => stepDay(-1), { "aria-label": L("The day before", "前一天") }),
        el("b", { className: "dp-title", textContent: new Date(d.start).toLocaleDateString(LOC, { weekday: "long", month: "long", day: "numeric" }) + (isToday ? L(" · today", " · 今天") : "") }),
        b("›", () => stepDay(1), { "aria-label": L("The day after", "後一天"), disabled: isToday })),
      el("div", { className: "row-flex" }, el("span", { className: "muted", textContent: [d.work ? L(`${hm(d.work)} of work`, `工作 ${hm(d.work)}`) : "", d.breaks ? L(`breaks ${hm(d.breaks)}`, `休息 ${hm(d.breaks)}`) : "", d.rounds ? `🍅 ${d.rounds}` : ""].filter(Boolean).join(" · ") }),
        b(L("Close ✕", "關起來 ✕"), () => { openDay = null; closeDayLog(); redraw(); }))),
    el("div", { className: "row-flex" }, el("span", { className: "muted", textContent: L("Focus of the day", "本日主題") }), focusIn),
    dayLog(d.start, d.entries, { redraw }));
}

/** The heatmap: the hours you work (a week: by day; more: by day of the week, added up). */
function heatmap(sel) {
  const rows = sel.length <= 7 ? sel.map((d) => ({ name: dayName(d.start), hours: d.hours }))
    : Array.from({ length: 7 }, (_, k) => {
      const hrs = new Array(24).fill(0);
      for (const d of sel) if ((new Date(d.start).getDay() + 6) % 7 === k) d.hours.forEach((v, i) => { hrs[i] += v; });
      return { name: dayName(addDays(weekStart(sel[0].start), k)), hours: hrs };
    });
  const top = Math.max(3600e3, ...rows.flatMap((r) => r.hours));
  const row = (r) => el("div", { className: "heat", style: "grid-template-columns:52px repeat(24,minmax(0,1fr))" }, el("span", { textContent: r.name }),
    r.hours.map((ms, i) => el("i", { title: `${String(i).padStart(2, "0")}:00 · ${L(`${Math.round(ms / 60e3)} min of work`, `工作 ${Math.round(ms / 60e3)} 分鐘`)}`,
      style: `height:${sel.length === 1 ? 30 : 18}px;background:${ms ? `rgba(79,154,112,${0.15 + 0.85 * Math.min(1, ms / top)})` : "var(--line)"}` })));
  return el("div", { style: "display:grid;gap:3px" },
    el("div", { className: "heat muted", style: "grid-template-columns:52px repeat(24,minmax(0,1fr));font-size:10.5px" }, el("span"), Array.from({ length: 24 }, (_, i) => el("span", { textContent: i % 3 ? "" : String(i), style: "text-align:center" }))),
    rows.map(row), el("p", { className: "muted", textContent: sel.length > 7 ? L("Each day of the week, all of them added up. The deeper the green, the more of that hour you worked.", "一週七天各自加總。綠色越深，那個小時工作得越多。") : L("The deeper the green, the more of that hour you worked.", "綠色越深，那個小時工作得越多。") }));
}

/** Export CSV: a preview of the file, and saving it. */
function showCsv(days) {
  const head = [["date", "日期"], ["day", "星期"], ["start", "開始"], ["end", "結束"], ["minutes", "分鐘"], ["type", "類型"], ["category", "分類"], ["task", "任務"], ["note", "備註"], ["focus of the day", "本日主題"]].map(([en, z]) => L(en, z));
  const kindName = (k) => ({ work: L("work", "工作"), break: L("break", "休息"), away: L("away", "離開") })[k];
  const rows = [];
  for (const d of days) for (const s of d.segs.slice().sort((a, b) => a.start - b.start)) {
    const ms = s.kind === "work" ? (s.e.worked || 0) * 1000 * ((s.end - s.start) / Math.max(1, s.e.end - s.e.start)) : s.end - s.start;
    const cat = s.kind === "away" ? "" : catName(catOf(s.kind, s.kind === "work" ? s.e.cat : s.e.type));
    rows.push([d.key, dayName(d.start), clock(s.start), clock(s.end), Math.round(ms / 60e3), kindName(s.kind), cat, s.kind === "work" ? s.e.name || "" : "", s.e.note || "", d.focus]);
  }
  const { box } = modal(L("Export CSV: what's in the file", "匯出 CSV：檔案內容"));
  const save = el("button", { type: "button", className: "btn primary", textContent: L("Save the file (.csv)", "儲存檔案（.csv）") });
  save.addEventListener("click", () => {
    const q = (x) => `"${String(x).replace(/"/g, '""')}"`;
    const text = "﻿" + [head, ...rows].map((r) => r.map(q).join(",")).join("\r\n"); // (the BOM: Excel reads the Chinese and emoji right)
    const a = el("a", { href: URL.createObjectURL(new Blob([text], { type: "text/csv" })), download: `ml-workhelp-${range}-${days[0].key}.csv` });
    document.body.append(a); a.click(); a.remove();
    toast(L("Saved to your Downloads folder", "已存到「下載」資料夾"));
  });
  box.append(el("p", { className: "muted", textContent: L(`One row for each stretch of time ${WORDS[range].it()}: work, breaks and time away, with its category, task, note and that day's focus. Opens in Excel, Numbers or Google Sheets.`,
    `${WORDS[range].now()}的每一段時間各佔一列：工作、休息和離開，還有分類、任務、備註和當天的主題。用 Excel、Numbers 或 Google 試算表都能打開。`) }),
    rows.length ? el("div", { style: "overflow:auto;max-height:56vh;border:1px solid var(--line);border-radius:8px" },
      el("table", { className: "csv" }, el("thead", {}, el("tr", {}, head.map((t) => el("th", { textContent: t })))), el("tbody", {}, rows.slice(0, 200).map((r) => el("tr", {}, r.map((c) => el("td", { textContent: String(c) })))))))
      : el("p", { className: "muted", textContent: L("Nothing logged here yet.", "這裡還沒有紀錄。") }),
    rows.length > 200 ? el("p", { className: "muted", textContent: L(`(The first 200 of ${rows.length} rows shown; the file has all of them.)`, `（這裡只顯示 ${rows.length} 列中的前 200 列，檔案裡都有。）`) }) : null,
    el("div", { className: "row-flex", style: "justify-content:flex-end" }, save));
}
