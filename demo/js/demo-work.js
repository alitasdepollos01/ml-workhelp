// app/desktop/work.js, for the website's demo (see demo-host.js), on pretend files kept in memory.
window.__memfsFiles = {};
window.__memfs = { readFileSync: (f) => { if (!(f in __memfsFiles)) throw new Error('ENOENT ' + f); return __memfsFiles[f]; }, writeFileSync: (f, t) => { __memfsFiles[f] = String(t); }, renameSync: (a, b) => { __memfsFiles[b] = __memfsFiles[a]; delete __memfsFiles[a]; }, rmSync: (f) => { delete __memfsFiles[f]; } };
window.__mlwhWork = (function () {
const module = { exports: {} };
const require = (n) => ({ fs: window.__memfs, path: { join: (...a) => a.join("/") } })[n];
// The work clock and reminders. Kept by the desktop app rather than a page, so
// they carry on while the desktop buddy is put away, the photos are reloaded or
// the app restarts.
//
// Work time is time at the computer: counted while the screen is unlocked and
// the keyboard or mouse was used in the last five minutes. Five minutes away
// (idle, locked, or the Mac asleep) is a break, and the next stretch of work
// starts from zero; the minutes spent idle before that don't count. Every day's
// total is kept in work.json, for "today" and "this week".
//
// Break reminders come after `breakEvery` minutes of one stretch (not while a
// focus timer runs: it has its own breaks), and again 10 minutes later unless
// you take one.
//
// Reminders ("in 20 minutes" or "at 15:30": something to do) are kept in
// reminders.json. One that came due while the app was off fires at the next start.
// A repeating one ("daily", "weekdays", "weekly") moves on to its next time as
// it fires; "In 10 min" on it makes a one-off copy, and Done leaves the series.
//
// A daily goal (hours) fires once a day when today's work reaches it.
//
// A stretch of work can have a name ("Thesis", "Emails"); the next one keeps
// it until you change it. Changing it is switching task: what you did so far
// is saved under the old name, and the new task starts from zero (giving it
// the same name again changes nothing).
//
// You can also start a break yourself, of a kind (toilet, coffee, a meal,
// entertainment...), for a while or until you're back: nothing counts
// meanwhile, and a timed one says when it's over. Coming back starts a new
// stretch: you say so, or you were away (a minute idle, or locked) during the
// break and are using the computer again, or the break has been over for two
// minutes while you're at it. Not once the app has asked "Break's over"
// (holdOver): then only the answer ends it, and moving the mouse to the
// answer isn't one; and not while the next Pomodoro round waits for you
// (holdBreak).
//
// Everything goes in a log, kept a year for the weekly report: each stretch
// of work (its name; one that goes on past midnight is cut there, an entry for
// each day), each break (its kind), and each time you were away
// without saying (five minutes or more, up to three hours; longer is time
// off). Away time can be labelled later as a kind of break, or as work (you
// were reading, thinking).
//
// Categories: every stretch of work has one (💻 Focus work, 📚 Study…), and
// each kind of break is one too. Both lists can be renamed, recoloured,
// added to and removed from (categories.json). A task keeps the category you
// gave it last (Thesis is always 📚 Study until you change it).
//
// A focus of the day: one line for what today is about, kept per day.
//
// Every entry in the log can be fixed afterwards: its name, category, times or
// note, turned from work into a break or back, deleted, or added by hand for
// time you forgot to log. The day totals follow.
//
// Two small nudges, each once per stretch: after ten minutes of work with no
// name, "what are you working on?" (askName); and, if you want it, eye rest
// every `eyeEvery` minutes of work (look twenty feet away for twenty seconds).
"use strict";

const fs = require("fs");
const path = require("path");

const AWAY = 5 * 60;          // seconds without keyboard or mouse: away
const IDLE_NOT_WORK = 60;     // counted, but taken back if it turns into a break
const ASK_AGAIN = 10 * 60;    // break reminder again after this many seconds
const KEEP_DAYS = 400;
const KEEP_DONE = 24 * 3600e3; // a fired reminder stays listed (as due) for a day
const KEEP_LOG_DAYS = 400;    // the log: work by name, breaks by kind, time away
const LOG_FROM = 60;          // ...if they lasted at least this many seconds
const BREAK_AWAY = 60;        // seconds idle during a break: you left the computer
const BACK_AFTER_OVER = 2 * 60e3; // a timed break over this long, and you're at the computer: back
const AWAY_LONGEST = 3 * 3600e3;  // away longer than this is time off, not a break
const ASK_NAME_AFTER = 10 * 60;   // seconds of unnamed work before asking what it is

/** Kinds of break, with how long each usually takes (0: until you're back), in English and Traditional Chinese. */
const BREAK_TYPES = [
  { id: "toilet", emoji: "🚽", label: "Toilet", zh: "上廁所", minutes: 5, color: "#f3aac0" },
  { id: "coffee", emoji: "☕", label: "Coffee or a snack", zh: "咖啡或點心", minutes: 10, color: "#e9b8a2" },
  { id: "meal", emoji: "🍜", label: "A meal", zh: "吃飯", minutes: 45, color: "#f0c58f" },
  { id: "fun", emoji: "🎮", label: "Entertainment (phone, videos, games)", zh: "娛樂（手機、影片、遊戲）", minutes: 15, color: "#e79ac4" },
  { id: "move", emoji: "🧘", label: "Stretch or a walk", zh: "伸展或散步", minutes: 10, color: "#f5b5b5" },
  { id: "rest", emoji: "😴", label: "Rest", zh: "休息", minutes: 20, color: "#d8b4e2" },
  { id: "pomodoro", emoji: "🍅", label: "Pomodoro break", zh: "番茄鐘休息", minutes: 5, color: "#f2a297" },
  { id: "other", emoji: "💬", label: "Something else", zh: "其他", minutes: 0, color: "#d9c7cf" },
];
/** Kinds of work, to start with. */
const WORK_TYPES = [
  { id: "focus", emoji: "💻", label: "Focus work", zh: "專注工作", color: "#5aa47a" },
  { id: "study", emoji: "📚", label: "Study & learning", zh: "讀書學習", color: "#86c79b" },
  { id: "mail", emoji: "📧", label: "Email & messages", zh: "信件與訊息", color: "#9ccfb4" },
  { id: "meet", emoji: "👥", label: "Meetings & calls", zh: "會議與通話", color: "#6fb7a8" },
  { id: "create", emoji: "🎨", label: "Creative", zh: "創作", color: "#b5d98c" },
  { id: "admin", emoji: "🗂️", label: "Admin & errands", zh: "行政雜事", color: "#a9bfae" },
  { id: "thai", emoji: "🇹🇭", label: "Thai practice", zh: "泰文練習", color: "#7fbfd0" },
];

/** Local date, "2026-10-15". */
function dayKey(t) {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// daily, weekdays, weekly; "days" (on the days in r.days, 0 = Sunday); "every"
// (every r.every minutes, from r.from "HH:MM" until r.until "HH:MM" each day).
const REPEATS = ["daily", "weekdays", "weekly", "days", "every"];

/** The next time a repeating reminder is due after `after`. */
function nextTime(at, repeat, after, r = {}) {
  const d = new Date(at);
  if (repeat === "every") {
    const step = Math.max(1, Number(r.every) || 60) * 60e3;
    const hm = (s, def) => { const [h, m] = String(s || def).split(":").map(Number); return h * 60 + (m || 0); };
    const from = hm(r.from, "00:00"), until = hm(r.until, "23:59");
    let t = at;
    for (let i = 0; i < 2000; i++) {
      t += step;
      const x = new Date(t), mins = x.getHours() * 60 + x.getMinutes();
      if (t <= after) continue;
      if (mins >= from && mins <= until) return t;
      if (mins > until) { x.setDate(x.getDate() + 1); x.setHours(Math.floor(from / 60), from % 60, 0, 0); if (x.getTime() > after) return x.getTime(); t = x.getTime() - step; }
    }
    return after + step;
  }
  const days = repeat === "days" && Array.isArray(r.days) && r.days.length ? r.days : null;
  const skip = () => (repeat === "weekdays" && (d.getDay() === 0 || d.getDay() === 6)) || (days && !days.includes(d.getDay()));
  do {
    d.setDate(d.getDate() + (repeat === "weekly" ? 7 : 1));
  } while (d.getTime() <= after || skip());
  return d.getTime();
}

/** The midnight after `t` (the next day's start), local time. */
function nextMidnight(t) {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
}

/**
 * A stretch of work from `start` to `end` (ms), cut at midnight: one piece per day,
 * [{ key, start, end, worked (s) }]. byDay: the seconds counted each day
 * ({ "2026-10-24": 600 }); without it (kept before it was counted) the work is
 * shared out by the clock.
 */
function piecesByDay(start, end, worked, byDay = null) {
  const out = [];
  for (let s = start; s < end;) { const e = Math.min(end, nextMidnight(s)); out.push({ key: dayKey(s), start: s, end: e, worked: 0 }); s = e; }
  if (!out.length) return out;
  if (out.length === 1) { out[0].worked = worked; return out; }
  if (byDay && out.some((p) => byDay[p.key] > 0)) for (const p of out) p.worked = Math.max(0, byDay[p.key] || 0);
  else {
    let left = worked;
    out.forEach((p, i) => { p.worked = i === out.length - 1 ? left : worked * ((p.end - p.start) / (end - start)); left -= p.worked; });
  }
  return out;
}

/** Midnight at the start of this week (Monday), local time. */
function weekStart(t) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

function createWork({ dir, now = Date.now }) {
  const file = (name) => path.join(dir, name);
  const read = (name, fallback) => {
    try { return JSON.parse(fs.readFileSync(file(name), "utf8")); } catch { return fallback; }
  };
  const write = (name, value) => {
    try {
      const tmp = file(name) + ".tmp";
      const text = JSON.stringify(value, null, 1);
      fs.writeFileSync(tmp, text);
      try {
        fs.renameSync(tmp, file(name));
      } catch {
        // Windows won't replace a file something else has open (often a virus
        // scanner, for a moment): write it in place instead.
        fs.writeFileSync(file(name), text);
        fs.rmSync(tmp, { force: true });
      }
    } catch (e) { console.error(name + ":", e.message); }
  };

  const saved = read("work.json", {});
  const days = saved.days && typeof saved.days === "object" ? saved.days : {};
  // This stretch of work: seconds worked, when it was last active, when to remind.
  // (The app was off a while: that was a break.)
  let stretch = saved.stretch?.last > 0 && now() - saved.stretch.last < AWAY * 1000 ? saved.stretch : null;
  const savedReminders = read("reminders.json", []);
  let reminders = Array.isArray(savedReminders) ? savedReminders : [];
  let last = now();
  let lockedSince = 0;
  let idleTail = 0;    // seconds counted while idle (> IDLE_NOT_WORK) at the end of the stretch
  let unsaved = 0;
  let name = typeof saved.name === "string" ? saved.name : "";
  let onBreak = saved.onBreak?.since > 0 ? saved.onBreak : null; // { since, until (or null), over, kind }
  // [{ id, kind: "work" | "break" | "away", start, end, name (work), worked (s, work), type (break) }]
  const newId = (t) => t.toString(36) + Math.random().toString(36).slice(2, 5);
  const log = (Array.isArray(saved.log) ? saved.log : []).map((e) => ({ id: e.id || newId(e.start), kind: e.kind || "work", ...e }));
  // Work is logged day by day: a stretch that went on past midnight is two entries, one for each day
  // (kept whole before 1.2.1: cut here, its work shared out by the clock; the day totals were right all along).
  const cutAtMidnight = (e) => {
    if (e.kind !== "work" || !(e.end > nextMidnight(e.start))) return [e];
    const parts = piecesByDay(e.start, e.end, e.worked ?? Math.round((e.end - e.start) / 1000));
    return parts.map((p, i) => {
      const x = { ...e, id: i ? newId(p.start) : e.id, start: p.start, end: p.end, worked: Math.round(p.worked) };
      if (i < parts.length - 1) delete x.early;
      return x;
    });
  };
  if (log.some((e) => e.kind === "work" && e.end > nextMidnight(e.start))) log.splice(0, log.length, ...log.flatMap(cutAtMidnight));
  let awaySince = 0; // when you left, while away without saying (see tick)
  const focus = saved.focus && typeof saved.focus === "object" ? saved.focus : {}; // { "2026-10-19": "Finish chapter 3" }
  const taskCat = saved.taskCat && typeof saved.taskCat === "object" ? saved.taskCat : {}; // { Thesis: "study" }
  let cat = typeof saved.cat === "string" ? saved.cat : "focus"; // what you're working on now: its category
  // Starting the day yourself (tick's waitStart): the day you started, and a day you said "not today".
  let startedDay = typeof saved.startedDay === "string" ? saved.startedDay : "";
  let offDay = typeof saved.offDay === "string" ? saved.offDay : "";
  // "收工": the day you ended (nothing counts until you carry on); the Pomodoro round going on (its work is marked 🍅).
  let doneDay = typeof saved.doneDay === "string" ? saved.doneDay : "";
  let roundNow = null;
  // Pomodoro rounds done, by day: { "2026-10-19": 5 }
  const rounds = saved.rounds && typeof saved.rounds === "object" ? saved.rounds : {};
  // The categories (categories.json): { work: [...], break: [...] }, each { id, emoji, label, zh, color, minutes }.
  const savedCats = read("categories.json", null);
  const cats = {
    work: Array.isArray(savedCats?.work) && savedCats.work.length ? savedCats.work : WORK_TYPES.map((c) => ({ ...c })),
    break: Array.isArray(savedCats?.break) && savedCats.break.length ? savedCats.break : BREAK_TYPES.map((c) => ({ ...c })),
  };
  const saveCats = () => write("categories.json", cats);
  // (saved before there were Pomodoro breaks: they're needed for "both together")
  if (!cats.break.some((b) => b.id === "pomodoro")) cats.break.splice(Math.max(0, cats.break.findIndex((b) => b.id === "other")), 0, BREAK_TYPES.find((b) => b.id === "pomodoro"));
  const breakType = (id) => (cats.break.some((b) => b.id === id) ? id : cats.break.some((b) => b.id === "other") ? "other" : cats.break[0].id);
  const workType = (id) => (cats.work.some((c) => c.id === id) ? id : cats.work[0].id);
  // A task with a name keeps the category it was last given (wherever you changed it).
  const catFor = (n, c) => workType((n && taskCat[n]) || c || cat);

  const saveWork = () => {
    const cutoff = dayKey(now() - KEEP_DAYS * 864e5);
    for (const k of Object.keys(days)) if (k < cutoff) delete days[k];
    const logFrom = now() - KEEP_LOG_DAYS * 864e5;
    while (log.length && log[0].end < logFrom) log.shift();
    write("work.json", { days, stretch, goalDay, name, cat, onBreak, log, focus, taskCat, startedDay, offDay, doneDay, rounds });
    unsaved = 0;
  };
  const newStretch = (t, breakEvery) => ({ worked: 0, byDay: {}, start: t, last: t, next: breakEvery ? breakEvery * 60 : null, name, cat, ...(roundNow ? { round: roundNow } : {}) });
  const saveReminders = () => write("reminders.json", reminders);

  function endStretch() {
    if (!stretch) return;
    // The idle minutes before we knew you'd gone weren't work (taken off the last day first: they may go back past midnight).
    const byDay = stretch.byDay ? { ...stretch.byDay } : null;
    if (idleTail) {
      if (byDay) {
        let rest = idleTail;
        for (const k of Object.keys(byDay).sort().reverse()) {
          const take = Math.min(rest, byDay[k]);
          byDay[k] -= take; days[k] = Math.max(0, (days[k] || 0) - take); rest -= take;
          if (rest <= 0) break;
        }
      } else {
        const k = dayKey(stretch.last);
        days[k] = Math.max(0, (days[k] || 0) - idleTail);
      }
    }
    const worked = stretch.worked - idleTail;
    if (worked >= LOG_FROM) {
      // (ends when you stopped, not when we noticed; past midnight, one entry for each day)
      const start = stretch.start || stretch.last - worked * 1000, end = stretch.last - idleTail * 1000;
      const parts = piecesByDay(start, Math.max(end, start + 1), worked, byDay).filter((p) => p.worked >= 0.5);
      parts.forEach((p, i) => {
        log.push({ id: newId(p.start), kind: "work", name: stretch.name || "", cat: catFor(stretch.name, stretch.cat), start: p.start, end: p.end, worked: Math.round(p.worked),
          ...(stretch.round ? { round: stretch.round } : {}), ...(stretch.early && i === parts.length - 1 ? { early: true } : {}) });
      });
    }
    stretch = null;
    idleTail = 0;
    saveWork();
  }

  /** The break you took is over: into the log. */
  function endBreakAt(t) {
    if (!onBreak) return;
    const type = breakType(onBreak.kind);
    log.push({ id: newId(onBreak.since), kind: "break", type, start: onBreak.since, end: t, ...(onBreak.pomo && type !== "pomodoro" ? { pomo: true } : {}) });
    onBreak = null;
  }

  /**
   * Every few seconds. idle: seconds since the last key or mouse movement;
   * locked: the screen is locked; breakEvery: minutes (0 = no reminders);
   * quiet: a focus timer is running. Returns what's due:
   * [{ type: "break", worked }, { type: "reminder", reminder }].
   * holdOver: a break that's over waits for its answer ("Back to work" / "5 more min"), however
   * busy the keyboard and mouse are; holdBreak: the break ends only when you say so (the next
   * Pomodoro round waits for "Back to work").
   */
  let goalDay = saved.goalDay || "";

  function tick({ idle = 0, locked = false, breakEvery = 0, quiet = false, goal = 0, eyeEvery = 0, askName = false, askAgain = ASK_AGAIN / 60, waitStart = false, count = true, force = false, holdOver = false, holdBreak = false } = {}) {
    const t = now(), dt = (t - last) / 1000;
    // force: a Pomodoro focus round is going on ("both together"): the whole round is work, at the keyboard or not.
    if (force) { idle = 0; locked = false; }
    last = t;
    const events = [];
    if (locked && !lockedSince) lockedSince = t;
    if (!locked) lockedSince = 0;
    // How long you've been away: idle, locked, or (a long gap between ticks) the Mac slept.
    const away = Math.max(idle, lockedSince ? (t - lockedSince) / 1000 : 0, dt > 60 ? dt : 0);
    const active = !locked && idle < AWAY && dt > 0 && dt <= 60;

    if (stretch && away >= AWAY) endStretch();
    // Waiting for you to start the day (waitStart): nothing counts yet, and time away
    // isn't noted. (Work going on past midnight carries on.)
    // (count: false is "Pomodoro only": the work clock doesn't count at all)
    // 收工 (doneDay): today is over until you carry on.
    const done = doneDay === dayKey(t);
    if ((!count || done) && stretch) endStretch();
    const waiting = done || (!count ? !onBreak : waitStart && startedDay !== dayKey(t) && !stretch && !onBreak);
    // Away without saying: noted from when you left; logged when you're back.
    if (!waiting && !onBreak && away >= AWAY && !awaySince) awaySince = t - away * 1000;
    if (waiting) awaySince = 0;
    // On a break you took: nothing counts, and a timed one says when it's over.
    else if (onBreak) {
      if (away >= BREAK_AWAY) onBreak.away = true;
      const atIt = active && idle < 10;
      if (onBreak.until && t >= onBreak.until && !onBreak.over && !(atIt && onBreak.away)) {
        onBreak.over = true;
        saveWork();
        events.push({ type: "break-over", took: t - onBreak.since });
      } else if (atIt && !holdBreak && !(holdOver && onBreak.over) && (onBreak.away || (onBreak.over && t - onBreak.until >= BACK_AFTER_OVER))) {
        events.push({ type: "back", took: t - onBreak.since, kind: onBreak.kind });
        endBreakAt(t);
        stretch = newStretch(t, breakEvery);
        saveWork();
      }
    } else if (active) {
      if (awaySince) {
        const took = t - awaySince;
        if (took <= AWAY_LONGEST) {
          const entry = { id: newId(awaySince), kind: "away", start: awaySince, end: t };
          log.push(entry);
          events.push({ type: "back-from-away", id: entry.id, took });
        }
        awaySince = 0;
        saveWork();
      }
      if (!stretch) stretch = newStretch(t, breakEvery);
      stretch.worked += dt;
      stretch.last = t;
      const k = dayKey(t);
      days[k] = (days[k] || 0) + dt;
      // (and this stretch's share of each day: past midnight it's logged as one entry per day)
      stretch.byDay = stretch.byDay || {};
      stretch.byDay[k] = (stretch.byDay[k] || 0) + dt;
      idleTail = idle > IDLE_NOT_WORK ? idleTail + dt : 0;
      if (++unsaved >= 6) saveWork();
      if (breakEvery && !quiet && stretch.next != null && stretch.worked >= stretch.next && idle < IDLE_NOT_WORK) {
        stretch.next = stretch.worked + Math.max(1, askAgain) * 60;
        events.push({ type: "break", worked: stretch.worked * 1000 });
      } else if (eyeEvery > 0 && !quiet && idle < IDLE_NOT_WORK && stretch.worked >= (stretch.eyeAt ?? eyeEvery * 60)) {
        stretch.eyeAt = stretch.worked + eyeEvery * 60;
        events.push({ type: "eye-rest" });
      } else if (askName && !quiet && !stretch.name && !stretch.asked && stretch.worked >= ASK_NAME_AFTER && idle < IDLE_NOT_WORK) {
        stretch.asked = true;
        events.push({ type: "name-ask", recent: recentNames() });
      }
    }

    // The daily goal, once a day.
    const today = dayKey(t);
    if (goal > 0 && goalDay !== today && (days[today] || 0) >= goal * 3600) {
      goalDay = today;
      saveWork();
      events.push({ type: "goal", hours: goal, worked: Math.round(days[today] * 1000) });
    }

    let changed = false;
    for (const r of reminders) {
      if (!r.fired && r.at <= t) {
        changed = true;
        events.push({ type: "reminder", reminder: { ...r, late: t - r.at > 5 * 60e3 } });
        if (REPEATS.includes(r.repeat)) r.at = nextTime(r.at, r.repeat, t, r); // on to the next one
        else r.fired = t;
      }
    }
    const before = reminders.length;
    reminders = reminders.filter((r) => !r.fired || t - r.fired < KEEP_DONE);
    if (changed || reminders.length !== before) saveReminders();
    return events;
  }

  /**
   * The log between two times (ms), with what's going on now at the end
   * (open: true): { entries, days: { "2026-10-15": seconds worked }, breakTypes }.
   */
  function history(from, to = now()) {
    const t = now();
    // (an entry that ended at midnight belongs to the day before)
    const entries = log.filter((e) => (e.end > from || e.start >= from) && e.start <= to).map((e) => ({ ...e }));
    if (t >= from) {
      if (stretch && stretch.worked >= 1) {
        // Going on since before midnight: the part before it is that day's ("now-<day>"), the rest is today's.
        const parts = piecesByDay(Math.min(stretch.start || t, t), t, stretch.worked, stretch.byDay);
        if (!parts.length) parts.push({ key: dayKey(t), start: t, end: t, worked: stretch.worked });
        parts.forEach((p, i) => {
          const last = i === parts.length - 1;
          if (p.start > to || (p.end <= from && p.start < from) || (!last && p.worked < 1)) return;
          entries.push({ id: last ? "now" : "now-" + p.key, kind: "work", name: stretch.name || "", cat: catFor(stretch.name, stretch.cat), start: p.start, end: p.end,
            worked: Math.round(p.worked), ...(last ? { open: true } : { goingOn: true }), ...(stretch.round ? { round: stretch.round } : {}) });
        });
      }
      if (onBreak) entries.push({ id: "now", kind: "break", type: breakType(onBreak.kind), start: onBreak.since, end: t, open: true, ...(onBreak.pomo && breakType(onBreak.kind) !== "pomodoro" ? { pomo: true } : {}) });
      if (awaySince) entries.push({ id: "now", kind: "away", start: awaySince, end: t, open: true });
    }
    const dayList = {};
    for (const [k, v] of Object.entries(days)) {
      const [y, m, d] = k.split("-").map(Number), at = new Date(y, m - 1, d).getTime();
      if (at + 864e5 > from && at <= to) dayList[k] = v;
    }
    const focusList = {};
    for (const [k, v] of Object.entries(focus)) {
      const [y, m, d] = k.split("-").map(Number), at = new Date(y, m - 1, d).getTime();
      if (at + 864e5 > from && at <= to) focusList[k] = v;
    }
    const roundList = {};
    for (const [k, v] of Object.entries(rounds)) {
      const [y, m, d] = k.split("-").map(Number), at = new Date(y, m - 1, d).getTime();
      if (at + 864e5 > from && at <= to) roundList[k] = v;
    }
    return { entries, days: dayList, breakTypes: cats.break, workTypes: cats.work, focus: focusList, rounds: roundList };
  }

  /** What you've worked on lately, newest first (for "Switch to" and the name field). */
  function recentNames(n = 6) {
    const names = [];
    for (let i = log.length - 1; i >= 0 && names.length < n; i--) {
      const x = log[i].kind === "work" && log[i].name;
      if (x && !names.includes(x) && x !== (stretch?.name || name)) names.push(x);
    }
    return names;
  }

  function status() {
    const t = now(), today = dayKey(t), ws = weekStart(t);
    let week = 0;
    for (const [k, s] of Object.entries(days)) {
      const [y, m, d] = k.split("-").map(Number);
      if (new Date(y, m - 1, d).getTime() >= ws) week += s;
    }
    const recent = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(t);
      d.setHours(12, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const k = dayKey(d.getTime());
      recent.push({ day: k, ms: Math.round((days[k] || 0) * 1000) });
    }
    const dayStart = new Date(t).setHours(0, 0, 0, 0);
    // Today: work by name, breaks by kind, time away (what's going on now last), times in ms.
    const sessions = history(dayStart, t).entries.map((x) => ({ ...x, worked: x.kind === "work" ? x.worked * 1000 : x.end - x.start }));
    return {
      stretch: stretch ? Math.round(stretch.worked * 1000) : 0,
      name: stretch ? stretch.name || "" : name,
      onBreak: onBreak ? { ...onBreak, kind: breakType(onBreak.kind) } : null,
      breakTypes: cats.break,
      workTypes: cats.work,
      cat: workType(stretch?.cat || cat),
      taskCat: { ...taskCat },
      focus: focus[today] || "",
      started: startedDay === today || !!stretch || !!onBreak, // (with waitStart: has today's work started?)
      rounds: rounds[today] || 0, // Pomodoro rounds done today
      offToday: offDay === today,
      doneToday: doneDay === today, // 收工
      recentNames: recentNames(),
      sessions,
      nextBreak: stretch?.next != null ? Math.round(stretch.next * 1000) : null,
      today: Math.round((days[today] || 0) * 1000),
      measuredAt: last, // (when today and the stretch were last counted: windows count on from here, not from when this arrived)
      week: Math.round(week * 1000),
      recent,
      reminders: reminders.slice().sort((a, b) => a.at - b.at),
    };
  }

  // ---- fixing the log afterwards (the day totals follow) ----

  /** Seconds of work an entry adds to its day. */
  const workSecs = (e) => (e.kind === "work" ? (e.worked ?? Math.round((e.end - e.start) / 1000)) : 0);
  const addDay = (e, sign) => { const s = workSecs(e); if (!s) return; const k = dayKey(e.start); days[k] = Math.max(0, (days[k] || 0) + sign * s); };
  const findEntry = (id) => log.find((x) => x.id === id);
  const remember = (n, c) => { if (n && c) taskCat[n] = c; };

  /**
   * Change an entry: { name, cat (work), type (break), note, start, end (ms) }.
   * Changing the times of work changes how much it counts.
   */
  // A 🍅 break in the log stands for the round before it: taking one out (deleted, or made another
  // kind of break) takes that round off the day's count, and putting one in adds it.
  const tomato = (e) => e.kind === "break" && e.type === "pomodoro";
  function countTomato(e, sign) {
    if (!tomato(e)) return;
    const k = dayKey(e.start);
    rounds[k] = Math.max(0, (rounds[k] || 0) + sign);
    if (!rounds[k]) delete rounds[k];
  }

  function editEntry(id, ch = {}) {
    const e = findEntry(id);
    if (!e) return false;
    countTomato(e, -1);
    addDay(e, -1);
    if (ch.start != null || ch.end != null) {
      const s = Number(ch.start ?? e.start), en = Number(ch.end ?? e.end);
      if (!(en > s)) { addDay(e, 1); countTomato(e, 1); return false; }
      if (e.kind === "work") e.worked = Math.round((en - s) / 1000);
      e.start = s; e.end = en;
    }
    if (typeof ch.name === "string" && e.kind === "work") {
      e.name = ch.name.trim().slice(0, 60);
      if (ch.cat == null && taskCat[e.name]) e.cat = taskCat[e.name]; // a task you've had before keeps its category
    }
    if (ch.cat != null && e.kind === "work") {
      e.cat = workType(ch.cat);
      remember(e.name, e.cat);
      // The same task's other stretches that day go with it (same name, same colour).
      if (e.name) for (const x of log) if (x !== e && x.kind === "work" && x.name === e.name && dayKey(x.start) === dayKey(e.start)) x.cat = e.cat;
      // The task you're on now: what comes next is logged under the new category too.
      if (e.name && e.name === name) { cat = e.cat; if (stretch) stretch.cat = cat; }
    }
    if (ch.type != null && e.kind === "break") e.type = breakType(ch.type);
    if (typeof ch.note === "string") { if (ch.note.trim()) e.note = ch.note.trim().slice(0, 200); else delete e.note; }
    addDay(e, 1);
    countTomato(e, 1);
    log.sort((a, b) => a.start - b.start);
    saveWork();
    return true;
  }

  /** Work into a break, or a break (or time away) into work. */
  function convertEntry(id, kind, opts = {}) {
    const e = findEntry(id);
    if (!e || !["work", "break"].includes(kind)) return false;
    countTomato(e, -1);
    addDay(e, -1);
    if (kind === "work") {
      const n = typeof opts.name === "string" ? opts.name : e.name || name;
      Object.assign(e, { kind: "work", name: n, cat: workType(opts.cat || taskCat[n] || cat), worked: Math.round((e.end - e.start) / 1000) });
      delete e.type;
      remember(e.name, e.cat);
    } else {
      Object.assign(e, { kind: "break", type: breakType(opts.type || "coffee") });
      delete e.worked; delete e.name; delete e.cat;
    }
    if (opts.fromAway) e.fromAway = true;
    addDay(e, 1);
    countTomato(e, 1);
    saveWork();
    return true;
  }

  /** An event's own fields (Apple Calendar): start, end (ms), all day, its calendar, minutes before. */
  function eventFields(o) {
    const start = Number(o.start), end = Math.max(Number(o.end) || 0, start);
    return { kind: "event", start, end, allDay: !!o.allDay, cal: o.cal ? String(o.cal) : null, before: Math.max(0, Math.min(240, Number(o.before) || 0)), ...(o.calOn != null ? { calOn: !!o.calOn } : {}),
      // local: kept in the app only (added without a calendar, or "this app only"): never sent to a calendar
      ...(o.local ? { local: true } : {}) };
  }

  return {
    tick,
    status,
    history,
    editEntry,
    convertEntry,
    /** Time you forgot to log: { kind: "work" | "break", name, cat, type, note, start, end }. */
    addEntry(x = {}) {
      const s = Number(x.start), en = Number(x.end);
      if (!(en > s) || !["work", "break"].includes(x.kind)) return null;
      const e = { id: newId(s), kind: x.kind, start: s, end: en, added: true };
      if (x.kind === "work") { e.name = String(x.name || "").trim().slice(0, 60); e.cat = workType(x.cat || taskCat[e.name] || cat); e.worked = Math.round((en - s) / 1000); remember(e.name, e.cat); }
      else e.type = breakType(x.type);
      if (x.note) e.note = String(x.note).slice(0, 200);
      const parts = cutAtMidnight(e);
      for (const p of parts) { log.push(p); addDay(p, 1); }
      log.sort((a, b) => a.start - b.start);
      countTomato(e, 1);
      saveWork();
      return { ...parts[0] };
    },
    deleteEntry(id) {
      const i = log.findIndex((x) => x.id === id);
      if (i < 0) return false;
      addDay(log[i], -1);
      countTomato(log[i], -1);
      log.splice(i, 1);
      saveWork();
      return true;
    },
    /** The category of what you're working on now (and of that task from now on). */
    setCategory(id) {
      cat = workType(id);
      if (stretch) stretch.cat = cat;
      remember(stretch?.name || name, cat);
      saveWork();
    },
    /** A Pomodoro focus round done (today's count). */
    addRound() {
      const k = dayKey(now());
      rounds[k] = (rounds[k] || 0) + 1;
      saveWork();
      return rounds[k];
    },
    /** Start today's work (waitStart): the clock counts from now. */
    startDay() {
      startedDay = dayKey(now());
      offDay = "";
      doneDay = "";
      saveWork();
    },
    /** 收工: what's going on now goes into the log (the task so far, a round so far, a break), and nothing counts until you carry on (startDay). */
    endDay() {
      if (stretch && roundNow) stretch.early = true;
      endStretch();
      if (onBreak) endBreakAt(now());
      roundNow = null;
      doneDay = dayKey(now());
      saveWork();
    },
    /** A Pomodoro round starts (n: today's count, 1, 2…; its work is marked 🍅 n), or ends (null; early: before its time was up). */
    setRound(n, { early = false } = {}) {
      if (n == null && stretch && roundNow && early) stretch.early = true;
      if (n == null || stretch?.round !== n) endStretch();
      roundNow = n == null ? null : Number(n) || null;
    },
    /** "Not today": no asking again, nothing counted, until you start it after all. */
    skipDay() {
      offDay = dayKey(now());
      saveWork();
    },
    /** Today's focus (or another day's: "2026-10-19"). */
    setFocus(text, day = dayKey(now())) {
      const t = String(text || "").trim().slice(0, 120);
      if (t) focus[day] = t; else delete focus[day];
      saveWork();
    },
    /** The categories: kind "work" | "break", a list of { id, emoji, label, zh, color, minutes }. */
    categories() { return { work: cats.work.map((c) => ({ ...c })), break: cats.break.map((c) => ({ ...c })) }; },
    saveCategory(kind, c = {}) {
      const list = cats[kind];
      if (!list) return null;
      const id = c.id && list.some((x) => x.id === c.id) ? c.id : "c" + now().toString(36) + Math.random().toString(36).slice(2, 4);
      const old = list.find((x) => x.id === id) || {};
      const next = { ...old, id, emoji: String(c.emoji ?? old.emoji ?? (kind === "work" ? "⭐" : "🌸")).slice(0, 8),
        label: String(c.label ?? old.label ?? "").slice(0, 40), zh: String(c.zh ?? old.zh ?? c.label ?? old.label ?? "").slice(0, 40),
        color: /^#[0-9a-f]{6}$/i.test(c.color || "") ? c.color : old.color || (kind === "work" ? "#8fc9a3" : "#f2b0c4") };
      if (kind === "break") next.minutes = Math.max(0, Math.min(240, Number(c.minutes ?? old.minutes ?? 10)));
      if (old.id) Object.assign(old, next); else list.push(next);
      saveCats();
      return { ...next };
    },
    /** Remove a category: its time moves to the first one in the list. */
    removeCategory(kind, id) {
      const list = cats[kind];
      if (!list || list.length <= 1 || !list.some((x) => x.id === id)) return false;
      cats[kind] = list.filter((x) => x.id !== id);
      const to = cats[kind][0].id;
      for (const e of log) {
        if (kind === "work" && e.kind === "work" && e.cat === id) e.cat = to;
        if (kind === "break" && e.kind === "break" && e.type === id) e.type = to;
      }
      for (const [k, v] of Object.entries(taskCat)) if (v === id) taskCat[k] = to;
      if (kind === "work" && cat === id) cat = to;
      saveCats();
      saveWork();
      return true;
    },
    /** "In 10 min" on a break reminder. */
    snoozeBreak() { if (stretch) stretch.next = stretch.worked + ASK_AGAIN; },
    /** "Taking one", or a focus timer's break: the next stretch starts from zero. */
    takeBreak() { idleTail = 0; if (stretch) { endStretch(); } },
    /** "Take a break" (minutes, or 0 for until you're back): this stretch ends and nothing counts. */
    startBreak(minutes = 0, kind = null) {
      endStretch();
      const t = now();
      // Another kind of break: the one you were on goes into the log first.
      if (onBreak && kind && breakType(kind) !== onBreak.kind) endBreakAt(t);
      // "5 more min" keeps the kind of break it was.
      onBreak = { since: onBreak?.since || t, until: minutes > 0 ? t + minutes * 60e3 : null, over: false,
        kind: breakType(kind || onBreak?.kind), ...(onBreak?.pomo || kind === "pomodoro" ? { pomo: true } : {}) };
      saveWork();
    },
    /**
     * The break you're on, changed: what it is (kind) and how long it is altogether (minutes from when it began; 0: until
     * you're back). Still one break: it goes into the log as one entry of the kind it ends up as.
     */
    setBreak({ kind = null, minutes = null } = {}) {
      if (!onBreak) return null;
      if (kind) onBreak.kind = breakType(kind);
      if (minutes != null) { const m = Math.max(0, Math.min(240, Number(minutes) || 0)); onBreak.until = m ? onBreak.since + m * 60e3 : null; onBreak.over = false; }
      saveWork();
      return { ...onBreak };
    },
    /** Back from the break: a new stretch starts now (with the same name, until you change it). */
    endBreak({ breakEvery = 0 } = {}) {
      if (!onBreak) return;
      endBreakAt(now());
      stretch = newStretch(now(), breakEvery);
      saveWork();
    },
    /** What you're working on now ("" for nothing in particular); the next stretches keep it. */
    setName(text) {
      const next = String(text || "").trim().slice(0, 60);
      // Switching task: the old one is saved up to now, the new one starts from zero
      // (a stretch under a minute just takes the new name: a typo, a quick change).
      // Time with no name yet just gets the name: that's what you were doing.
      if (stretch && stretch.name && stretch.name !== next && stretch.worked - idleTail >= LOG_FROM) {
        const was = stretch;
        endStretch();
        stretch = { ...newStretch(now(), 0), next: was.next != null ? Math.max(60, was.next - was.worked) : null };
      }
      name = next;
      if (next) startedDay = dayKey(now()); // naming what you're doing starts the day, too
      if (taskCat[name]) cat = taskCat[name]; // a task you've had before keeps its category
      if (stretch) { stretch.name = name; stretch.cat = cat; }
      remember(name, cat);
      saveWork();
    },
    /**
     * Time away, labelled afterwards: a kind of break, or "work" (you were
     * reading, thinking: it counts, under what you're working on).
     */
    labelAway(id, type, opts = {}) {
      const e = log.find((x) => x.id === id && (x.kind === "away" || x.fromAway));
      if (!e) return false;
      // "work": on what you're doing now, or on opts.name (an earlier task, or a new one).
      return type === "work" ? convertEntry(id, "work", { name: opts.name ?? name, cat: opts.cat, fromAway: true })
        : convertEntry(id, "break", { type, fromAway: true });
    },
    /** A new reminder interval: never fires straight away. */
    setBreakEvery(minutes) {
      if (stretch) stretch.next = minutes ? Math.max(minutes * 60, stretch.worked + 60) : null;
    },
    addReminder(opts = {}) {
      let { text, at, repeat = null, word = null } = opts;
      // An event (Apple Calendar): it rings `before` minutes before it starts (now, if that's already past).
      const isEvent = opts.kind === "event";
      if (isEvent) {
        const start = Number(opts.start);
        if (!Number.isFinite(start) || start < now() - 60e3) throw new Error("An event needs a start from now on.");
        at = Math.max(start - Math.max(0, Number(opts.before) || 0) * 60e3, now());
      }
      text = String(text || "").trim().slice(0, 200);
      at = Number(at);
      if (!text || !Number.isFinite(at) || at < now() - 60e3) throw new Error("A reminder needs something to do and a time from now on.");
      const r = { id: `${now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, text, at: Math.round(at), made: now() };
      if (REPEATS.includes(repeat)) r.repeat = repeat;
      if (repeat === "days") r.days = (Array.isArray(opts.days) ? opts.days : [1, 2, 3, 4, 5]).map(Number).filter((d) => d >= 0 && d <= 6);
      if (repeat === "every") Object.assign(r, { every: Math.max(1, Number(opts.every) || 60), from: String(opts.from || "00:00"), until: String(opts.until || "23:59") });
      if (word?.th) r.word = { th: String(word.th), rom: String(word.rom || ""), en: String(word.en || "") };
      if (opts.apple) r.apple = true; // (in step with Apple Reminders: apple-sync.js)
      if (opts.appleList) r.appleList = String(opts.appleList); // where it goes in Apple Reminders ("app": not there)
      if (isEvent) Object.assign(r, eventFields(opts));
      reminders.push(r);
      saveReminders();
      return { ...r };
    },
    /** Change a reminder: { text, at, repeat, days, every, from, until }. */
    editReminder(id, ch = {}) {
      const r = reminders.find((x) => x.id === id);
      if (!r) return null;
      if (typeof ch.text === "string" && ch.text.trim()) r.text = ch.text.trim().slice(0, 200);
      if ("apple" in ch) { if (ch.apple) r.apple = true; else delete r.apple; }
      if (r.kind === "event") {
        Object.assign(r, eventFields({ ...r, ...ch }));
        if (ch.start != null || ch.before != null) { r.at = Math.max(r.start - (r.before || 0) * 60e3, now()); delete r.fired; }
      }
      if (Number.isFinite(Number(ch.at)) && ch.at != null) { r.at = Math.round(Number(ch.at)); delete r.fired; }
      if ("repeat" in ch) {
        delete r.repeat; delete r.days; delete r.every; delete r.from; delete r.until;
        if (REPEATS.includes(ch.repeat)) {
          r.repeat = ch.repeat;
          if (ch.repeat === "days") r.days = (ch.days || [1, 2, 3, 4, 5]).map(Number);
          if (ch.repeat === "every") Object.assign(r, { every: Math.max(1, Number(ch.every) || 60), from: String(ch.from || "00:00"), until: String(ch.until || "23:59") });
        }
      }
      saveReminders();
      return { ...r };
    },
    removeReminder(id) {
      reminders = reminders.filter((r) => r.id !== id);
      saveReminders();
    },
    /** Done: a one-off reminder goes; a repeating one is already on to its next time. */
    doneReminder(id) {
      const r = reminders.find((x) => x.id === id);
      if (r && !r.repeat) { reminders = reminders.filter((x) => x !== r); saveReminders(); }
    },
    snoozeReminder(id, ms = ASK_AGAIN * 1000) {
      const r = reminders.find((x) => x.id === id);
      if (!r) return;
      if (r.repeat) {
        // The series keeps its times: this one comes back as a one-off.
        reminders.push({ id: r.id + "-again-" + now().toString(36), text: r.text, at: now() + ms, made: now() });
      } else {
        r.at = now() + ms;
        delete r.fired;
      }
      saveReminders();
    },
    save: saveWork,
  };
}

module.exports = { createWork, dayKey, weekStart, nextTime, AWAY, BREAK_TYPES, WORK_TYPES };

return module.exports;
})();
