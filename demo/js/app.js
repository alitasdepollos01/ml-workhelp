// The app's window: Today, Reminders, This week, Settings, Stickers and Photo
// credits, one tab at a time (app.html). The work clock and everything in it
// live in the desktop app (app/desktop/work.js); a tab shows them and asks
// for changes. Opened on a tab by the menus: #{"tab":"reminders","in":15}.

import { translatePage } from "./i18n.js";
import { L, $, el, host, work, state, loadDeco, deco } from "./app-common.js";
import { renderToday } from "./tab-today.js";
import { renderReminders } from "./tab-reminders.js";
import { renderWeek, dataState } from "./tab-week.js";
import { renderSettings, settingsGroup } from "./tab-settings.js";
import { renderStickers } from "./tab-stickers.js";
import { renderCredits } from "./tab-credits.js";
import { renderBuddy } from "./tab-buddy.js";
import { renderHelp } from "./tab-help.js";
import { nowBusy } from "./today-now.js";
import { openFocus, focusUpdate } from "./focus-screen.js";
import { dayLogBusy } from "./day-log.js";
import { startTour, tourOn, tourSteps } from "./tour.js";
import { icon } from "./icons.js";
import { wordMini } from "./word-card.js";

const TABS = [
  ["today", "", "Today", "今天", renderToday],
  ["reminders", "", "Reminders & events", "提醒與活動", renderReminders],
  ["week", "", "Data", "數據", renderWeek],
  ["stickers", "", "Stickers", "貼圖", renderStickers],
  ["buddy", "", "Desktop buddy", "桌面夥伴", renderBuddy],
  ["credits", "", "Photo credits", "照片來源", renderCredits],
  ["settings", "", "Settings", "設定", renderSettings],
  ["help", "", "Help", "幫助", renderHelp, true], // (not in the list: Muv opens it)
];
let tab = "today";
let ask = {};       // what the menu asked for (a reminder time, a sticker's photo…)
let lastDraw = 0;

// Each tab's own parts, opened under it in the menu while it's the one shown: Settings' six groups,
// Data's three tabs.
const SUB = {
  settings: [["look", "Look & menu bar", "外觀與選單列"], ["keep", "Keeping time & the day", "計時與每天的節奏"],
    ["rem", "Reminders & events", "提醒與活動"], ["cats", "Categories", "分類"], ["about", "About & updates", "關於與更新"]],
  week: [["sum", "Summary", "總覽"], ["ana", "Analysis", "分析"], ["cal", "Calendar", "日曆"]],
};
/** Settings: scroll to a card, with a little flash so you see where you've landed. */
export function showCard(sel) {
  const c = document.querySelector(`main ${sel}`);
  if (!c) return false;
  c.scrollIntoView({ behavior: "smooth", block: "start" });
  c.classList.remove("flash"); void c.offsetWidth; c.classList.add("flash");
  return true;
}
let lastSub = null; // the part just clicked in the menu (and when)
function subOn() {
  // The part you're on: Data's tab; Settings' group.
  if (tab === "week") return dataState().tab;
  if (tab === "settings") return settingsGroup();
  return null;
}
function markSub() {
  const on = subOn();
  document.querySelectorAll("#nav .sub button").forEach((b) => b.classList.toggle("on", b.dataset.sub === on));
}
function renderNav() {
  // Work things first; then the fan corner (stickers, the desktop buddy, credits); Settings, the word
  // of the day and Muv at the bottom.
  const item = ([id, , en, zh]) => {
    const b = el("button", { type: "button", className: tab === id ? "on" : "", "data-tab": id }, icon(id) || el("span"), el("span", { className: "t", textContent: L(en, zh) }));
    if (tab === id) b.setAttribute("aria-current", "page");
    b.addEventListener("click", () => (id === "settings" ? go(id, { group: null }) : go(id))); // (Settings opens on its overview, all the cards)
    if (!SUB[id]) return [b];
    const sub = el("div", { className: "sub", "aria-hidden": String(tab !== id) }, el("div", {}, SUB[id].map(([key, sen, szh, onPage]) => {
      const s = el("button", { type: "button", "data-sub": key, tabIndex: tab === id ? 0 : -1 }, L(sen, szh));
      s.addEventListener("click", () => {
        if (id === "week") return go("week", { tab: key });
        go("settings", { group: key });
      });
      return s;
    })));
    // (slides open just after the tab's drawn: from closed, so it's seen opening)
    if (tab === id) requestAnimationFrame(() => requestAnimationFrame(() => { sub.classList.add("open"); markSub(); }));
    return [b, sub];
  };
  const T = (id) => TABS.find((t) => t[0] === id);
  const buddyBtn = el("button", { type: "button", className: tab === "buddy" ? "on" : "", "data-tab": "buddy", ...(tab === "buddy" ? { "aria-current": "page" } : {}) }, icon("buddy") || el("span"), el("span", { className: "t", textContent: L("Desktop buddy", "桌面夥伴") }));
  buddyBtn.addEventListener("click", () => go("buddy"));
  $("nav").replaceChildren(
    ...item(T("today")), ...item(T("reminders")), ...item(T("week")),
    el("div", { className: "nav-h", textContent: L("Fan corner", "粉絲角落") }),
    ...item(T("stickers")), buddyBtn, ...item(T("credits")),
    el("div", { className: "nav-foot" }, wordMini(() => go("today", { word: true })), ...item(T("settings")), muvHelp()));
}
/** Muv at the bottom: "Need help?" when you point at it; click for Help. */
function muvHelp() {
  const b = el("button", { type: "button", className: "muv-help" + (tab === "help" ? " on" : ""), title: L("Help & questions", "幫助與常見問題"), "aria-label": L("Help & questions", "幫助與常見問題") },
    el("span", { className: "muv-say", textContent: L("Need help?", "需要幫忙嗎？") }), deco("app-menu", "", "position:static"));
  b.addEventListener("click", () => go("help"));
  return b;
}


/** Draw the current tab (keeping the scroll, and the field you were typing in). */
let lastSig = null; // (what Reminders was last drawn from)
const remSig = (st) => JSON.stringify(st?.reminders || []) + Math.floor(Date.now() / 60e3);
// Today: redrawn when what it shows changes (and once a minute for the totals); its clocks tick by themselves.
// Redrawing every few seconds swapped the buttons under your pointer, and a click could get lost.
const todaySig = (st) => !st ? "" : JSON.stringify([st.keep, st.started, st.offToday, st.doneToday, st.name, st.cat, st.focus, st.rounds, st.onBreak, st.goal,
  st.pomoNow && [st.pomoNow.phase, st.pomoNow.round, st.pomoNow.pausedLeft != null, st.pomoNow.endsAt], st.pomoKind, st.pomoCustom, st.recentNames,
  (st.sessions || []).map((x) => [x.id, x.kind, x.name, x.cat, x.type, x.note, x.start, x.open ? 0 : x.end, x.open ? 0 : x.worked])]) + Math.floor(Date.now() / 60e3);
export function draw() {
  lastSig = tab === "reminders" ? remSig(state.st) : tab === "today" ? todaySig(state.st) : null;
  const main = $("main");
  const y = window.scrollY;
  // A fresh box each time: a slow tab (This week) that finishes late fills a box no longer shown.
  const page = el("div", { className: "page", style: "display:grid;gap:14px;align-content:start;min-width:0" });
  const fn = TABS.find((t) => t[0] === tab)[4];
  const token = ++drawToken, sameTab = main.dataset.tab === tab;
  // A page that loads first (Data, Photo credits) is built out of sight and swapped in when it's ready,
  // so redrawing it doesn't flash a blank page; another tab shows at once.
  if (!sameTab || fn.constructor.name !== "AsyncFunction") { main.replaceChildren(page); main.dataset.tab = tab; }
  const done = fn(page, { ask, redraw: draw, go });
  ask = {};
  lastDraw = Date.now();
  const show = () => { if (token !== drawToken) return; if (page.parentNode !== main) main.replaceChildren(page); window.scrollTo(0, y); markSub(); };
  if (done && typeof done.then === "function") Promise.resolve(done).then(show, (e) => { console.error(e); show(); });
  else show();
}
let drawToken = 0;
let lastBuddySig = null;
const buddySig = (st) => JSON.stringify([st?.deskOut, st?.hiddenUntil, st?.deskWho, st?.thai, st?.keep, (st?.screens || []).length, st?.deskScreen]);

function go(id, more = {}) {
  // (Settings' old "Desktop buddy & Thai" group is a page of its own now)
  if (id === "settings" && (more?.group === "buddy" || more?.card === ".buddy-card" || more?.card === ".thai-card")) { more = more.card === ".thai-card" ? { card: "#g-thai" } : {}; id = "buddy"; }
  if (!TABS.some((t) => t[0] === id)) id = "today";
  if (id !== tab || more.tab || more.range || (more && "group" in more)) window.scrollTo(0, 0); // (another tab, or another part of it: from the top)
  if (id !== tab) {
    // A popup belongs to the tab it came from.
    document.querySelectorAll(".viewer").forEach((v) => v.close ? v.close() : v.remove());
  }
  tab = id;
  ask = more;

  document.title = L("ML WorkHelp", "ML WorkHelp") + " · " + L(...TABS.find((t) => t[0] === id).slice(2, 4));
  renderNav();
  draw();
  if (more.tour) setTimeout(() => startTour(go), 400); // (after the welcome window, or Settings → About)
  if (more.focus) openFocus(); // (⛶ the focus screen: from the menus, or a round starting)
}

/** Typing or choosing something in the page: not now. */
const busy = () => {
  const a = document.activeElement;
  return a && $("main").contains(a) && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName) || document.querySelector(".viewer") || (tab === "today" && nowBusy()) || ((tab === "today" || tab === "week") && dayLogBusy());
};

async function start() {
  translatePage();
  await loadDeco();
  state.st = (await work?.status()) || null;
  let first = {};
  try { first = JSON.parse(decodeURIComponent(location.hash.slice(1)) || "{}"); } catch { /* none */ }
  host?.onCommand?.((cmd, arg) => {
    if (cmd === "work") {
      state.st = arg;
      focusUpdate(arg);
      // Today and Reminders follow the clock; the rest when it's worth it.
      // (Data: at once while a day's log is open there, so a change made in it shows)
      const every = { today: 0, reminders: 0, week: document.querySelector(".day-panel") ? 0 : 60e3 }[tab];
      // Reminders: only when they change (and once a minute, for "in 40 min"): redrawing it every
      // few seconds swapped the buttons under your pointer.
      if (tab === "reminders" && remSig(arg) === lastSig) return;
      if (tab === "today" && todaySig(arg) === lastSig) return;
      if (tab === "buddy") { const sig = buddySig(arg); if (sig !== lastBuddySig && !busy()) { lastBuddySig = sig; draw(); } return; }
      if (every != null && !busy() && Date.now() - lastDraw >= every) draw();
    } else if (cmd === "ask") {
      go(arg?.tab || tab, arg || {});
    } else if (cmd === "theme") {
      if (tab === "settings") draw();
    }
  });
  // Reloaded (a new language, photos reloaded): back where you were.
  if (performance.getEntriesByType?.("navigation")[0]?.type === "reload") {
    try { const w = JSON.parse(sessionStorage.getItem("mlwh:where") || "null"); if (w?.tab) first = { tab: w.tab, ...(w.tab === "settings" ? { group: w.group } : {}), ...(w.tab === "week" ? { range: w.range } : {}) }; } catch { /* fine */ }
  }
  // (where you are, kept as the window goes: a new language reloads it, and it comes back here, not to the first tab)
  addEventListener("pagehide", () => { try { sessionStorage.setItem("mlwh:where", JSON.stringify({ tab, group: settingsGroup(), range: dataState().range })); } catch { /* fine */ } });
  go(first.tab || "today", first);
}

window.__mlwhApp = { go, draw, tab: () => tab, state, tour: () => startTour(go), tourAt: tourOn, tourSteps };
start();

// Point at any sticker: whose photo it is (deco.json "by", app-common.js deco()).
{
  const tip = el("div", { className: "credit-tip", role: "tooltip" });
  document.body.append(tip);
  document.addEventListener("pointermove", (e) => {
    const t = e.target.closest?.("[data-credit]");
    if (!t?.dataset.credit) { tip.classList.remove("on"); return; }
    tip.textContent = t.dataset.credit;
    tip.classList.add("on");
    tip.style.left = Math.max(6, Math.min(innerWidth - tip.offsetWidth - 6, e.clientX + 12)) + "px";
    tip.style.top = Math.min(innerHeight - tip.offsetHeight - 6, e.clientY + 18) + "px";
  }, { passive: true });
  document.addEventListener("pointerleave", () => tip.classList.remove("on"));
}
