// The top of Today: the two ways of keeping time (the "keep" setting: "work", or "both", the
// Pomodoro, whose focus rounds are the day's work), and the "now" card, one for both. Its big button is always the next step (start, a break, back / the next
// round), with ⏹ 收工 beside it. One break screen for every break: what it is and how long, a
// MilkLove video under it; it goes in the log as one entry. 收工 logs what's going on and
// celebrates with stickers from the buddies' own.

import { L, el, host, work, state, clock, pad, catName, catOf, breakCats, catSelect, symbolButton, toast, enterKey, deco } from "./app-common.js";
import { openFocus } from "./focus-screen.js";
import { breakCard, lengthsPicker, pomoInfo } from "./tab-pomodoro.js";

const TOMATO_BREAK = "pomodoro";
let ticker = 0, statusAt = 0, picker = null; // picker: "task" | "new-task" | "new-kind" (open, kept through redraws)
let kindSym = "🌿"; // (a new kind of break: the symbol picked, kept through redraws)
const mmss = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return s >= 3600 ? `${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}` : `${Math.floor(s / 60)}:${pad(s % 60)}`; };
const hmLong = (ms) => { const m = Math.floor(Math.max(0, ms) / 60e3); return m >= 60 ? L(`${Math.floor(m / 60)} h ${pad(m % 60)} min`, `${Math.floor(m / 60)} 小時 ${pad(m % 60)} 分`) : L(`${m} min`, `${m} 分鐘`); };
/** append(), leaving out what isn't there (append writes null out as "null"). */
const put = (node, ...kids) => node.append(...kids.flat().filter((k) => k != null && k !== false && k !== ""));
const btn = (label, fn, className = "btn") => {
  const b = el("button", { type: "button", className, textContent: label });
  b.addEventListener("click", (e) => { b.classList.add("pressed"); setTimeout(() => b.classList.remove("pressed"), 900); fn(e); });
  return b;
};
/** ⛶ The focus screen: the clock full screen, for work away from the computer. */
const focusBtn = () => btn(L("Focus screen", "專注全螢幕"), () => openFocus(), "btn focus-btn");
/** The card's sticker, bottom right (one spot for each: the work clock, the Pomodoro, done for today). */
function withDeco(card, spot) {
  const d = deco(spot, "now-deco");
  if (d) { card.classList.add("has-deco"); card.append(d); }
}

const WAYS = () => [
  ["work", L("Work clock", "工作時鐘"), L("Counts while you're at the computer, task by task", "在電腦前就計時，記下每件事")],
  ["both", L("Pomodoro", "番茄鐘"), L("Focus in rounds with breaks between; each round counts as today's work", "一輪專注、一段休息；每一輪都算進今天的工作")],
];
const wayName = (k) => WAYS().find((w) => w[0] === k)?.[1] || "";

/** The two ways (= Settings › Keeping time), a small switch at the top of the timer card: switching is from now on. */
function waySwitch(st, redraw) {
  const keep = st.keep || "work";
  const seg = el("div", { className: "seg way-switch", role: "radiogroup", "aria-label": L("How you keep time", "怎麼計時") }, WAYS().map(([k, title, sub]) => {
    const b = el("button", { type: "button", className: keep === k ? "on" : "", role: "radio", "aria-checked": String(keep === k), "data-keep": k, title: sub, textContent: title });
    b.addEventListener("click", () => {
      if (keep === k) return;
      // One go, nothing lost (main.js "switch-keep"): what's been done so far is kept, and the other clock carries on.
      const p = st.pomoNow, working = st.started && !st.doneToday && !st.onBreak;
      const said = k === "both"
        ? working ? L(`"${st.name || "Work"}" so far (${hmLong(st.stretch)}) saved · round 1 started on the same task`, `「${st.name || "工作"}」到現在的 ${hmLong(st.stretch)} 已記下 · 同一件事開始第 1 輪`) : L("Now: the Pomodoro.", "改成番茄鐘了。")
        : p?.phase === "focus" ? L(`Round ${st.rounds + 1} so far counted as work · the work clock carries on`, `第 ${st.rounds + 1} 輪到現在的時間算進工作了 · 工作時鐘接著計時`) : L("Now: the work clock.", "改成工作時鐘了。");
      work.act("switch-keep", k);
      undoNote(said, () => work.act("switch-keep", keep));
      setTimeout(redraw, 250);
    });
    return b;
  }));
  return seg;
}
/** The ? beside the switch: what each way does and how this one counts (point at it, or click). */
let tipOpen = false; // (open by a click: it stays open when the card redraws)
function helpTip(lines) {
  const id = "now-tip-" + Math.random().toString(36).slice(2, 7);
  const b = el("button", { type: "button", className: "help-q", "aria-label": L("How it counts", "怎麼計時的"), "aria-describedby": id, "aria-expanded": "false", textContent: "?" });
  const pop = el("div", { className: "tip-pop", id, role: "tooltip" }, lines.map((t) => el("p", { textContent: t })));
  const wrap = el("span", { className: "help-tip" }, b, pop);
  const close = () => { tipOpen = false; wrap.classList.remove("open"); b.setAttribute("aria-expanded", "false"); };
  if (tipOpen) { wrap.classList.add("open"); b.setAttribute("aria-expanded", "true"); setTimeout(() => document.addEventListener("click", close, { once: true })); }
  b.addEventListener("click", (e) => {
    e.stopPropagation();
    const on = !wrap.classList.contains("open");
    tipOpen = on; wrap.classList.toggle("open", on); b.setAttribute("aria-expanded", String(on));
    if (on) setTimeout(() => document.addEventListener("click", close, { once: true })); // (a click anywhere else closes it)
  });
  b.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  return wrap;
}
/** (kept for anything that still asks for the old row: the switch now) */
export function waysRow(st, redraw) { return waySwitch(st, redraw); }

// ---- parts of the card ----------------------------------------------------------

const goal = (st) => (st.goal || 0) * 3600e3;
function goalBar(st, ms, note = "") {
  const g = goal(st);
  const fill = el("i", { style: `width:${g ? Math.min(100, (ms / g) * 100) : 0}%`, "data-live": "goalbar" });
  return el("div", { className: "goal" }, el("div", { className: "gbar" }, fill),
    el("span", { "data-live": "goaltext", textContent: goalText(st, ms, note) }));
}
const goalText = (st, ms, note) => (st.goal ? L(`Today ${hmLong(ms)} of ${st.goal} h`, `今天工作 ${hmLong(ms)} / 目標 ${st.goal} 小時`) : L(`Today ${hmLong(ms)}`, `今天工作 ${hmLong(ms)}`)) + note;
const pill = (cls, text) => el("span", { className: "pill " + cls, textContent: text });
let tipLines = []; // (this card's "how it counts" lines: in the ? tip at the top, not as grey text)
const explain = (text) => { tipLines.push(text); return null; };
function ring(color, pct, big, label, live = "") {
  const r = el("div", { className: "now-ring", style: `--c:${color};--p:${Math.max(0, Math.min(100, pct))}`, "data-live": live ? live + "-ring" : null },
    el("div", {}, el("span", { className: "time", textContent: big, "data-live": live || null }), label ? el("span", { className: "lab", textContent: label }) : null));
  return r;
}
function digital(label, big, live, color, below) {
  return el("div", { className: "digital" }, el("span", { className: "muted small", textContent: label }),
    el("span", { className: "time", textContent: big, "data-live": live, style: color ? `color:${color}` : null }), below);
}
function dots(st, { breakNow = false } = {}) {
  const every = st.pomo?.every || 4, done = (st.rounds || 0) % every || (breakNow && st.rounds ? every : 0);
  const next = (st.rounds || 0) + 1;
  return el("div", { className: "row-flex" }, el("div", { className: "pomo-dots" }, Array.from({ length: every }, (_, i) => el("i", { className: i < done ? "done" : "" }))),
    el("span", { className: "muted small", textContent: breakNow ? L(`Round ${st.rounds} done`, `完成第 ${st.rounds} 輪`) : L(`Round ${next}`, `第 ${next} 輪`) }));
}

/** What you're working on: click the name for your recent tasks, or a new one; its category beside it. */
function taskPicker(st, lead, redraw) {
  const name = st.name || "";
  const open = picker === "task" || picker === "new-task";
  const nameBtn = el("button", { type: "button", className: "namebtn" + (open ? " open" : ""), title: L("Click to switch to another task", "點一下換一件事"),
    textContent: (name || L("Name it…", "取個名字⋯")) + " ▾", "aria-expanded": String(open) });
  nameBtn.addEventListener("click", () => { picker = open ? null : "task"; redraw(); });
  const wrap = el("span", { className: "picker" }, nameBtn);
  if (open) {
    const dd = el("div", { className: "dd", "data-open": "1" });
    const names = [...new Set([name, ...(st.recentNames || [])].filter(Boolean))].slice(0, 7);
    for (const n of names) {
      const c = catOf("work", st.taskCat?.[n]);
      const it = el("button", { type: "button", className: "it" + (n === name ? " on" : "") }, el("span", { textContent: n }), el("span", { className: "muted small", textContent: c ? catName(c, true) : "" }));
      it.addEventListener("click", () => { picker = null; if (n !== name) { work.act("switch", n); toast(L(`Working on ${n}`, `正在做「${n}」`)); } redraw(); });
      put(dd, it);
    }
    if (picker === "new-task") {
      const input = el("input", { type: "text", id: "new-task", maxLength: 60, placeholder: L("What are you working on?", "在做什麼？"), "aria-label": L("A new task", "新的事"), list: "task-names" });
      const ok = btn(L("OK", "好"), () => { const v = input.value.trim(); picker = null; if (v) { work.setName(v); toast(L(`Working on ${v}`, `正在做「${v}」`)); } redraw(); }, "btn small primary");
      input.addEventListener("keydown", (e) => { if (enterKey(e)) ok.click(); if (e.key === "Escape") { picker = null; redraw(); } });
      put(dd, el("div", { className: "addrow" }, input, ok));
      queueMicrotask(() => input.focus());
    } else put(dd, btn(L("＋ Something new…", "＋ 新的事⋯"), () => { picker = "new-task"; redraw(); }, "it"));
    put(wrap, dd);
  }
  return el("div", { className: "row-flex" }, el("span", { className: "muted", textContent: lead }), wrap,
    catSelect("work", st.cat, async (id) => { await work.call("setCategory", id); toast(L("Category changed", "已更改分類")); }));
}

// ---- 收工 and the celebration ----------------------------------------------------

async function endDay(st, redraw) {
  // What's going on gets logged: say so in the celebration.
  const p = st.pomoNow, focusing = p && p.phase === "focus";
  let ended = "";
  if (st.onBreak) ended = L("Your break is logged up to now.", "休息記到現在，不算工作。");
  else if (focusing && st.keep === "both") ended = L(`Round ${st.rounds + 1} so far counts as today's work (ended early).`, `第 ${st.rounds + 1} 輪做到現在的時間，也算進今天的工作了（提早結束）。`);
  else if (focusing) ended = L(`Round ${st.rounds + 1} ended early.`, `第 ${st.rounds + 1} 輪提早結束了。`);
  else if (st.keep === "work" && st.stretch > 60e3) ended = L(`"${st.name || "Work"}" so far (${hmLong(st.stretch)}) is logged.`, `「${st.name || "工作"}」到現在的 ${hmLong(st.stretch)} 已經記進去了。`);
  work.act("end-day");
  picker = null;
  setTimeout(async () => { state.st = (await work.status()) || state.st; celebrate(state.st, ended); redraw(); }, 300);
}

/** 收工 from somewhere else (the focus screen): the same as Today's button, then Today redraws. */
export function doneForToday() { endDay(state.st, () => window.__mlwhApp?.draw()); }

/** The celebration: three stickers from the buddies' own (a different three each time), confetti, today in a few lines. */
export async function celebrate(st, ended = "") {
  document.querySelector(".cele:not(.pins-cele)")?.remove(); // (a pin moment stays: it has its own Later)
  let pics = [];
  try {
    const lib = await host.library();
    const off = new Set(lib.buddyOff || []), inUse = (set) => (lib.stickers?.[set] || []).filter((s) => !off.has(`${set}/${decodeURIComponent(s.url.split("/").pop())}`));
    const any = (list) => list[Math.floor(Math.random() * list.length)];
    const all = ["milk", "love", "together", "others"].flatMap(inUse);
    // (Together on top, in the middle; Milk bottom left, Love bottom right)
    pics = [any(inUse("together")), any(inUse("milk")), any(inUse("love"))].map((s) => s || any(all)).map((s) => s?.url || "");
  } catch { /* no stickers: just the words */ }
  const g = goal(st);
  // Today in three tiles: the work (and the goal), the rounds, what took the most.
  const work0 = (st.sessions || []).filter((x) => x.kind === "work" && x.name);
  const by = new Map();
  for (const x of work0) by.set(x.name, (by.get(x.name) || 0) + x.worked);
  const top = [...by].sort((a, b) => b[1] - a[1])[0];
  const tile = (label, value, sub, extra) => el("div", { className: "ct" }, el("span", { className: "muted small", textContent: label }), el("b", { textContent: value }), sub ? el("span", { className: "muted small", textContent: sub }) : null, extra || null);
  const tiles = [tile(L("Today's work", "今天工作"), hmLong(st.today), g ? (st.today >= g ? L("Goal reached!", "達標！") : L(`${hmLong(g - st.today)} to the goal`, `離目標還差 ${hmLong(g - st.today)}`)) : "",
    g ? el("div", { className: "gbar" }, el("i", { style: `width:${Math.min(100, (st.today / g) * 100)}%` })) : null)];
  if (st.rounds || st.keep === "both") tiles.push(tile(L("Rounds", "番茄鐘"), L(`${st.rounds}`, `${st.rounds} 輪`), L(`${hmLong(st.rounds * (st.pomo?.focus || 25) * 60e3)} of focus`, `專注 ${hmLong(st.rounds * (st.pomo?.focus || 25) * 60e3)}`)));
  if (top) tiles.push(tile(L("The most", "做最多"), top[0], hmLong(top[1])));
  const notes = [st.focus ? el("div", { textContent: L(`Today's focus: ${st.focus}`, `本日主題：${st.focus}`) }) : null, ended ? el("div", { className: "muted small", textContent: "✓ " + ended }) : null].filter(Boolean);
  const close = () => box.remove();
  const pic = (u, cls) => (u ? el("img", { className: "cs " + cls, src: u, alt: "" }) : null);
  const box = el("div", { className: "cele", role: "dialog", "aria-modal": "true", "aria-label": L("Done for today", "收工") },
    el("div", { className: "box" },
      pic(pics[0], "top"), pic(pics[1], "left"), pic(pics[2], "right"),
      el("h2", { textContent: L("Done for today!", "收工！今天辛苦了") }),
      el("p", { className: "muted", style: "margin:0", textContent: L("Milk and Love give you a round of applause", "Milk 和 Love 幫你拍拍手") }),
      el("div", { className: "ctiles" }, tiles),
      notes.length ? el("div", { className: "cnotes" }, notes) : null,
      el("div", { className: "row-flex cbtns" },
        btn(L("See you tomorrow", "明天見"), close, "btn primary big"),
        btn(L("Carry on after all", "其實還要繼續"), () => { close(); work.act("resume-day"); toast(L("Carrying on", "繼續加油")); }))));
  box.addEventListener("click", (e) => { if (e.target === box) close(); });
  box.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  document.body.append(box);
  box.querySelector(".btn.primary").focus();
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    for (let i = 0; i < 28; i++) setTimeout(() => {
      const c = el("div", { className: "conf", textContent: ["🎉", "💚", "💖", "✨", "🌸", "🍅"][i % 6], style: `left:${Math.random() * 100}vw;animation-duration:${1.8 + Math.random() * 1.6}s` });
      document.body.append(c);
      setTimeout(() => c.remove(), 3600);
    }, i * 60);
  }
}

// ---- the card ---------------------------------------------------------------------

/** The "now" card (and, on a break, the MilkLove video under it). */
export function nowCard(st, { redraw }) {
  clearInterval(ticker);
  statusAt = Date.now();
  const keep = st.keep || "work", p = st.pomoNow, b = st.onBreak;
  const card = el("section", { className: "card now-card" });
  const row = el("div", { className: "nowc" });
  tipLines = [];
  const top = el("div", { className: "now-top" }, waySwitch(st, redraw));
  put(card, top, row);
  // (the ? tip: what this way is, then how it counts right now)
  const WAY_TIP = { work: L("Work clock: it counts while you're at the computer, task by task.", "工作時鐘：在電腦前就計時，記下每件事。"), both: L("Pomodoro: focus in rounds, with breaks between.", "番茄鐘：一輪專注、一段休息。") };
  queueMicrotask(() => top.append(helpTip([WAY_TIP[keep] || "", ...tipLines].filter(Boolean))));
  const endBtn = () => btn(L("Done for today", "收工"), () => endDay(st, redraw), "btn end-day");
  const counting = keep === "work" ? !b && !st.doneToday && (st.started || st.dayStart !== "ask") : keep === "both" && p?.phase === "focus" && p.pausedLeft == null;
  // (from when the app last counted: a status that arrives for something else mustn't restart the count)
  const from = () => (st.measuredAt && Math.abs(Date.now() - st.measuredAt) < 60e3 ? st.measuredAt : statusAt);
  const workMs = () => st.today + (counting ? Math.max(0, Date.now() - from()) : 0);
  const out = [card];

  if (st.doneToday) {
    withDeco(card, "app-now-done");
    put(row, digital(L("Today altogether", "今天總共"), `${Math.floor(st.today / 3600e3)}:${pad(Math.floor(st.today / 60e3) % 60)}`, "", "var(--primary)", goalBar(st, st.today)),
    el("div", { className: "side" }, pill("off", L("Done for today", "今天收工了")), el("b", { className: "big-line", textContent: L("Well done!", "辛苦了！") }),
      el("p", { className: "muted", style: "margin:0", textContent: L("Nothing counts now. Tomorrow the buddy asks again.", "今天不會再計時了。明天夥伴會再問你要不要開始。") }),
      st.rounds ? el("span", { className: "muted small", textContent: L(`${st.rounds} round${st.rounds === 1 ? "" : "s"} today`, `今天完成 ${st.rounds} 輪`) }) : null,
      el("div", { className: "row-flex" }, btn(L("Carry on after all", "其實還要繼續"), () => { work.act("resume-day"); setTimeout(redraw, 200); }),
        btn(L("The celebration again", "再看一次慶祝"), () => celebrate(st), "linkish"))));
    return out;
  }

  // ---- a break (any way): one screen ----
  if (b) {
    const since = b.since, until = b.until;
    const left = () => (until ? until - Date.now() : Date.now() - since);
    const pct = () => (until ? ((Date.now() - since) / (until - since)) * 100 : 100);
    const kind = catOf("break", b.kind);
    put(row, ring("var(--brk)", pct(), mmss(left()), until ? L("left", "還有") : L("on a break", "休息了"), "break"));
    const side = el("div", { className: "side" }, pill("brk", L("On a break", "休息中")));
    {
      // What it is (the 🍅 break first with the Pomodoro), and how long altogether.
      const kinds = breakCats().filter((c) => keep !== "work" || c.id !== TOMATO_BREAK).sort((x, y) => (y.id === TOMATO_BREAK) - (x.id === TOMATO_BREAK)); // (the 🍅 first)
      const chips = el("div", { className: "row-flex chips" }, el("span", { className: "muted small lead", textContent: L("This break", "這次休息") }),
        kinds.map((c) => btn(catName(c, true), () => { work.act("set-break", `:${c.id}`); }, "chip" + (c.id === b.kind ? " on" : ""))));
      if (picker === "new-kind") {
        const emoji = symbolButton("break", kindSym, (sy) => { kindSym = sy; });
        const name = el("input", { type: "text", maxLength: 40, placeholder: L("e.g. Walk the dog", "例如：遛狗"), style: "width:130px", "aria-label": L("Name", "名稱") });
        const add = btn(L("Add", "新增"), async () => {
          const label = name.value.trim();
          picker = null;
          if (label) { const c = await work.call("saveCategory", "break", { emoji: kindSym, label, zh: label, minutes: 10 }); if (c?.id) work.act("set-break", `:${c.id}`); toast(L(`Added "${label}"`, `已新增「${label}」`)); }
          kindSym = "🌿";
          redraw();
        }, "btn small primary");
        name.addEventListener("keydown", (e) => { if (enterKey(e)) add.click(); });
        put(chips, el("span", { className: "row-flex", "data-open": "1" }, emoji, name, add, btn(L("Cancel", "取消"), () => { picker = null; redraw(); }, "linkish")));
        queueMicrotask(() => name.focus());
      } else put(chips, btn(L("＋ New kind", "＋ 新增種類"), () => { picker = "new-kind"; redraw(); }, "linkish"));
      const mins = b.until ? Math.round((b.until - b.since) / 60e3) : 0;
      const lens = el("div", { className: "row-flex chips" }, el("span", { className: "muted small lead", textContent: L("How long", "多久") }),
        [5, 10, 15, 30, 0].map((m) => btn(m ? L(`${m} min`, `${m} 分鐘`) : L("Until I'm back", "等我回來"), () => work.act("set-break", `${m}:`), "chip" + (m === mins ? " on" : ""))));
      put(side, chips, lens);
      const next = keep === "work" ? [btn(L("I'm back", "我回來了"), () => work.act("end-break"), "btn primary big next")]
        : [btn(L(`Back: start round ${st.rounds + 1}`, `回來了，開始第 ${st.rounds + 1} 輪`), () => work.act("back-next"), "btn tomato big next"),
          btn(L("Not yet", "先不開始"), () => work.act("back-hold"))];
      put(side, el("div", { className: "row-flex" }, next, endBtn()));
      put(side, el("div", { className: "logline", textContent: L(`Logged as one break: ${catName(kind)}${b.pomo && b.kind !== TOMATO_BREAK ? " 🍅" : ""}, ${clock(b.since)} – now. Breaks don't count as work.`,
        `記成一筆：${catName(kind)}${b.pomo && b.kind !== TOMATO_BREAK ? " 🍅" : ""}，${clock(b.since)} – 現在。休息不算工作。`) }));
      put(side, goalBar(st, st.today, keep === "both" ? L(" (focus time only)", "（只算專注的時間）") : ""));
    }
    put(row, side);
    const video = breakCard(st);
    if (video) out.push(video);
    tick(() => {
      setLive("break", mmss(left()));
      setRing("break", pct());
    });
    return out;
  }

  // ---- the work clock ----
  if (keep === "work") {
    if (st.dayStart === "ask" && !st.started) {
      put(row, digital(L("Today", "今天"), "0:00", "", "var(--desk-muted)", goalBar(st, 0)),
        el("div", { className: "side" }, pill("off", st.offToday ? L("Not counting today", "今天不計時") : L("Not started yet", "今天還沒開始")),
          el("b", { className: "big-line", textContent: L("Ready to start?", "準備好開始了嗎？") }),
          el("p", { className: "muted", style: "margin:0", textContent: L("The clock counts from when you press Start. You can write today's focus above first.", "按下開始就會計時。也可以先寫好上面的本日主題。") }),
          el("div", { className: "row-flex" }, btn(st.offToday ? L("Start after all", "還是開始吧") : L("Start today's work", "開始今天的工作"), async () => { await work.call("startDay"); toast(L("Let's go!", "出發！")); }, "btn primary big next"),
            st.offToday ? null : btn(L("Not today", "今天不計時"), async () => { await work.call("skipDay"); toast(L("No clock today", "今天不計時")); }))));
      return out;
    }
    const stretch = () => st.stretch + (counting ? Math.max(0, Date.now() - from()) : 0);
    withDeco(card, "app-now-work");
    put(row, digital(st.name ? L(`"${st.name}" so far`, `「${st.name}」做了`) : L("This stretch", "這一段做了"), mmss(stretch()), "stretch", "var(--primary)", goalBar(st, workMs())),
      el("div", { className: "side" }, pill("work", L("Working", "工作中")), taskPicker(st, L("Working on", "正在做"), redraw),
        el("div", { className: "row-flex" }, btn(L("Take a break", "休息一下"), () => startBreak(st), "btn pinkb big next"), endBtn(), focusBtn()),
        explain(L("It counts while you're at the computer. Away 5 minutes or more, it logs \"away\" and the buddy asks what it was. Reading or working away from the computer? Use Focus screen: it keeps counting.",
          "在電腦前就自動計時。離開 5 分鐘以上會記成「離開」，回來時夥伴會問你去做什麼。要看書、不在電腦前工作？用 專注全螢幕，會一直計時。"))));
    tick(() => { setLive("stretch", mmss(stretch())); setGoal(st, workMs()); });
    return out;
  }

  // ---- the Pomodoro: ready, or a round going on ----
  const both = true; // (a round is always the day's work now)
  const side = el("div", { className: "side" });
  withDeco(card, "app-now-pomo");
  if (p?.phase === "focus") {
    const paused = p.pausedLeft != null, total = p.focus * 60e3;
    const left = () => (paused ? p.pausedLeft : p.endsAt - Date.now());
    put(row, ring("var(--tomato)", (1 - left() / total) * 100, mmss(left()), L("Focus", "專注"), "focus"));
    put(side, pill("tom", paused ? L("Paused", "暫停中") : L("Focusing", "專注中")),
      both ? taskPicker(st, L("This round", "這一輪在做"), redraw) : el("p", { style: "margin:0", textContent: L("One thing at a time.", "一次只做一件事。") }), dots(st),
      el("div", { className: "row-flex" }, btn(paused ? L("Resume", "繼續") : L("Pause", "暫停"), () => host.pomo(paused ? "alarm-resume" : "alarm-pause")),
        btn(L("Break now", "現在就休息"), () => host.pomo("alarm-skip")), endBtn(), focusBtn(),
        btn(L("End this round", "結束這一輪"), () => host.pomo("alarm-cancel"), "linkish")));
    if (both) put(side, goalBar(st, workMs(), L(" (focus time only)", "（只算專注的時間）")));
    if (host?.breakVideo && st.breakVideos !== false) put(side, el("div", { className: "pomo-tip" },
      el("span", { textContent: L("When this round ends, your break starts by itself, with a MilkLove surprise", "這一輪結束會自動休息，還有 MilkLove 小驚喜") })));
    tick(() => { setLive("focus", mmss(left())); setRing("focus", (1 - left() / total) * 100); if (both) setGoal(st, workMs(), L(" (focus time only)", "（只算專注的時間）")); });
  } else {
    put(row, ring("var(--tomato)", 0, `${st.pomo?.focus || 25}:00`, L("Focus", "專注")));
    put(side, pill("off", L(`Ready for round ${st.rounds + 1}`, `準備開始第 ${st.rounds + 1} 輪`)),
      both ? taskPicker(st, L("This round", "這一輪要做"), redraw) : null, dots(st),
      el("div", { className: "row-flex" }, btn(L("Start a round", "開始一輪"), () => { host.pomo("start"); toast(L("Focus!", "開始專注！")); }, "btn tomato big next"),
        btn(L("Take a break", "休息一下"), () => startBreak(st)), st.started || st.rounds ? endBtn() : null, focusBtn()));
    put(side, goalBar(st, st.today, L(" (focus time only)", "（只算專注的時間）")),
      el("div", { className: "len-info" }, lengthsPicker(st, redraw), pomoInfo()),
      explain(L(`Each round counts as today's work, under "${st.name || L("what you're working on", "正在做的事")}"; the time between rounds doesn't.`,
        `每一輪都算進今天的工作，記在「${st.name || "正在做的事"}」底下；兩輪之間不算。`)));
  }
  put(row, side);
  return out;
}

/** "Take a break": straight to the break screen, with the first kind of break (change it there). */
function startBreak(st) {
  const c = breakCats().find((x) => x.id === "coffee") || breakCats().find((x) => x.id !== TOMATO_BREAK) || breakCats()[0];
  work.act("start-break", `${c?.minutes || 15}:${c?.id || "other"}`);
}

// (four times a second, writing only what changed: the seconds turn over on time, never held or skipped)
function tick(fn) { ticker = setInterval(() => { if (!document.querySelector(".now-card")) { clearInterval(ticker); return; } fn(); }, 250); }
function setLive(key, text) { document.querySelectorAll(`[data-live="${key}"]`).forEach((x) => { if (x.textContent !== text) x.textContent = text; }); }
function setRing(key, pct) { document.querySelectorAll(`[data-live="${key}-ring"]`).forEach((x) => x.style.setProperty("--p", String(Math.max(0, Math.min(100, pct))))); }
function setGoal(st, ms, note = "") {
  const g = goal(st);
  document.querySelectorAll('[data-live="goalbar"]').forEach((x) => (x.style.width = `${g ? Math.min(100, (ms / g) * 100) : 0}%`));
  setLive("goaltext", goalText(st, ms, note));
}

/** A note at the bottom with Undo, for a while (switching the way of keeping time). */
function undoNote(text, undo) {
  document.querySelector(".undo-note")?.remove();
  const n = el("div", { className: "undo-note", role: "status" }, el("span", { textContent: text }));
  const b = btn(L("Undo", "復原"), () => { n.remove(); undo(); }, "linkish");
  n.append(b, btn("✕", () => n.remove(), "linkish close"));
  document.body.append(n);
  setTimeout(() => n.remove(), 15000);
}

/** A picker is open (a redraw from the clock would close it). */
export const nowBusy = () => !!picker || !!document.querySelector(".cele:not(.pins-cele)");
/** Open the task picker on a new task (the menu's "Name what I'm working on…"). */
export function askNewTask() { picker = "new-task"; }
export { wayName };
