// A day's log, to look at and to change (Today, and a day opened in Data's calendar): a timeline of
// the day and one plain row for each entry. Click a block or a row to change just that one (work or
// a break, its times, name, category or kind, a note; delete it); time away asks what it was. A gap
// between entries, dashed on the timeline, is time you forgot: click it to add it, the times filled in.

import { L, el, work, hm, clock, parseClock, catSelect, catName, catOf, catColor, toast, enterKey } from "./app-common.js";

const GAP = 15 * 60e3;     // a gap this long between entries is shown (to fill in)
let open = null;           // what's being changed: { day, id } (an entry), { day, gap: [start, end] }, or { day, add: true }

/** An entry's mark from the Pomodoro: its round (🍅 2, ended early), or a 🍅 break made another kind. */
export function tomatoMark(x) {
  if (x.round) return el("span", { className: "tom", textContent: x.early ? L(`Round ${x.round} (ended early)`, `第 ${x.round} 輪（提早結束）`) : L(`Round ${x.round}`, `第 ${x.round} 輪`) });
  if (x.pomo) return el("span", { className: "tom", textContent: "🍅", title: L("A Pomodoro break, made this", "番茄鐘休息改成這個") });
  return null;
}
const color = (x) => (x.kind === "away" ? "var(--away)" : catColor(x.kind, x.kind === "work" ? x.cat : x.type));
const title = (x) => (x.kind === "work" ? x.name || L("(not named)", "（未命名）") : x.kind === "break" ? catName(catOf("break", x.type)) : x.open ? L("Away (now)", "離開中") : L("Away (not said yet)", "離開（還沒說在做什麼）"));
const dur = (x) => (x.kind === "work" ? x.workedMs : x.end - x.start);

/** Is something being changed (a redraw from the clock would lose it)? */
export const dayLogBusy = () => !!open;
export const closeDayLog = () => { open = null; };

/**
 * The day (`day`: its midnight, ms) and its entries: work.history's (worked in seconds), or with `ms` the status'
 * sessions (worked in ms). redraw: draws the tab again.
 */
export function dayLog(day, entries, { redraw, focus = null, ms = false }) {
  const key = String(day);
  const list = entries.map((x) => ({ ...x, workedMs: x.kind === "work" ? (x.worked || 0) * (ms ? 1 : 1000) : 0 }))
    .filter((x) => x.end - x.start >= 30e3 || x.open).sort((a, b) => a.start - b.start);
  if (open && open.day !== key) open = null;
  const box = el("div", { className: "day-log" });
  if (focus) box.append(focus);

  // ---- the timeline ----
  const first = list.length ? list[0].start : day + 9 * 3600e3, last = list.length ? Math.max(...list.map((x) => x.end)) : day + 18 * 3600e3;
  const from = Math.min(day + 8 * 3600e3, new Date(first).setMinutes(0, 0, 0)), to = Math.max(day + 20 * 3600e3, Math.min(day + 24 * 3600e3, new Date(last).setMinutes(60, 0, 0)));
  const X = (t) => ((Math.max(from, Math.min(to, t)) - from) / (to - from)) * 100;
  const gaps = [];
  for (let i = 1; i < list.length; i++) {
    const s = Math.max(...list.slice(0, i).map((x) => x.end)), e = list[i].start;
    if (e - s >= GAP) gaps.push([s, e]);
  }
  const line = el("div", { className: "dl-line", role: "group", "aria-label": L("The day", "這一天") });
  for (const x of list) {
    const w = X(x.end) - X(x.start);
    const b = el("button", { type: "button", className: "dl-blk" + (open?.id === x.id ? " sel" : ""), title: `${clock(x.start)}–${clock(x.end)} ${title(x)}`,
      style: `left:${X(x.start)}%;width:${Math.max(0.4, w)}%;background:${color(x)}`, textContent: w > 9 ? title(x) : "" });
    b.addEventListener("click", () => pick(x));
    line.append(b);
  }
  for (const [s, e] of gaps) {
    const g = el("button", { type: "button", className: "dl-gap" + (open?.gap?.[0] === s ? " sel" : ""), textContent: "＋", title: L(`Nothing logged ${clock(s)}–${clock(e)}: click to add it`, `${clock(s)}–${clock(e)} 沒有紀錄：點一下補登`),
      style: `left:${X(s) + 0.3}%;width:${Math.max(1.2, X(e) - X(s) - 0.6)}%` });
    g.addEventListener("click", () => { open = open?.gap?.[0] === s ? null : { day: key, gap: [s, e] }; redraw(); });
    line.append(g);
  }
  const hrs = []; for (let t = from; t <= to; t += 2 * 3600e3) hrs.push(el("span", { textContent: String(new Date(t).getHours()), style: `left:${X(t)}%` }));
  box.append(line, el("div", { className: "dl-ticks" }, hrs));
  if (list.length) box.append(el("span", { className: "muted small", textContent: gaps.length ? L("Click a part to change it; the dashed gaps are time with nothing logged: click one to add it.", "點一段來改；虛線的空白是沒有紀錄的時間，點一下就能補登。")
    : L("Click a part to change it.", "點一段來改。") }));

  function pick(x) {
    if (x.open || x.goingOn) return toast(L("That's what's going on now", "這段還在進行中"));
    open = open?.id === x.id ? null : { day: key, id: x.id };
    redraw();
  }

  // ---- the rows (one of them open to change) ----
  if (open?.gap) box.append(editor(null, { start: open.gap[0], end: open.gap[1] }));
  const rows = el("div", { className: "dl-rows" });
  for (const x of list) {
    if (open?.id === x.id) { rows.append(editor(x)); continue; }
    const c = x.kind === "work" ? catOf("work", x.cat) : null;
    const row = el("button", { type: "button", className: "dl-row" + (x.kind === "away" ? " away" : x.kind === "break" ? " brk" : "") + (x.open ? " cur" : ""), "data-id": x.id },
      el("span", { className: "t", textContent: `${clock(x.start)} – ${x.open ? L("now", "現在") : clock(x.end)}` }),
      el("span", { className: "what" }, el("b", { textContent: title(x) }), c ? el("span", { className: "muted", textContent: catName(c, true) }) : null, tomatoMark(x),
        x.note ? el("span", { className: "muted", textContent: "· " + x.note }) : null,
        x.kind === "away" && !x.open ? el("span", { className: "say", textContent: L("click to say what it was", "點一下說明") }) : null),
      el("span", { className: "muted", textContent: hm(dur(x)) }), el("span", { className: "pen", "aria-hidden": "true", textContent: x.open || x.goingOn ? "" : "✎" }));
    row.style.setProperty("--c", color(x));
    row.addEventListener("click", () => pick(x));
    rows.append(row);
  }
  if (!list.length) rows.append(el("p", { className: "muted", textContent: L("Nothing logged that day.", "那天沒有紀錄。") }));
  box.append(rows);
  if (open?.add) box.append(editor(null, { start: Math.max(day + 9 * 3600e3, Math.min(Date.now(), day + 24 * 3600e3) - 30 * 60e3), end: Math.min(Date.now(), day + 24 * 3600e3) }));
  const add = el("button", { type: "button", className: "btn small dl-add", textContent: L("＋ Add time", "＋ 補登時間") });
  add.addEventListener("click", () => { open = open?.add ? null : { day: key, add: true }; redraw(); });
  if (!open?.add) box.append(el("div", {}, add));
  return box;

  /** Change an entry (x), or add one (x null, with its times). */
  function editor(x, times = null) {
    const isNew = !x, away = x?.kind === "away";
    let kind = x?.kind === "break" ? "break" : "work", cat = x?.cat || null, type = x?.type || "coffee";
    const ed = el("div", { className: "dl-editor", role: "group", "aria-label": isNew ? L("Add time", "補登時間") : L("Change this part", "改這一段") });
    const startIn = el("input", { type: "text", value: clock(x ? x.start : times.start), maxLength: 5, inputMode: "numeric", "aria-label": L("Start", "開始") });
    const endIn = el("input", { type: "text", value: clock(x ? x.end : times.end), maxLength: 5, inputMode: "numeric", "aria-label": L("End", "結束") });
    const nameIn = el("input", { type: "text", value: x?.kind === "work" ? x.name || "" : "", maxLength: 60, list: "task-names", placeholder: L("e.g. Thesis", "例如：Thesis"), "aria-label": L("What", "做什麼") });
    const noteIn = el("input", { type: "text", value: x?.note || "", maxLength: 200, placeholder: L("(optional)", "（選填）"), "aria-label": L("Note", "備註") });
    const field = (label, ctrl) => el("label", {}, el("span", { textContent: label }), ctrl);
    const fields = el("div", { className: "dl-fields" });
    const seg = el("div", { className: "seg" });
    const drawFields = () => {
      seg.replaceChildren(...[["work", L("Work", "工作")], ["break", L("Break", "休息")]].map(([k, t]) => {
        const b = el("button", { type: "button", className: kind === k ? "on" : "", textContent: t, "aria-pressed": String(kind === k) });
        b.addEventListener("click", () => { kind = k; drawFields(); });
        return b;
      }));
      fields.replaceChildren(field(L("Start", "開始"), startIn), field(L("End", "結束"), endIn),
        ...(kind === "work" ? [field(L("What", "做什麼"), nameIn), field(L("Category", "分類"), catSelect("work", cat || st()?.cat || "focus", (id) => { cat = id; }))]
          : [field(L("Kind of break", "休息種類"), catSelect("break", type, (id) => { type = id; }))]),
        el("label", { className: "wide" }, el("span", { textContent: L("Note", "備註") }), noteIn));
    };
    drawFields();
    const at = (input, fallback) => {
      const m = parseClock(input.value);
      if (m == null) return null;
      const t = new Date(day); t.setHours(Math.floor(m / 60), m % 60, 0, 0);
      return t.getTime() || fallback;
    };
    const save = el("button", { type: "button", className: "btn primary small", textContent: L("Save", "儲存") });
    save.addEventListener("click", async () => {
      const s = at(startIn);
      let e = at(endIn);
      // (00:00 at the end: the midnight this day ends at, as for work that went on past it)
      if (e != null && s != null && e <= s && parseClock(endIn.value) === 0) { const m = new Date(day); m.setDate(m.getDate() + 1); e = m.getTime(); }
      if (s == null || e == null) return toast(L("Type the times like 09:30", "請輸入時間，例如 09:30"));
      if (!(e > s)) return toast(L("The end has to be after the start", "結束要晚於開始"));
      const name = nameIn.value.trim(), note = noteIn.value.trim();
      if (isNew) {
        const r = await work.call("addEntry", kind === "work" ? { kind, name, cat: cat || undefined, note, start: s, end: e } : { kind, type, note, start: s, end: e });
        if (!r || r.error) return toast(L("Couldn't add that", "沒辦法新增"));
        toast(L("Added", "已新增"));
      } else {
        const was = x.kind;
        if (kind !== was) await work.call("convertEntry", x.id, kind, kind === "work" ? { name, cat: cat || undefined, fromAway: away || undefined } : { type, fromAway: away || undefined });
        const ok = await work.call("editEntry", x.id, { start: s, end: e, note, ...(kind === "work" ? { name, ...(cat ? { cat } : {}) } : { type }) });
        if (ok !== true) return toast(L("The end has to be after the start", "結束要晚於開始"));
        toast(L("Saved", "已儲存"));
      }
      open = null;
      redraw();
    });
    const cancel = el("button", { type: "button", className: "btn small", textContent: L("Cancel", "取消") });
    cancel.addEventListener("click", () => { open = null; redraw(); });
    const del = isNew ? null : el("button", { type: "button", className: "linkish danger", textContent: L("Delete this part", "刪除這一段") });
    del?.addEventListener("click", async () => { await work.call("deleteEntry", x.id); open = null; toast(L("Deleted", "已刪除")); redraw(); });
    for (const i of [startIn, endIn, nameIn, noteIn]) i.addEventListener("keydown", (ev) => { if (enterKey(ev)) save.click(); if (ev.key === "Escape") cancel.click(); });
    ed.append(el("div", { className: "spread" }, el("b", { textContent: isNew ? L(`Add ${clock(times.start)} – ${clock(times.end)}`, `補登 ${clock(times.start)} – ${clock(times.end)}`) : away ? L("What was this time away?", "離開的這段時間，做了什麼？") : L("Change this part", "改這一段") }),
      el("span", { className: "muted small", textContent: isNew ? L("The times are filled in for you", "時間已經自動填好了") : `${clock(x.start)} – ${clock(x.end)}` })),
      seg, fields, el("div", { className: "spread" }, el("div", { className: "row-flex" }, save, cancel), del));
    queueMicrotask(() => (kind === "work" && !nameIn.value ? nameIn : startIn).focus());
    return ed;
  }
}
const st = () => window.__mlwhApp?.state?.st;
