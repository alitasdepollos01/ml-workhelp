// Reminders: what, when ("in 20 minutes" or "at 15:30"), how often (once,
// every day, weekdays, every week, on certain days, every so often between two
// times), with the Thai word that comes with it; the list, each editable.

import { L, el, host, work, state, clock, parseClock, deco, toast, modal, pageTop } from "./app-common.js";
import { relatedWord } from "./related.js";
import { connections, known, openCalHelp } from "./connect.js";
import { addCard } from "./add-form.js";

let decks = [];
host?.library?.().then((lib) => { decks = lib?.decks || []; }).catch(() => {});
const DAYS = [[1, "Mon", "一"], [2, "Tue", "二"], [3, "Wed", "三"], [4, "Thu", "四"], [5, "Fri", "五"], [6, "Sat", "六"], [0, "Sun", "日"]];
const REPEATS = [["", "once", "一次"], ["daily", "every day", "每天"], ["weekdays", "on weekdays", "平日"], ["weekly", "every week", "每週"],
  ["days", "on certain days…", "選幾天⋯"], ["every", "every … (minutes or hours)", "每隔一段時間⋯（分鐘或小時）"]];

function until(ms) {
  const m = Math.round((ms - Date.now()) / 60e3);
  if (m <= 0) return L("now", "現在");
  if (m >= 24 * 60) { const d = Math.round(m / (24 * 60)); return L(`in ${d} day${d === 1 ? "" : "s"}`, `${d} 天後`); }
  return m < 60 ? L(`in ${m} min`, `${m} 分鐘後`) : L(`in ${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`, `${Math.floor(m / 60)} 小時${m % 60 ? ` ${m % 60} 分鐘` : ""}後`);
}

/** "on weekdays", "every 90 min, 09:00–17:00", "Mon, Wed"… */
export function repeatSays(r) {
  if (!r.repeat) return "";
  if (r.repeat === "days") return (r.days || []).slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => { const x = DAYS.find((y) => y[0] === d); return L(x[1], "週" + x[2]); }).join(L(", ", "、"));
  if (r.repeat === "every") {
    const n = r.every >= 60 && r.every % 60 === 0 ? L(`${r.every / 60} h`, `${r.every / 60} 小時`) : L(`${r.every} min`, `${r.every} 分鐘`);
    return L(`every ${n}, ${r.from}–${r.until}`, `每 ${n}，${r.from}–${r.until}`);
  }
  const x = REPEATS.find((y) => y[0] === r.repeat);
  return x ? L(x[1], x[2]) : "";
}

/** The repeat controls: a menu, and the extra fields "certain days" and "every…" need. */
function repeatPicker(init = {}) {
  const sel = el("select", { "aria-label": L("Repeat", "重複") }, REPEATS.map(([v, en, zh]) => new Option(L(en, zh), v)));
  sel.value = init.repeat || "";
  const picked = new Set(init.days || [1, 2, 3, 4, 5]);
  const days = el("div", { className: "days-pick" }, DAYS.map(([d, en, zh]) => {
    const b = el("button", { type: "button", className: picked.has(d) ? "on" : "", textContent: L(en, zh), "aria-pressed": String(picked.has(d)) });
    b.addEventListener("click", () => { picked.has(d) ? picked.delete(d) : picked.add(d); b.classList.toggle("on"); b.setAttribute("aria-pressed", String(picked.has(d))); });
    return b;
  }));
  const isHours = init.every ? init.every % 60 === 0 && init.every >= 60 : true;
  const n = el("input", { type: "number", min: 1, max: 999, value: init.every ? (isHours ? init.every / 60 : init.every) : 2, "aria-label": L("How often", "多久一次") });
  const unit = el("select", { "aria-label": L("Minutes or hours", "分鐘或小時") }, new Option(L("hours", "小時"), "60"), new Option(L("minutes", "分鐘"), "1"));
  unit.value = isHours ? "60" : "1";
  const from = el("input", { type: "time", value: init.from || "09:00", "aria-label": L("From", "從") });
  const to = el("input", { type: "time", value: init.until || "18:00", "aria-label": L("Until", "直到") });
  const every = el("span", { className: "inline" }, L("every", "每"), n, unit, L("from", "從"), from, L("until", "到"), to);
  const sync = () => { days.hidden = sel.value !== "days"; every.hidden = sel.value !== "every"; };
  sel.addEventListener("change", sync);
  sync();
  return {
    nodes: [sel, days, every],
    value: () => ({ repeat: sel.value || null, days: [...picked], every: Math.max(1, Number(n.value) || 1) * Number(unit.value), from: from.value || "00:00", until: to.value || "23:59" }),
  };
}

let seenLinks = "";
const dayStartOf = (ms) => new Date(ms).setHours(0, 0, 0, 0);
const dateValue = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

let goTab = null;
export function renderReminders(main, { ask, redraw, go }) {
  goTab = go;
  const st = state.st;
  // Apple Reminders and Apple Calendar: what's connected (asked in the background; redrawn if it changed).
  const links = known();
  connections().then((c) => { const k = JSON.stringify([c.apple?.on, c.apple?.into, (c.apple?.lists || []).length, c.calendar?.on, c.calendar?.into, (c.calendar?.calendars || []).length]); if (k !== seenLinks) { const first = !seenLinks; seenLinks = k; if (!first) redraw(); } }).catch(() => {});
  main.append(pageTop({ title: L("Reminders & events", "提醒與活動"), sub: L("Nudges at a time, and events with a start and an end", "時間到叫你一聲的提醒，和有開始、有結束的活動"), spot: "app-rem-head" }));
  // Adding one: a card (add-form.js); "more…" opens the repeat picker for certain days or every so often.
  main.append(addCard({ links, redraw, decks, more: () => repeatPicker({ repeat: "days" }), ask }));
  listPart(main, st);
  if (ask?.at || ask?.tab === "reminders" || ask?.in) document.getElementById("what")?.focus();
}

/** Everything coming up: reminders and events, by when they ring. */
// The list: all of it, or just the reminders or the events. Today first, open; then the rest of
// this week and after it, each folded until you open it (and kept as you left it).
const DAY = 864e5;
const whenOf = (r) => (r.kind === "event" ? r.start : r.at);
const dayOf = (t) => new Date(t).setHours(0, 0, 0, 0);
let shownKind = "all";                        // "all" | "reminder" | "event"
const folds = { week: false, later: false };  // open?
function dayTitle(t) {
  const n = Math.round((dayOf(t) - dayOf(Date.now())) / DAY), d = new Date(t);
  const date = L(d.toLocaleDateString(L("en-GB", "en-GB"), { weekday: "short", day: "numeric", month: "short" }), `${d.getMonth() + 1} 月 ${d.getDate()} 日（週${"日一二三四五六"[d.getDay()]}）`);
  const rel = n <= 0 ? L("Today", "今天") : n === 1 ? L("Tomorrow", "明天") : n === 2 ? L("The day after tomorrow", "後天") : L(`In ${n} days`, `${n} 天後`);
  return [rel, date];
}
function listPart(main, st) {
  const all = (st?.reminders || []).slice().sort((a, b) => whenOf(a) - whenOf(b));
  const isEvent = (r) => r.kind === "event";
  const list = all.filter((r) => shownKind === "all" || (shownKind === "event") === isEvent(r));
  const box = el("div", { className: "rem-list" });
  // All, reminders, events (with how many of each).
  const kinds = el("div", { className: "days-pick rem-kinds", role: "radiogroup", "aria-label": L("Show", "顯示") }, [["all", L("All", "全部"), all.length], ["reminder", L("Reminders", "提醒"), all.filter((r) => !isEvent(r)).length], ["event", L("Events", "活動"), all.filter(isEvent).length]].map(([k, t, n]) => {
    const b = el("button", { type: "button", className: shownKind === k ? "on" : "", role: "radio", "aria-checked": String(shownKind === k), textContent: `${t} ${n}` });
    // (redrawn in place of this list, from what's there now: the list on the page, not where it was first made)
    b.addEventListener("click", () => { shownKind = k; const fresh = el("div"); listPart(fresh, state.st || st); box.replaceWith(...fresh.childNodes); });
    return b;
  }));
  // (the dachshund sits by "Coming up" while something is coming)
  box.append(el("div", { className: "spread" }, el("div", { className: "coming-h" }, el("h3", { textContent: L("Coming up", "接下來") }), list.length ? deco("app-rem-next", "rem-next") : null), kinds));
  const today = dayOf(Date.now()), weekEnd = dayOf(Date.now()) + (7 - ((new Date().getDay() + 6) % 7)) * DAY; // (to Sunday night)
  const isToday = (r) => r.fired || dayOf(whenOf(r)) === today;
  const rows = (items, into) => {
    let day = null;
    for (const r of items) {
      const d = dayOf(whenOf(r));
      if (d !== day) { day = d; const [rel, date] = dayTitle(d); into.append(el("div", { className: "rem-day" }, el("b", { textContent: rel }), el("span", { textContent: date }))); }
      into.append(reminderRow(r, r === list[0], false));
    }
  };
  // Today first, always: its reminders and events, then "That's all for today" (on its own when there are none).
  const [rel, date] = dayTitle(today);
  box.append(el("div", { className: "rem-day" }, el("b", { textContent: rel }), el("span", { textContent: date })));
  const todays = list.filter(isToday);
  todays.forEach((r) => box.append(reminderRow(r, r === list[0], true)));
  // (and only when today has nothing: "That's all for today", with its sticker)
  if (!todays.length) box.append(el("div", { className: "empty" }, deco("app-rem-empty", "", "position:static"),
    shownKind === "event" ? L("No more events today. MilkLove is taking it easy too.", "今天的活動就到這裡囉，MilkLove 也在放鬆～")
      : shownKind === "reminder" ? L("No more reminders today. MilkLove is taking it easy too.", "今天的提醒就到這裡囉，MilkLove 也在放鬆～")
      : L("That's all for today. MilkLove is taking it easy too.", "今天就到這裡囉，MilkLove 也在放鬆～")));
  // The rest of this week, and after it: folded.
  const groups = [
    ["week", L("Rest of this week", "這週其他天"), L(`to ${new Date(weekEnd - DAY).toLocaleDateString(L("en-GB", "en-GB"), { weekday: "short", day: "numeric", month: "short" })}`, `到 ${new Date(weekEnd - DAY).getMonth() + 1} 月 ${new Date(weekEnd - DAY).getDate()} 日（週日）`), list.filter((r) => !isToday(r) && whenOf(r) < weekEnd)],
    ["later", L("Later", "之後"), L(`from ${new Date(weekEnd).toLocaleDateString(L("en-GB", "en-GB"), { day: "numeric", month: "short" })}`, `${new Date(weekEnd).getMonth() + 1} 月 ${new Date(weekEnd).getDate()} 日以後`), list.filter((r) => !isToday(r) && whenOf(r) >= weekEnd)],
  ];
  for (const [g, title, span, items] of groups) {
    if (!items.length) continue;
    const inner = el("div", { className: "rem-later", hidden: !folds[g] });
    rows(items, inner);
    const head = el("button", { type: "button", className: "rem-fold", "data-g": g, "aria-expanded": String(folds[g]) },
      el("span", { className: "tw", textContent: folds[g] ? "▾" : "▸" }), el("b", { textContent: title }), el("span", { className: "muted", textContent: span }),
      el("span", { className: "n", textContent: L(`${items.length}`, `${items.length} 個`) }));
    head.addEventListener("click", () => { folds[g] = !folds[g]; inner.hidden = !folds[g]; head.setAttribute("aria-expanded", String(folds[g])); head.querySelector(".tw").textContent = folds[g] ? "▾" : "▸"; });
    box.append(head, inner);
  }
  // Events missing? What to check (Settings › Apple Calendar, its "can't see some events?" open).
  if (shownKind === "event" && goTab) {
    const help = el("button", { type: "button", className: "linkish", textContent: L("How to make them show →", "看看怎麼讓它們出現 →") });
    help.addEventListener("click", () => { openCalHelp(); goTab("settings", { page: 1, card: ".connect-card.calendar" }); });
    box.append(el("div", { className: "rem-cal-help" }, L("Some events missing? ", "少了某些活動？"), help));
  }
  // (a sticker under the list, out of the way)
  const end = deco("app-rem-end", "", "position:static;justify-self:end;max-height:130px;max-width:150px;margin-top:6px");
  if (end && all.length) box.append(end);
  main.append(box);
}

/** The event form: what, when (or all day), which calendar, when to be reminded, repeat. */

/** An event, edited here (and in your calendar): what, the day, start and end. */
function editEvent(r) {
  const { box, close } = modal(L("Edit event", "編輯活動"));
  const text = el("input", { type: "text", value: r.text, maxLength: 200, style: "flex:1", "aria-label": L("Event", "活動") });
  const date = el("input", { type: "date", value: dateValue(r.start), "aria-label": L("Date", "日期") });
  const from = el("input", { type: "time", value: clock(r.start), disabled: r.allDay, "aria-label": L("Starts", "開始") });
  const to = el("input", { type: "time", value: clock(r.end), disabled: r.allDay, "aria-label": L("Ends", "結束") });
  const save = el("button", { type: "button", className: "btn primary", textContent: L("Save", "儲存") });
  save.addEventListener("click", async () => {
    const [y, m, d] = date.value.split("-").map(Number);
    const at = (v, fallback) => { const p = parseClock(v); return p == null ? fallback : new Date(y, m - 1, d, Math.floor(p / 60), p % 60).getTime(); };
    const shift = new Date(y, m - 1, d).getTime() - dayStartOf(r.start);
    const start = r.allDay ? r.start + shift : at(from.value, r.start), end = r.allDay ? r.end + shift : at(to.value, r.end);
    if (end <= start) { toast(L("The end has to be after the start", "結束要晚於開始")); return; }
    await work.call("editReminder", r.id, { text: text.value, start, end });
    toast(r.calOn ? L("Saved (and in your calendar)", "已儲存（行事曆也同步更新了）") : L("Saved", "已儲存"));
    close();
  });
  box.append(el("div", { className: "row-flex" }, text), el("div", { className: "row-flex" }, L("When", "時間"), date, from, "–", to),
    r.calOn ? el("p", { className: "muted", textContent: L("A repeating event changes only this time.", "重複的活動只會改這一次。") }) : null,
    el("div", { className: "row-flex", style: "justify-content:flex-end" }, save));
  text.focus();
}

/** Deleting an event that's in your calendar: from there too, or only here? */
function deleteEvent(r) {
  if (!r.calOn) { work.removeReminder(r.id); toast(L("Removed", "已移除")); return; }
  const { box, close } = modal(L(`Delete “${r.text}”?`, `要刪除「${r.text}」嗎？`));
  const btn = (label, fn, cls) => { const b = el("button", { type: "button", className: cls, textContent: label }); b.addEventListener("click", async () => { await fn(); close(); }); return b; };
  box.append(el("p", { className: "muted", textContent: L("It's in your Apple Calendar too.", "這個活動也在你的 Apple 行事曆裡。") }),
    el("div", { className: "row-flex" },
      btn(L("Delete it from the calendar too", "也從行事曆刪掉"), async () => { await host.calendar("delete", { id: r.id, fromCalendar: true }); toast(L("Deleted from your calendar", "已從行事曆刪除")); }, "btn primary small"),
      btn(L("Only hide it here", "只在這裡隱藏"), async () => { await host.calendar("delete", { id: r.id, fromCalendar: false }); toast(L("Hidden here; still in your calendar", "已在這裡隱藏，行事曆裡還保留著")); }, "btn small"),
      btn(L("Cancel", "取消"), () => {}, "btn ghost small")));
}

function reminderRow(r, first = false, today = true) {
  const row = el("div", { className: "rem" + (r.fired ? " due" : ""), "data-id": r.id });
  const acts = el("div", { className: "rem-acts" });
  if (r.fired) {
    const done = el("button", { type: "button", className: "btn small primary", textContent: L("Done", "完成") });
    done.addEventListener("click", () => work.act("reminder-done", r.id));
    const later = el("button", { type: "button", className: "btn small", textContent: L("In 10 min", "10 分鐘後") });
    later.addEventListener("click", () => work.act("reminder-snooze", r.id));
    acts.append(done, later);
  } else {
    const edit = el("button", { type: "button", className: "btn small", textContent: L("Edit", "編輯") });
    edit.addEventListener("click", () => (r.kind === "event" ? editEvent(r) : editReminder(r)));
    acts.append(edit);
  }
  const del = el("button", { type: "button", className: "del", textContent: "✕", "aria-label": L(`Remove “${r.text}”`, `移除「${r.text}」`), title: L("Remove", "移除") });
  del.addEventListener("click", () => { if (r.kind === "event") deleteEvent(r); else { work.removeReminder(r.id); toast(L("Removed", "已移除")); } });
  acts.append(del);
  const ev = r.kind === "event";
  const calName = ev && r.cal ? (known().calendar?.calendars || []).find((c) => c.id === r.cal)?.title : "";
  const when = ev ? (r.allDay ? L("all day", "全天") : `${clock(r.start)}–${clock(r.end)}`) : "";
  const reminds = ev ? (r.before ? L(`reminds you ${r.before} min before`, `${r.before} 分鐘前提醒`) : L("reminds you when it starts", "開始時提醒")) : "";
  // (how long until it, today only: the other days have their date above them)
  const soon = r.fired ? (ev ? L("Now", "現在") : L("Due", "時間到")) : today ? until(ev ? r.start : r.at) : "";
  const small = ev ? [soon, when, calName, reminds].filter(Boolean).join(" · ") : [soon, repeatSays(r)].filter(Boolean).join(" · ");
  const tag = ev ? (r.calOn ? el("span", { className: "apple-tag", textContent: L(" Calendar", " 行事曆"), title: L("In your Apple Calendar", "在你的 Apple 行事曆裡") })
    : r.local ? el("span", { className: "apple-tag", textContent: L("In this app", "只在 App"), title: L("Kept in this app only", "只存在這個 App 裡") }) : null)
    : r.apple ? el("span", { className: "apple-tag", textContent: L(" Apple", " Apple"), title: L("In step with Apple Reminders", "跟 Apple 提醒事項同步") }) : null;
  const next = null; // (the dachshund moved up beside "Coming up")
  row.append(...[el("b", { textContent: ev && r.allDay ? L("All day", "全天") : clock(ev ? r.start : r.at) }),
    el("div", {}, el("div", { className: "rem-what" }, ev ? "📅 " : "⏰ ", r.text, tag), small ? el("small", { textContent: small }) : null), next, acts].filter(Boolean));
  return row;
}

function editReminder(r) {
  const { box, close } = modal(L("Edit reminder", "編輯提醒"));
  const text = el("input", { type: "text", value: r.text, maxLength: 200, style: "flex:1", "aria-label": L("What to do", "要做什麼") });
  const at = el("input", { type: "time", value: clock(r.at), "aria-label": L("At what time", "幾點") });
  const rep = repeatPicker(r);
  const save = el("button", { type: "button", className: "btn primary", textContent: L("Save", "儲存") });
  save.addEventListener("click", async () => {
    const m = parseClock(at.value);
    let when = r.at;
    if (m != null) { const d = new Date(r.at); d.setHours(Math.floor(m / 60), m % 60, 0, 0); if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1); when = d.getTime(); }
    const v = rep.value();
    await work.call("editReminder", r.id, { text: text.value, at: when, ...v });
    toast(L("Saved", "已儲存"));
    close();
  });
  box.append(el("div", { className: "row-flex" }, text), el("div", { className: "row-flex" }, L("At", "在幾點"), at), el("div", { className: "row-flex" }, L("Repeat", "重複"), ...rep.nodes),
    el("div", { className: "row-flex", style: "justify-content:flex-end" }, save));
  text.focus();
}
