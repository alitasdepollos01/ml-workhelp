// Today: the two ways of keeping time, the focus of the day, the "now" card (today-now.js:
// the work clock, the Pomodoro, a break, 收工), and today's log, every entry editable where
// it is (name, times, category, note; work ⇄ break; delete), time away to label, and time
// you forgot to add.

import { L, el, work, state, host, hm, clock, catName, catColor, catOf, deco, toast, enterKey, pageTop, LOC } from "./app-common.js";
import { waysRow, nowCard, askNewTask } from "./today-now.js";
import { dayLog } from "./day-log.js";
import { wordCard } from "./word-card.js";
import { icon } from "./icons.js";
import { startTour } from "./tour.js";

let goTab = null;
export function renderToday(main, { ask, redraw, go: goTo }) {
  goTab = goTo;
  const st = state.st;
  if (!st) { main.append(el("p", { className: "muted", textContent: L("This window is part of the ML WorkHelp desktop app.", "這個視窗要在 ML WorkHelp 桌面 App 裡才能用。") })); return; }
  const sessions = (st.sessions || []).slice().sort((a, b) => a.start - b.start);
  const names = [...new Set([st.name, ...(st.recentNames || []), ...sessions.filter((x) => x.kind === "work" && x.name).map((x) => x.name)].filter(Boolean))];
  const datalist = el("datalist", { id: "task-names" }, names.map((n) => new Option(n)));

  // ---- focus of the day ----
  const focusIn = el("input", { type: "text", maxLength: 120, value: st.focus || "", id: "focus", className: "pt-focus",
    placeholder: L("What's today about?", "今天想專心做什麼？"), title: L("e.g. Finish chapter 3", "例如：寫完第三章"), "aria-label": L("Focus of the day", "本日主題") });
  focusIn.addEventListener("change", async () => { await work.call("setFocus", focusIn.value); toast(L("Today's focus saved", "已儲存本日主題")); });
  focusIn.addEventListener("keydown", (e) => { if (enterKey(e)) focusIn.blur(); });
  // The page's top: a line for the day (one of the start-of-day lines, yours too, picked at random when the
  // window opens), the date and how the day's going, and the tour.
  const date = new Date().toLocaleDateString(LOC, { weekday: "long", day: "numeric", month: "long" });
  const sofar = L(`${hm(st.today)} done`, `已工作 ${hm(st.today)}`) + (st.goal ? L(` of ${st.goal} h`, ` / 目標 ${st.goal} 小時`) : "") + (st.rounds ? L(` · ${st.rounds} Pomodoro${st.rounds === 1 ? "" : "s"}`, ` · 番茄鐘 ${st.rounds} 輪`) : "");
  const tourBtn = el("button", { type: "button", className: "btn small", textContent: L("Show me around", "帶我看看") });
  tourBtn.addEventListener("click", () => startTour(goTab));
  const topBand = pageTop({ title: dayLine(st), sub: `${date} · ${sofar}`, side: tourBtn, className: "today-top-band" });
  // The focus of the day (its sticker beside it) above what's next; the Thai word card beside them.
  const focusBox = el("section", { className: "card focus-box" }, el("span", { className: "lbl", textContent: L("Focus of the day", "本日主題") }), focusIn, deco("app-today-left", ""));
  const top = el("section", { className: "today-mid" },
    el("div", { className: "col" }, focusBox, nextUp(st)),
    el("div", { className: "col" }, wordCard()));

  if (ask?.name) askNewTask();
  const now = nowCard(st, { redraw });

  // ---- today's totals ----
  const by = new Map();
  let workMs = 0, breakMs = 0;
  for (const x of sessions) {
    const ms = x.kind === "work" ? x.worked : x.end - x.start;
    if (x.kind === "work") workMs += ms; else if (x.kind === "break") breakMs += ms;
    const k = x.kind === "away" ? "away" : `${x.kind}:${x.kind === "work" ? x.cat : x.type}`;
    by.set(k, (by.get(k) || 0) + ms);
  }
  const total = [...by.values()].reduce((a, b) => a + b, 0) || 1;
  const parts = [...by].map(([k, ms]) => {
    const [kind, id] = k.split(":");
    return { k, ms, color: k === "away" ? "var(--away)" : catColor(kind, id), name: k === "away" ? L("Away", "離開") : catName(catOf(kind, id), true) };
  });
  const goal = st.goal ? L(` · goal ${st.goal} h`, ` · 目標 ${st.goal} 小時`) : "";
  const head = el("section", { style: "display:grid;gap:6px" },
    el("div", { className: "spread" }, el("h2", { textContent: L("Today", "今天") }),
      el("span", { className: "muted", textContent: L(`Work ${hm(st.today)} · breaks ${hm(breakMs)}`, `工作 ${hm(st.today)} · 休息 ${hm(breakMs)}`) + goal })),
    el("div", { className: "stack", role: "img", "aria-label": parts.map((p) => `${p.name} ${hm(p.ms)}`).join(", ") },
      parts.map((p) => el("i", { style: `width:${(p.ms / total) * 100}%;background:${p.color}`, title: `${p.name} ${hm(p.ms)}` }))),
    el("div", { className: "legend" }, parts.map((p) => { const s = el("span", { textContent: `${p.name} ${hm(p.ms)}` }); s.style.setProperty("--c", p.color); return s; })));

  // ---- the entries: a timeline and a row for each, click one to change it (day-log.js) ----
  const list = el("section", { className: "entries", "aria-label": L("Today's entries", "今天的紀錄") },
    sessions.length ? dayLog(new Date().setHours(0, 0, 0, 0), sessions, { redraw, ms: true })
      : el("div", { className: "empty" }, deco("app-reminders-empty", "", "position:static"), L("Nothing logged yet today.", "今天還沒有紀錄。")));

  main.append(datalist, topBand, ...(st.whatsNew ? [whatsNewCard(st.whatsNew)] : []), waysRow(st, redraw), ...now, top, head, list);
  if (ask?.word) requestAnimationFrame(() => main.querySelector(".word-card")?.scrollIntoView({ block: "center", behavior: "smooth" }));
  if (ask?.focusTheme) focusIn.focus();
}

/** Today's line at the top: a start-of-day line (the app's and your own), one picked when the window opens. */
let dayLinePick = null;
function dayLine(st) {
  const all = [...(st.startPresets || []).map((x) => L(...x)), ...(st.startLines || [])].filter(Boolean);
  if (!all.length) return L("Hi! Let's have a good day", "嗨！今天也一起加油");
  if (dayLinePick == null || dayLinePick >= all.length) dayLinePick = Math.floor(Math.random() * all.length);
  return all[dayLinePick];
}

/** The next reminder or event (the dachshund comes along), or "nothing coming up" with Add. */
function nextUp(st) {
  const now = Date.now(), end = new Date().setHours(24, 0, 0, 0);
  const when = (r) => (r.kind === "event" ? r.start : r.at);
  const next = (st.reminders || []).filter((r) => !r.fired && when(r) >= now && when(r) < end).sort((a, b) => when(a) - when(b))[0];
  const go = el("button", { type: "button", className: "btn small", textContent: next ? L("All", "全部") : L("Add one", "新增") });
  go.addEventListener("click", () => goTab?.("reminders"));
  if (!next) return el("section", { className: "card next-card" }, el("span", { className: "ic" }, icon("reminders")),
    el("div", { className: "nx" }, el("span", { className: "lbl", textContent: L("Next up", "接下來") }), el("span", { className: "muted", textContent: L("Nothing else today.", "今天沒有其他提醒了。") })), go);
  const mins = Math.max(1, Math.round((when(next) - now) / 60e3));
  const inT = mins < 60 ? L(`in ${mins} min`, `${mins} 分鐘後`) : L(`in ${Math.floor(mins / 60)} h ${mins % 60} min`, `${Math.floor(mins / 60)} 小時 ${mins % 60} 分鐘後`);
  return el("section", { className: "card next-card" }, el("span", { className: "ic" }, icon("reminders")),
    el("div", { className: "nx" }, el("span", { className: "lbl" }, L("Next up · ", "接下來 · ") + inT, deco("app-rem-next", "")),
      el("div", { className: "ell" }, el("span", { className: "when", textContent: clock(when(next)) }), next.text)), go);
}

/** Just updated: this version's short notes, once, until "Got it". */
function whatsNewCard({ version, text }) {
  const got = el("button", { type: "button", className: "btn primary small", textContent: L("Got it", "知道了") });
  got.addEventListener("click", () => { card.remove(); work.act("whats-new-seen"); });
  const all = el("button", { type: "button", className: "btn small", textContent: L("All versions", "所有版本") });
  all.addEventListener("click", () => host?.settingText("openPage", "page"));
  const card = el("section", { className: "card whats-new" }, deco("app-menu", ""),
    el("div", {}, el("b", { textContent: L(`New in ${version}`, `${version} 有什麼新功能`) }), el("p", { className: "muted", textContent: text }),
      el("div", { className: "row-flex" }, got, all)));
  return card;
}
