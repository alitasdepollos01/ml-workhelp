// Adding a reminder or an event: one card. ⏰ Reminder / 📅 Event; what it is; then chips: when, how often,
// where it goes (picked by hand: guessing the time from the words got it wrong too often, so readWhen is
// kept but no longer used here). The button says what it adds. An event needs no calendar: without one
// it stays in the app ("local") and still reminds you.

import { L, th, el, work, state, clock, parseClock, toast, deco } from "./app-common.js";
import { relatedWord } from "./related.js";

const DAY = 864e5;
const pad = (n) => String(n).padStart(2, "0");
const dayOf = (t) => new Date(t).setHours(0, 0, 0, 0);
const dateValue = (t) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const WEEK = { 日: 0, 天: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

// The form as you left it (kept through redraws; a fresh one after adding).
const fresh = () => ({ kind: "reminder", text: "", when: "30m", at: null, rep: "", more: null, put: null, evDay: "today", evDate: null, from: null, to: null, allDay: false, before: null, evRep: "", evPut: null, auto: "" });
let F = fresh();
export const setAddKind = (k) => { F.kind = k; };

/** What the words say about when: { rest, kind?, in?, at?, day?, from?, to?, allDay?, rep? } (the rest: the words left for its name). */
export function readWhen(text, now = Date.now()) {
  let t = ` ${text} `;
  const out = {};
  const take = (re, f) => { const m = t.match(re); if (m) { f(m); t = t.replace(m[0], " "); return true; } return false; };
  const hm = (h, m, pm) => { let H = Number(h); if (pm && /p/i.test(pm) && H < 12) H += 12; if (pm && /a/i.test(pm) && H === 12) H = 0; return H * 60 + Number(m || 0); };
  take(/每天|每日|every ?day|daily|ทุกวัน(?!ธรรมดา)/i, () => (out.rep = "daily"));
  take(/平日|weekdays?|(?:ทุก)?วันธรรมดา|จันทร์ถึงศุกร์/i, () => (out.rep = "weekdays"));
  take(/每週|每星期|every ?week|weekly|ทุกสัปดาห์|ทุกอาทิตย์/i, () => (out.rep = "weekly"));
  // A time range: an event.
  take(/(\d{1,2})(?:[:：](\d{2}))?\s*(am|pm)?\s*(?:-|–|~|到|至|to|ถึง)\s*(\d{1,2})(?:[:：](\d{2}))?\s*(am|pm)?/i, (m) => { out.kind = "event"; out.from = hm(m[1], m[2], m[3] || m[6]); out.to = hm(m[4], m[5], m[6]); });
  take(/全天|all[- ]?day|ทั้งวัน/i, () => { out.kind = "event"; out.allDay = true; });
  take(/(?:\bin\s+|อีก\s*)?(\d+)\s*(分鐘|分|min(?:ute)?s?|นาที)(?:後|ข้างหน้า)?/i, (m) => (out.in = Number(m[1])));
  take(/(?:\bin\s+(?:an?\s+)?|อีก\s*)?(\d+(?:\.\d)?)\s*(小時|個小時|ชั่วโมง|ชม\.?|h(?:ou)?rs?\b|h\b)(?:後|ข้างหน้า)?/i, (m) => (out.in = Math.round(Number(m[1]) * 60)));
  take(/(?:in\s+|อีก\s*)?(\d+)\s*(?:days?|天|วัน)(?:後|ข้างหน้า)/i, (m) => (out.day = dayOf(now) + Number(m[1]) * DAY));
  take(/明天|tomorrow|พรุ่งนี้/i, () => (out.day = dayOf(now) + DAY));
  take(/後天|มะรืน(?:นี้)?/, () => (out.day = dayOf(now) + 2 * DAY));
  take(/今天|today|วันนี้/i, () => (out.day = dayOf(now)));
  take(/今晚|tonight|คืนนี้/i, () => { out.day = dayOf(now); if (out.at == null && out.from == null) out.at = 20 * 60; });
  take(/(?:วัน)?(จันทร์|อังคาร|พุธ|พฤหัส(?:บดี)?|ศุกร์|เสาร์|อาทิตย์)(?:หน้า)?/, (m) => {
    const wd = { จันทร์: 1, อังคาร: 2, พุธ: 3, พฤหัส: 4, พฤหัสบดี: 4, ศุกร์: 5, เสาร์: 6, อาทิตย์: 0 }[m[1]], d = new Date(dayOf(now));
    let add = (wd - d.getDay() + 7) % 7; if (!add) add = 7;
    out.day = dayOf(now) + add * DAY;
  });
  take(/(?:週|星期|禮拜)([一二三四五六日天])|\b(sun|mon|tue|wed|thu|fri|sat)[a-z]*\b/i, (m) => {
    const wd = WEEK[(m[1] || m[2]).toLowerCase()], d = new Date(dayOf(now));
    let add = (wd - d.getDay() + 7) % 7; if (!add) add = 7;
    out.day = dayOf(now) + add * DAY;
  });
  take(/(\d{1,2})[/／月](\d{1,2})日?/, (m) => { const d = new Date(now); let x = new Date(d.getFullYear(), Number(m[1]) - 1, Number(m[2])).getTime(); if (x < dayOf(now)) x = new Date(d.getFullYear() + 1, Number(m[1]) - 1, Number(m[2])).getTime(); out.day = x; });
  if (out.from == null) take(/บ่าย\s*(\d{1,2})(?:\s*โมง)?(ครึ่ง)?|(\d{1,2})\s*ทุ่ม(ครึ่ง)?|(\d{1,2})\s*โมง(เช้า|เย็น)?(ครึ่ง)?|เที่ยง(?:คืน)?/, (m) => {
    if (m[1]) out.at = (12 + Number(m[1]) % 12) * 60 + (m[2] ? 30 : 0);
    else if (m[3]) out.at = (18 + Number(m[3])) % 24 * 60 + (m[4] ? 30 : 0);
    else if (m[5]) { let h = Number(m[5]); if (m[6] === "เย็น" && h < 12) h += 12; out.at = h * 60 + (m[7] ? 30 : 0); }
    else out.at = m[0] === "เที่ยงคืน" ? 0 : 12 * 60;
  });
  if (out.from == null && out.at == null) take(/(?:\bat\s+|ตอน\s*|เวลา\s*)?(早上|上午|中午|下午|傍晚|晚上)?\s*(?:(\d{1,2})[:：](\d{2})\s*(am|pm)?|(\d{1,2})\s*(am|pm)|(\d{1,2})\s*點(半)?)/i, (m) => {
    let at = m[2] ? hm(m[2], m[3], m[4]) : m[5] ? hm(m[5], 0, m[6]) : Number(m[7]) * 60 + (m[8] ? 30 : 0);
    if (m[1] && /下午|傍晚|晚上/.test(m[1]) && at < 12 * 60) at += 12 * 60; // (下午 3 點: 15:00)
    if (m[1] === "中午" && at < 11 * 60) at += 12 * 60;
    out.at = at;
  });
  out.rest = t.replace(/\s+/g, " ").replace(/^[\s,，、]+|[\s,，、]+$/g, "").trim();
  return out;
}

const WHEN = () => [["15m", L("In 15 min", "15 分鐘後"), 15], ["30m", L("In 30 min", "30 分鐘後"), 30], ["1h", L("In 1 hour", "1 小時後"), 60], ["tonight", L("Tonight 20:00", "今晚 20:00")], ["morning", L("Tomorrow 9:00", "明天早上 9:00")], ["pick", L("Pick a time…", "選時間⋯")]];
const REPEAT = () => [["", L("Once", "一次")], ["daily", L("Every day", "每天")], ["weekdays", L("Weekdays", "平日")], ["weekly", L("Every week", "每週")]];
const BEFORE = () => [[0, L("When it starts", "開始時")], [5, L("5 min before", "5 分鐘前")], [10, L("10 min before", "10 分鐘前")], [30, L("30 min before", "30 分鐘前")], [60, L("1 hour before", "1 小時前")]];

/** When a reminder rings (ms), from the form. */
function reminderAt() {
  const now = Date.now();
  const w = WHEN().find((x) => x[0] === F.when);
  if (w?.[2]) return now + w[2] * 60e3;
  if (F.when === "tonight") { const t = new Date(now).setHours(20, 0, 0, 0); return t > now ? t : t + DAY; }
  if (F.when === "morning") return dayOf(now) + DAY + 9 * 3600e3;
  if (F.when === "in") return now + (F.inMin || 30) * 60e3;
  return F.at; // (picked: a date and a time)
}
/** An event's start and end (ms), from the form. */
function eventSpan() {
  const day = F.evDay === "today" ? dayOf(Date.now()) : F.evDay === "tomorrow" ? dayOf(Date.now()) + DAY : F.evDate;
  if (day == null) return null;
  if (F.allDay) return { start: day, end: day + DAY, day };
  const from = F.from ?? defaultFrom(), to = F.to ?? from + 60;
  return { start: day + from * 60e3, end: day + Math.max(to, from + 5) * 60e3, day };
}
const defaultFrom = () => { const d = new Date(Math.ceil((Date.now() + 30 * 60e3) / 1800e3) * 1800e3); return d.getHours() * 60 + d.getMinutes(); };
const hhmm = (m) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
const dayWord = (t) => { const n = Math.round((dayOf(t) - dayOf(Date.now())) / DAY); return n === 0 ? L("today", "今天") : n === 1 ? L("tomorrow", "明天") : new Date(t).toLocaleDateString(L("en-GB", "zh-TW"), { weekday: "short", month: "numeric", day: "numeric" }); };
function until(ms) {
  const m = Math.round((ms - Date.now()) / 60e3);
  if (m < 60) return L(`in ${m} min`, `${m} 分鐘後`);
  if (m < 24 * 60) return L(`in ${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`, `${Math.floor(m / 60)} 小時${m % 60 ? ` ${m % 60} 分鐘` : ""}後`);
  return dayWord(ms);
}

/**
 * The card. links: Apple Reminders and Calendar (connect.js' known()); more: the repeat picker for "more…"
 * (certain days, every so often), from tab-reminders. ask: the menu's ("in 15 min", "at a time", a new one).
 */
export function addCard({ links, redraw, decks, more, ask }) {
  if (ask?.in) { F.kind = "reminder"; F.when = ["15m", "30m", "1h"].find((k) => WHEN().find((w) => w[0] === k)[2] === ask.in) || "in"; F.inMin = ask.in; }
  if (ask?.at) { F.kind = "reminder"; F.when = "pick"; }
  if (ask?.event) F.kind = "event";
  const appleOn = links.apple?.access === "full" && links.apple?.on, calOn = links.calendar?.access === "full" && links.calendar?.on;
  const cals = calOn ? (links.calendar.calendars || []).filter((c) => c.writable !== false) : [];
  if (F.put == null || (F.put !== "app" && !(links.apple?.lists || []).some((l) => l.id === F.put))) F.put = appleOn && links.apple.into ? links.apple.into : "app";
  if (F.evPut == null || (F.evPut !== "app" && !cals.some((c) => c.id === F.evPut))) F.evPut = calOn && links.calendar.into && cals.some((c) => c.id === links.calendar.into) ? links.calendar.into : "app";
  if (F.before == null) F.before = links.calendar?.before ?? 10;
  const ev = F.kind === "event";
  const card = el("section", { className: "card add-card add2" });
  { const d = deco(F.kind === "event" ? "app-rem-event" : "app-rem-add", "right add-deco"); if (d) { card.classList.add("has-deco"); card.append(d); } } // (bottom right; the rows keep clear)
  const chip = (label, on, fn, extra = "") => { const b = el("button", { type: "button", className: "chip" + (on ? " on" : "") + extra, textContent: label, "aria-pressed": String(!!on) }); b.addEventListener("click", fn); return b; };
  const row = (label, ...kids) => el("div", { className: "add-row" }, el("span", { className: "lbl", textContent: label }), el("div", { className: "chips" }, ...kids));
  const set = (ch) => { Object.assign(F, ch); redraw(); };

  // ⏰ / 📅
  const kinds = el("div", { className: "seg", role: "radiogroup", "aria-label": L("A reminder or an event", "提醒或活動") }, [["reminder", L("Reminder", "提醒")], ["event", L("Event", "活動")]].map(([k, t]) => {
    const b = el("button", { type: "button", className: F.kind === k ? "on" : "", role: "radio", "aria-checked": String(F.kind === k), textContent: t });
    b.addEventListener("click", () => set({ kind: k }));
    return b;
  }));
  card.append(el("div", { className: "spread" }, kinds, el("span", { className: "muted", textContent: ev ? L("Something with a start and an end: a meeting, a fan meeting, a birthday", "有開始和結束的事：會議、見面會、生日") : L("A nudge at a time: stretch, call someone, drink water", "時間到叫你一聲：伸展、打電話、喝水") })));

  // What it is (and when, if you type it).
  const what = el("input", { type: "text", id: "what", className: "what", maxLength: 200, value: F.text, autocomplete: "off",
    placeholder: ev ? L("e.g. Fan meeting", "例如：見面會") : L("e.g. Stretch, call the bank", "例如：伸展、打給銀行"), "aria-label": ev ? L("Event", "活動") : L("What to do", "要做什麼") });
  const word = el("p", { className: "muted word" });
  const sayWord = () => {
    const w = state.st?.thai !== false && F.text.trim() && decks?.length ? relatedWord(decks, F.text.trim(), "reminder") : null;
    word.replaceChildren(...(w ? (th ? [L("In Thai: ", "泰文："), el("b", { lang: "en", textContent: w.en }), ` (${w.th})`] // (in Thai: its English)
      : [L("In Thai: ", "泰文："), el("b", { lang: "th", textContent: w.th }), ` ${w.rom ? w.rom + " · " : ""}${w.en}`]) : []));
  };
  let typing = 0;
  what.addEventListener("input", () => {
    F.text = what.value;
    clearTimeout(typing);
    typing = setTimeout(sayWord, 500); // (the Thai word that goes with it)
  });
  card.append(what);

  const err = el("p", { className: "error", role: "alert", hidden: true });
  const add = el("button", { type: "button", className: "btn primary add-btn" });
  if (!ev) {
    // ⏰ when, how often, where
    const pick = F.when === "pick";
    card.append(row(L("When", "什麼時候"), ...WHEN().map(([k, t]) => chip(t, F.when === k, () => set({ when: k, at: k === "pick" ? (F.at ?? Date.now() + 60 * 60e3) : F.at }))), F.when === "in" ? chip(until(Date.now() + (F.inMin || 30) * 60e3), true, () => {}) : null));
    if (pick) {
      const t = F.at ?? Date.now() + 3600e3;
      const date = el("input", { type: "date", value: dateValue(t), "aria-label": L("Date", "日期") }), time = el("input", { type: "time", value: clock(t), "aria-label": L("At what time", "幾點") });
      const upd = () => { const [y, m, d] = date.value.split("-").map(Number), p = parseClock(time.value); if (y && p != null) { F.at = new Date(y, m - 1, d, Math.floor(p / 60), p % 60).getTime(); sayBtn(); } };
      date.addEventListener("change", upd); time.addEventListener("change", upd); time.addEventListener("input", upd);
      card.append(row("", date, time));
    }
    card.append(row(L("Repeat", "重複"), ...REPEAT().map(([k, t]) => chip(t, !F.more && F.rep === k, () => set({ rep: k, more: null }))), chip(L("More…", "更多⋯"), !!F.more, () => set({ more: F.more ? null : {} }), " ghost")));
    let picker = null;
    if (F.more) { picker = more(); card.append(row("", ...picker.nodes)); }
    card.append(row(L("Put it in", "放在"), chip(L("This app only", "只放在這個 App"), F.put === "app", () => set({ put: "app" })),
      ...(appleOn ? (links.apple.lists || []).map((l) => chip(`${l.title}`, F.put === l.id, () => set({ put: l.id }))) : [el("span", { className: "muted", textContent: L("Connect Apple Reminders in Settings to put them there too.", "到「設定」連結 Apple 提醒事項，提醒也能放進那裡。") })])));
    card.append(word);
    const sayBtn = () => { const t = reminderAt(); add.textContent = t ? L(`Add reminder: ${dayOf(t) === dayOf(Date.now()) ? "" : dayWord(t) + " "}${clock(t)} (${until(t)})`, `新增提醒：${dayOf(t) === dayOf(Date.now()) ? "" : dayWord(t) + " "}${clock(t)}（${until(t)}）`) : L("Add reminder", "新增提醒"); };
    sayBtn();
    add.addEventListener("click", async () => {
      err.hidden = true;
      const name = F.text.trim();
      const t = reminderAt();
      if (!name) { err.textContent = L("What should I remind you of?", "要提醒你什麼？"); err.hidden = false; return what.focus(); }
      if (!t || t < Date.now() - 60e3) { err.textContent = L("Pick a time from now on.", "請選一個之後的時間。"); err.hidden = false; return; }
      const r = picker ? picker.value() : { repeat: F.rep || null };
      const res = await work.addReminder(name, t, r.repeat, { ...r, appleList: F.put });
      if (!res?.ok) { err.textContent = L(res?.error || "Couldn't add it.", "沒辦法新增：要寫上要做的事，並選一個之後的時間。"); err.hidden = false; return; }
      toast(L(`Added: ${name}, ${clock(t)}`, `已新增：${name}，${clock(t)}`));
      F = { ...fresh(), when: F.when === "pick" ? "30m" : F.when, put: F.put };
      state.st = (await work.status()) || state.st;
      redraw();
    });
  } else {
    const span = eventSpan();
    const date = el("input", { type: "date", value: dateValue(F.evDate ?? Date.now() + 2 * DAY), "aria-label": L("Date", "日期") });
    date.addEventListener("change", () => { const [y, m, d] = date.value.split("-").map(Number); if (y) set({ evDay: "pick", evDate: new Date(y, m - 1, d).getTime() }); });
    card.append(row(L("Which day", "哪天"), chip(L("Today", "今天"), F.evDay === "today", () => set({ evDay: "today" })), chip(L("Tomorrow", "明天"), F.evDay === "tomorrow", () => set({ evDay: "tomorrow" })),
      chip(L("Pick a date…", "選日期⋯"), F.evDay === "pick", () => set({ evDay: "pick", evDate: F.evDate ?? dayOf(Date.now()) + 2 * DAY }), " ghost"), F.evDay === "pick" ? date : null));
    const from = el("input", { type: "time", value: hhmm(F.from ?? defaultFrom()), "aria-label": L("Starts", "開始") }), to = el("input", { type: "time", value: hhmm(F.to ?? (F.from ?? defaultFrom()) + 60), "aria-label": L("Ends", "結束") });
    from.addEventListener("change", () => { const p = parseClock(from.value); if (p != null) { const len = (F.to ?? (F.from ?? defaultFrom()) + 60) - (F.from ?? defaultFrom()); F.from = p; F.to = p + Math.max(5, len); to.value = hhmm(F.to); sayBtn(); } });
    to.addEventListener("change", () => { const p = parseClock(to.value); if (p != null) { F.to = p; sayBtn(); } });
    const allDay = el("label", { className: "small" }, el("input", { type: "checkbox", checked: F.allDay }), " ", L("All day", "全天"));
    allDay.firstChild.addEventListener("change", (e) => set({ allDay: e.target.checked }));
    card.append(row(L("Time", "時間"), ...(F.allDay ? [el("span", { className: "muted", textContent: L("All day (reminded at 09:00)", "全天（早上 9:00 提醒）") })] : [from, el("span", { textContent: L("to", "到") }), to]), allDay));
    card.append(row(L("Remind me", "提醒我"), ...BEFORE().map(([m, t]) => chip(t, F.before === m, () => set({ before: m })))));
    card.append(row(L("Repeat", "重複"), ...REPEAT().map(([k, t]) => chip(t, F.evRep === k, () => set({ evRep: k })))));
    card.append(row(L("Put it in", "放在"), chip(L("This app only", "只放在這個 App"), F.evPut === "app", () => set({ evPut: "app" })),
      ...cals.slice(0, 4).map((c) => chip(`${c.title}`, F.evPut === c.id, () => set({ evPut: c.id }))),
      cals.length > 4 ? (() => { const s = el("select", { "aria-label": L("Another calendar", "其他行事曆") }, new Option(L("Another calendar…", "其他行事曆⋯"), ""), ...cals.slice(4).map((c) => new Option(c.title, c.id))); s.value = cals.slice(4).some((c) => c.id === F.evPut) ? F.evPut : ""; s.addEventListener("change", () => s.value && set({ evPut: s.value })); return s; })() : null));
    if (!calOn) card.append(el("div", { className: "add-note" }, L("No calendar connected: the event stays in this app and still reminds you before it starts. Connect Apple Calendar in Settings to put events there too.",
      "還沒連結行事曆也可以加活動：它會存在這個 App 裡，開始前一樣會提醒你。想放進行事曆，到「設定」連結 Apple 行事曆。")));
    card.append(word);
    const sayBtn = () => { const s = eventSpan(); add.textContent = s ? L(`Add event: ${dayWord(s.day)} ${F.allDay ? "all day" : `${clock(s.start)}–${clock(s.end)}`}`, `新增活動：${dayWord(s.day)} ${F.allDay ? "全天" : `${clock(s.start)}–${clock(s.end)}`}`) : L("Add event", "新增活動"); };
    sayBtn();
    add.addEventListener("click", async () => {
      err.hidden = true;
      const name = F.text.trim(), s = eventSpan();
      if (!name) { err.textContent = L("What's the event?", "活動名稱是什麼？"); err.hidden = false; return what.focus(); }
      if (!s || s.end <= s.start) { err.textContent = L("Pick when it starts and ends (the end after the start).", "請選開始和結束的時間（結束要晚於開始）。"); err.hidden = false; return; }
      const start = F.allDay ? s.start + 9 * 3600e3 : s.start, local = F.evPut === "app";
      const res = await work.addReminder(name, start, null, { kind: "event", start, end: s.end, allDay: F.allDay, cal: local ? null : F.evPut, local, before: F.before, repeatEvent: F.evRep || null });
      if (!res?.ok) { err.textContent = L(res?.error || "Couldn't add it.", "沒辦法新增：請選一個之後的時間。"); err.hidden = false; return; }
      toast(local ? L("Added (in this app)", "已新增（存在 App 裡）") : L("Added to your calendar", "已加到你的行事曆"));
      F = { ...fresh(), kind: "event", evPut: F.evPut, before: F.before };
      state.st = (await work.status()) || state.st;
      redraw();
    });
  }
  sayWord();
  card.append(el("div", { className: "spread" }, el("span"), add), err);
  return card;
}
