// Settings: a home page (what's changed most often, and a tile for each of five groups, with what it's
// set to now), and each group on a page of its own: look & the menu bar;
// keeping time & the day (the two ways, the focus screen, the Pomodoro's lengths, breaks, goals, starting the day);
// reminders & events (the sound, Apple Reminders, Apple Calendar); categories; about & updates.
// "Find a setting" searches all of them.

import { stylePicker } from "./style-pick.js";
import { L, el, host, work, state, deco, toast, saveCategoryFromText, enterKey, thaiNote, pageTop, pageSub } from "./app-common.js";
import { connectCard, known } from "./connect.js";
import { lengthsPicker } from "./tab-pomodoro.js";
import { startTour } from "./tour.js";
import { openFocus } from "./focus-screen.js";
import { PHOTOGRAPHERS } from "./focus-photos.js";
import { buddySearchIndex } from "./tab-buddy.js";
import { REMINDER_SOUNDS, playSound } from "./alarm.js";
import { icon } from "./icons.js";
import { LOOK_DEFAULTS, lookControls } from "./clock-look.js";
import { doodlesCard } from "./look-card.js";
import { T as T3, call as pinsCall, api as pinsApi, load as pinsLoad, ensureCss as pinsCss, nameOf as pinName } from "./pins-common.js";   // (track B2: Settings › Pins)
import { celebrate as pinsMoment, enterCode as pinsCode } from "./pins-moment.js";

const SWATCH = { matcha: ["#86c79b", "#f3aac0"], mint: ["#6ed6aa", "#ffa6c4"], rose: ["#f0a9bf", "#93cfa9"], lavender: ["#b6a5e6", "#ffc3a3"], sky: ["#8fbfee", "#ffe083"], classic: ["#1f2340", "#e8508a"] };

const field = (label, ...ctrl) => el("label", { className: "field" }, el("span", { textContent: label }), el("span", { className: "inline" }, ...ctrl));
function number(value, { min, max, step = 1, onChange, label }) {
  const i = el("input", { type: "number", min, max, step, value, "aria-label": label });
  i.addEventListener("change", () => { const v = Math.min(max, Math.max(min, Number(i.value) || 0)); i.value = v; onChange(v); toast(L("Saved", "已儲存")); });
  return i;
}
function check(on, onChange, label) {
  const c = el("input", { type: "checkbox", checked: !!on, "aria-label": label });
  c.addEventListener("change", () => { onChange(c.checked); toast(L("Saved", "已儲存")); });
  return c;
}
/** "Find a setting": every setting in every group, by its words; pick one and its group opens there, the setting flashing. */
function searchBox(go) {
  const box = el("div", { className: "set-search" });
  const input = el("input", { type: "search", placeholder: L("Find a setting (e.g. sound, calendar, weekend)", "找設定（例如：音效、行事曆、週末）"), "aria-label": L("Find a setting", "找設定") });
  const list = el("div", { className: "set-results", role: "listbox", hidden: true });
  const index = () => {
    if (searchIndex) return searchIndex;
    // (every group, drawn once off-screen, for its words)
    searchIndex = [];
    for (const g of GROUPS()) {
      const tmp = el("div");
      try { g.draw(tmp, () => {}, go); } catch { /* (a part that needs the window) */ }
      for (const sec of tmp.querySelectorAll("section")) {
        const card = sec.querySelector("h3")?.textContent || "";
        if (card) searchIndex.push({ group: g, label: card, sel: null });
        for (const f of sec.querySelectorAll(".field")) { const label = f.firstElementChild?.textContent || ""; if (label) searchIndex.push({ group: g, label, sel: label }); }
      }
    }
    // (and the Desktop buddy page's: they open there)
    const page = { id: "buddy-page", title: L("Desktop buddy", "桌面夥伴"), words: "buddy stickers size calls lines thai words hide screen 夥伴 貼圖 大小 通話 泰文 單字 躲 螢幕" };
    for (const x of buddySearchIndex()) searchIndex.push({ group: page, label: x.label, sel: x.field, card: x.card });
    return searchIndex;
  };
  const show = () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { list.hidden = true; return; }
    // (a setting whose name says it first; then the ones whose group is about it)
    const byName = index().filter((x) => x.label.toLowerCase().includes(q));
    const hits = (byName.length ? byName : index().filter((x) => (x.group.title + " " + x.group.words).toLowerCase().includes(q))).slice(0, 8);
    list.replaceChildren(...(hits.length ? hits.map((x) => {
      const b = el("button", { type: "button", role: "option" }, el("b", { textContent: x.label }), el("span", { className: "muted", textContent: ` · ${x.group.title}` }));
      b.addEventListener("click", () => { list.hidden = true; input.value = "";
        if (x.group.id === "buddy-page") return go("buddy", x.card ? { card: x.card } : { field: x.sel });
        go("settings", { group: x.group.id, field: x.sel, cardTitle: x.sel ? null : x.label }); });
      return b;
    }) : [el("span", { className: "muted", textContent: L("Nothing like that here.", "這裡沒有相關的設定。") })]));
    list.hidden = false;
  };
  input.addEventListener("input", show);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") list.querySelector("button")?.click(); if (e.key === "Escape") { input.value = ""; list.hidden = true; } });
  input.addEventListener("blur", () => setTimeout(() => { list.hidden = true; }, 200));
  box.append(input, list);
  return box;
}

/** A reminder's and event's sound: which one (▶ to hear it), and how loud. */
function soundField(st) {
  const pick = el("select", { "aria-label": L("Reminder sound", "提醒音效") }, REMINDER_SOUNDS.map(([k, en, zh]) => el("option", { value: k, textContent: L(en, zh), selected: k === st.sound })));
  const vol = el("input", { type: "range", min: 0, max: 100, step: 5, value: st.soundVolume ?? 70, "aria-label": L("Volume", "音量") });
  const play = el("button", { type: "button", className: "btn", textContent: "▶", title: L("Hear it", "聽聽看") });
  const hear = () => playSound(pick.value, vol.value);
  play.addEventListener("click", hear);
  pick.addEventListener("change", () => { state.st.sound = pick.value; host.settingText("sound", pick.value); toast(L("Saved", "已儲存")); hear(); });
  vol.addEventListener("change", () => { state.st.soundVolume = Number(vol.value); work.setting("soundVolume", Number(vol.value)); toast(L("Saved", "已儲存")); hear(); });
  return el("div", { className: "field" }, el("span", { textContent: L("Reminder and event sound", "提醒和活動的音效") }),
    el("div", { className: "sound-pick" }, pick, play, el("span", { className: "small muted", textContent: L("Volume", "音量") }), vol));
}
function seg(options, value, onChange, label) {
  const group = el("div", { className: "days-pick", role: "radiogroup", "aria-label": label });
  group.append(...options.map(([v, t]) => {
    const b = el("button", { type: "button", className: v === value ? "on" : "", textContent: t, role: "radio", "aria-checked": String(v === value) });
    b.addEventListener("click", () => {
      // (shows the choice at once: the app's status, and a redraw from it, can come a moment later)
      for (const x of group.children) { x.classList.toggle("on", x === b); x.setAttribute("aria-checked", String(x === b)); }
      onChange(v);
    });
    return b;
  }));
  return group;
}

/**
 * Starting the day: the buddy asks each day (and the clock counts from Start), or
 * the clock just counts; what time it starts asking; and the line it asks with:
 * a different one each day, or one of them (yours too).
 */
function startCard(st, redraw) {
  const save = (k, v) => { host.settingText(k, v); toast(L("Saved", "已儲存")); };
  const later = () => setTimeout(redraw, 150);
  const opt = (on, title, sub, onPick, extra = {}) => {
    const r = el("input", { type: "radio", checked: on, name: extra.name || "", "aria-label": title });
    const box = el("label", { className: "start-opt" + (on ? " on" : "") }, r, el("span", {}, el("b", { textContent: title }), sub ? el("small", { textContent: sub }) : null), extra.after || null);
    r.addEventListener("change", () => { if (r.checked) onPick(); });
    return box;
  };
  const presets = (st.startPresets || []).map(([en, zh], i) => ({ id: "p" + i, text: L(en, zh) }));
  const mine = (st.startLines || []).map((t, i) => ({ id: "m" + i, text: t, mine: true }));
  const pick = st.startPick || "random";
  const lines = [...presets, ...mine].map((x) => {
    let del = null;
    if (x.mine) {
      del = el("button", { type: "button", className: "del", textContent: "✕", title: L("Remove", "移除"), "aria-label": L(`Remove “${x.text}”`, `移除「${x.text}」`) });
      del.addEventListener("click", (e) => { e.preventDefault(); save("startLines", JSON.stringify((st.startLines || []).filter((_, i) => "m" + i !== x.id))); later(); });
    }
    return opt(pick === x.id, x.text, "", () => { save("startPick", x.id); later(); }, { name: "start-line", after: del });
  });
  const add = el("input", { type: "text", maxLength: 80, placeholder: L("＋ Write your own, e.g. Three more days to the fan meeting!", "＋ 自己寫一句，例如：再三天就是見面會了！"), "aria-label": L("Your own line", "自己寫一句") });
  const addBtn = el("button", { type: "button", className: "btn small", textContent: L("Add", "新增") });
  const addIt = () => {
    const v = add.value.trim();
    if (!v) return;
    const list = [...(st.startLines || []), v];
    host.settingText("startLines", JSON.stringify(list));
    host.settingText("startPick", "m" + (list.length - 1));
    toast(L("Added", "已新增"));
    later();
  };
  addBtn.addEventListener("click", addIt);
  add.addEventListener("keydown", (e) => { if (enterKey(e)) addIt(); });
  const from = el("input", { type: "time", value: st.askFrom || "07:00", "aria-label": L("Ask from", "幾點之後才問") });
  from.addEventListener("change", () => { if (from.value) save("askFrom", from.value); });
  const ask = st.dayStart !== "auto";
  return el("section", { className: "card start-card" }, el("h3", { textContent: L("Starting the day", "每天開始") }),
    opt(ask, L("Ask me each day, and count from when I press Start", "每天問我，按下「開始」才計時"),
      L("The buddy comes out the first time you're at the computer each day, with one of the lines below.", "每天第一次坐到電腦前時，夥伴會出來說下面其中一句話。"), () => { save("dayStart", "ask"); later(); }, { name: "day-start" }),
    opt(!ask, L("Start counting as soon as I'm at the computer", "一坐到電腦前就開始計時"), L("No question: the clock just runs.", "不用問，直接開始計時。"), () => { save("dayStart", "auto"); later(); }, { name: "day-start" }),
    ask ? field(L("Ask from", "幾點之後才問"), from) : null,
    ask ? el("h3", { textContent: L("What the buddy says", "夥伴要說什麼"), style: "margin-top:4px" }) : null,
    ask ? opt(pick === "random", L("A different one each day", "每天換一句"), L("Takes turns through all of them, yours too.", "全部輪流說（包括你自己寫的）。"), () => { save("startPick", "random"); later(); }, { name: "start-line" }) : null,
    ...(ask ? lines : []),
    ask ? el("div", { className: "row-flex" }, add, addBtn) : null);
}


// ---- the five groups: what's in each, and a line of what it's set to now (the home page's tiles) ----

let group = null; // the group open, or null for the home page
const KEEP_NAME = () => ({ work: L("Work clock", "工作時鐘"), pomo: L("Pomodoro", "番茄鐘"), both: L("Pomodoro", "番茄鐘") }); // ("both" is the Pomodoro now)
function GROUPS() {
  const st = state.st || {}, th = host.themes?.();
  const theme = th?.themes?.find((t) => t.id === th.theme)?.name || "";
  const goal = st.dailyGoal ? L(`${st.dailyGoal} h a day`, `每天 ${st.dailyGoal} 小時`) : L("no goal", "沒設目標");
  const soundName = (REMINDER_SOUNDS.find(([k]) => k === st.sound) || [, "", ""]).slice(1);
  const conn = (a) => (a?.access === "full" && a.on ? L("connected", "已連結") : L("not connected", "未連結"));
  const k = known();
  return [
    { id: "look", title: L("Look & menu bar", "外觀與選單列"), words: "theme colour language dark light menu bar doodles wallpaper 顏色 語言 深色 淺色 選單列 塗鴉 壁紙",
      sum: [theme, { zh: "繁體中文", th: "ไทย" }[host.lang] || "English", { system: L("like my Mac", "跟系統一樣"), light: L("light", "淺色"), dark: L("dark", "深色") }[st.appearance || "system"]].filter(Boolean).join(" · "),
      has: L("Colour, language, light or dark, the menu bar", "顏色、語言、深淺色、選單列"), draw: lookGroup },
    pinsCard(), // (1.3.0, track B2: Settings › Pins, a page of its own)
    { id: "keep", title: L("Keeping time & the day", "計時與每天的節奏"), words: "keep time pomodoro break reminder video goal weekend start day focus screen full reading away 計時 番茄鐘 休息 提醒 影片 目標 週末 每天開始 專注 全螢幕 看書",
      sum: [KEEP_NAME()[st.keep || "work"], goal, st.dayStart === "auto" ? L("starts by itself", "自動開始") : L("asks each day", "每天問我")].join(" · "),
      has: L("The two ways, Pomodoro lengths, the focus screen, breaks, goals, starting the day", "兩種方式、番茄鐘長度、專注全螢幕、休息、目標、每天開始"), draw: keepGroup },
    { id: "rem", title: L("Reminders & events", "提醒與活動"), words: "sound volume apple reminders calendar events 音效 音量 提醒事項 行事曆 活動",
      sum: [L(...soundName), L(`Reminders ${conn(k.apple)}`, `提醒事項 ${conn(k.apple)}`), L(`Calendar ${conn(k.calendar)}`, `行事曆 ${conn(k.calendar)}`)].join(" · "),
      has: L("The sound, Apple Reminders, Apple Calendar", "響鈴音效、Apple 提醒事項、Apple 行事曆"), draw: remGroup },
    { id: "cats", title: L("Categories", "分類"), words: "categories work break kinds colours photo sources credits photographers 分類 工作 休息 顏色 照片來源 標註 攝影",
      sum: L(`${(st.workTypes || []).length} kinds of work · ${(st.breakTypes || []).length} of break`, `工作 ${(st.workTypes || []).length} 種 · 休息 ${(st.breakTypes || []).length} 種`),
      has: L("Kinds of work and break: names, colours, usual minutes; who your photos are from", "工作分類、休息種類（名字、顏色、預設分鐘）；照片來源"), draw: catsGroup },
    { id: "about", title: L("About & updates", "關於與更新"), words: "version update email tour login uninstall credits backup restore delete zip weekly photos pack 版本 更新 通知 導覽 登入 解除安裝 照片來源 備份 還原 刪除 每週 照片 更新包",
      sum: [st.version || "", st.update ? L(`${st.update.version} is out`, `新版本 ${st.update.version}`) : st.updateAsked ? L("up to date", "已是最新版本") : ""].filter(Boolean).join(" · "),
      has: aboutHas(), draw: aboutGroup },
  ];
}
/** The group open (the menu marks it; the tour and the search open one). */
export const settingsGroup = () => group;
export const settingsGroups = () => GROUPS().map((g) => [g.id, g.title]);
let searchIndex = null; // every setting's words and its group: [{ group, label, sel }]

export function renderSettings(main, { redraw, go, ask }) {
  if (ask && "group" in ask) group = ask.group || null;
  if (ask?.card) { const g = { ".look-card": "look", ".keep-card": "keep", ".goals-card": "keep", ".start-card": "keep", ".cats-card": "cats", ".connect-card.apple": "rem", ".connect-card.calendar": "rem", ".about-card": "about", ".updates-card": "about", ".data-card": "about", ".pd-reset": "about", ".doodles-card": "look", ".clockout-field": "keep", ".breaks-card": "keep" }[ask.card]; if (g) group = g; }
  searchIndex = null;
  // Asked for a card (the menu, a link) or a setting (the search): there once it's drawn, with a flash.
  const target = ask?.card || null, field = ask?.field || null, title = ask?.cardTitle || null;
  if (target || field || title) setTimeout(() => {
    const t = field ? [...main.querySelectorAll(".field")].find((f) => f.firstElementChild?.textContent === field)
      : title ? [...main.querySelectorAll("section")].find((c) => c.querySelector("h3")?.textContent === title) : main.querySelector(target);
    if (!t) return;
    t.scrollIntoView({ behavior: "smooth", block: field ? "center" : "start" });
    t.classList.remove("flash"); void t.offsetWidth; t.classList.add("flash");
  }, 120);
  const tourBtn = el("button", { type: "button", className: "btn small settings-tour", textContent: L("Show me Settings (1 min)", "帶我看設定（1 分鐘）") });
  tourBtn.addEventListener("click", () => startTour(go, "settings"));
  const groups = GROUPS();
  const g = groups.find((x) => x.id === group);
  const to = (x) => () => { group = x; window.scrollTo(0, 0); redraw(); };
  // The overview: a main page's top (search and the tour in it), then every group's card.
  if (!g) {
    main.append(pageTop({ title: L("Settings", "設定"), sub: L("Everything in one place: pick a card.", "所有設定都在這裡：點一張卡片。"), spot: "app-settings-look", tools: [searchBox(go), tourBtn], className: "settings-band" }));
    home(main, groups, redraw, go); return;
  }
  // A group: a sub-page ("Settings › name", one sticker), then back to all, and the one before or after.
  const i = groups.indexOf(g), prev = groups[(i + groups.length - 1) % groups.length], next = groups[(i + 1) % groups.length];
  const btn = (label, fn) => { const b = el("button", { type: "button", className: "btn small", textContent: label }); b.addEventListener("click", fn); return b; };
  main.append(pageSub({ parent: L("Settings", "設定"), onParent: to(null), title: g.title, sub: g.sum, spot: "app-set-" + g.id }),
    el("div", { className: "spread set-pn" }, btn(L("← All settings", "← 所有設定"), to(null)),
      el("div", { className: "row-flex" }, btn(`‹ ${prev.title}`, to(prev.id)), btn(`${next.title} ›`, to(next.id)))));
  g.draw(main, redraw, go);
}

/** The home page: what's changed most often, right here; then a tile for each group, with what it's set to. */
function home(main, groups, redraw, go) {
  const st = state.st || {};
  const q = (label, ctrl) => el("span", { className: "qi" }, el("span", { className: "muted", textContent: label }), ctrl);
  main.append(el("section", { className: "set-quick", "aria-label": L("Used most", "常用") }, el("b", { className: "muted", textContent: L("Used most", "常用") }),
    q("Language / 語言 / ภาษา", seg([["en", "EN"], ["zh", "中"], ["th", "ไทย"]], host.lang, (v) => host.setLang(v), "Language / 語言 / ภาษา")),
    st.appearance ? q(L("Light or dark", "深淺色"), seg([["system", L("Mac", "系統")], ["light", L("Light", "淺")], ["dark", L("Dark", "深")]], st.appearance, (v) => { state.st.appearance = v; host.settingText("appearance", v); setTimeout(redraw, 60); }, L("Light or dark", "淺色或深色"))) : null,
    q(L("Keeping time", "計時"), seg([["work", L("Work clock", "工作時鐘")], ["both", L("Pomodoro", "番茄鐘")]], st.keep === "work" || !st.keep ? "work" : "both", (v) => { work.act("switch-keep", v); toast(L("Saved", "已儲存")); setTimeout(redraw, 150); }, L("How the app keeps time", "怎麼計時"))),
    q(L("Away from the computer", "不在電腦前"), (() => { const b = el("button", { type: "button", className: "btn small", textContent: L("Focus screen", "專注全螢幕") }); b.addEventListener("click", () => openFocus()); return b; })()),
    host.setBuddies ? q(L("Desktop buddy", "桌面夥伴"), (() => { const b = el("button", { type: "button", className: "btn small", textContent: L("Bring it out", "叫出夥伴") }); b.addEventListener("click", () => host.setBuddies("desk", true)); return b; })()) : null));
  main.append(el("section", { className: "set-tiles" }, groups.map((g) => {
    const b = el("button", { type: "button", className: "set-tile", "data-group": g.id }, el("span", { className: "top" }, icon(g.id, "ic"), el("b", { textContent: g.title })),
      el("small", { textContent: g.sum }), el("span", { className: "has", textContent: g.has }));
    b.addEventListener("click", () => { group = g.id; window.scrollTo(0, 0); redraw(); });
    return b;
  })));
  main.append(setupList(st, redraw, go));
}

/** Getting set up: the few things worth setting, each with whether it's done and the way straight to it. */
function setupList(st, redraw, go) {
  const k = known(), conn = (a) => a?.access === "full" && a.on;
  const to = (g, card) => () => { group = g; window.scrollTo(0, 0); redraw(); if (card) setTimeout(() => { const c = document.querySelector(card); c?.scrollIntoView({ behavior: "smooth", block: "start" }); c?.classList.add("flash"); }, 150); };
  const items = [
    [true, L("How you keep time", "怎麼計時"), KEEP_NAME()[st.keep || "work"], to("keep", ".keep-card")],
    [st.dailyGoal > 0, L("A daily goal", "每日目標"), st.dailyGoal ? L(`${st.dailyGoal} h a day`, `每天 ${st.dailyGoal} 小時`) : L("not set", "還沒設定"), to("keep", ".goals-card")],
    [!!st.focusScreen, L("The focus screen, for reading or studying away from the computer", "專注全螢幕：看書、讀書不在電腦前也能用"), st.focusScreen?.auto ? L("opens with every round", "每一輪都會打開") : L("from Today, or the menu", "從「今天」或選單打開"), to("keep", ".focus-card")],
    [conn(k.apple) || conn(k.calendar), L("Apple Reminders & Calendar (if you use them)", "Apple 提醒事項與行事曆（有在用的話）"), conn(k.apple) || conn(k.calendar) ? L("connected", "已連結") : L("not connected: the app works without them", "未連結：不連也能用"), to("rem", ".connect-card")],
    [(host.lib?.buddyOff || []).length > 0 || !!st.deskWho, L("The buddy and its stickers", "桌面夥伴和它的貼圖"), { pair: L("Milk and Love, side by side", "Milk 和 Love 並排"), together: L("together", "同框"), milk: "Milk", love: "Love", others: L("your own", "你自己的") }[st.deskWho || "pair"], () => go("buddy", { card: "#g-look" })],
    [(st.workTypes || []).length > 0, L("Your kinds of work and break", "你的工作和休息分類"), L(`${(st.workTypes || []).length} kinds of work · ${(st.breakTypes || []).length} of break`, `工作 ${(st.workTypes || []).length} 種 · 休息 ${(st.breakTypes || []).length} 種`), to("cats", ".cats-card")],
  ];
  const done = items.filter((x) => x[0]).length;
  return el("section", { className: "card setup-list" },
    el("div", { className: "spread" }, el("h3", { textContent: L("Getting set up", "設定小清單") }), el("span", { className: "muted small", textContent: L(`${done} of ${items.length} set`, `已設定 ${done} / ${items.length}`) })),
    el("p", { className: "muted small", style: "margin:0", textContent: L("The few things worth a look. Click one to go straight there.", "幾個值得看一下的設定，點一下直接過去。") }),
    el("div", { className: "setup-items" }, items.map(([ok, label, now, fn]) => {
      const b = el("button", { type: "button", className: "setup-item" + (ok ? " ok" : "") }, el("span", { className: "tick", textContent: ok ? "✓" : "○", "aria-hidden": "true" }),
        el("span", { className: "t" }, el("b", { textContent: label }), el("small", { className: "muted", textContent: now })), el("span", { className: "go", textContent: "›", "aria-hidden": "true" }));
      b.addEventListener("click", fn);
      return b;
    })));
}

function lookGroup(main, redraw) {
  const st = state.st || {};
  const th = host.themes?.();
  const swatches = el("div", { className: "swatches", role: "radiogroup", "aria-label": L("Colour theme", "主題顏色") }, (th?.themes || []).map((t) => {
    const b = el("button", { type: "button", className: t.id === th.theme ? "on" : "", title: t.name, "aria-label": t.name, role: "radio", "aria-checked": String(t.id === th.theme) });
    b.style.setProperty("--a", SWATCH[t.id]?.[0] || "#ccc"); b.style.setProperty("--b", SWATCH[t.id]?.[1] || "#999");
    b.addEventListener("click", () => { host.setTheme(t.id); setTimeout(redraw, 80); });
    return b;
  }));
  // Side by side: the styles on the left, colours, language and light or dark beside them.
  const themeName = (th?.themes || []).find((t) => t.id === th.theme)?.name || "";
  const row = (label, now, ...kids) => el("div", { className: "lc-row" }, el("div", { className: "lc-h" }, el("span", { textContent: label }), now ? el("b", { textContent: now }) : null), ...kids);
  const colours = el("section", { className: "card look-colours" }, el("h3", { textContent: L("Colours & language", "顏色與語言") }),
    row(L("Colour theme", "主題顏色"), "", el("div", { className: "sw-grid", role: "radiogroup", "aria-label": L("Colour theme", "主題顏色") }, (th?.themes || []).map((t) => {
      const b = el("button", { type: "button", className: "sw-pick" + (t.id === th.theme ? " on" : ""), role: "radio", "aria-checked": String(t.id === th.theme) }, el("i"), el("span", { textContent: t.name }));
      b.firstChild.style.setProperty("--a", SWATCH[t.id]?.[0] || "#ccc"); b.firstChild.style.setProperty("--b", SWATCH[t.id]?.[1] || "#999");
      b.addEventListener("click", () => { host.setTheme(t.id); setTimeout(redraw, 80); });
      return b;
    }))),
    row("Language / 語言 / ภาษา", "", seg([["en", "English"], ["zh", "繁體中文"], ["th", "ไทย (beta)"]], host.lang, (v) => host.setLang(v), "Language / 語言 / ภาษา"), thaiNote()),
    st.appearance ? row(L("Light or dark", "淺色或深色"), "",
      seg([["system", L("Like my Mac", "跟系統一樣")], ["light", L("Light", "淺色")], ["dark", L("Dark", "深色")]], st.appearance, (v) => { state.st.appearance = v; host.settingText("appearance", v); setTimeout(redraw, 60); }, L("Light or dark", "淺色或深色"))) : null);
  main.append(host.styles ? el("div", { className: "look2" },
    el("section", { className: "card look-card" }, el("h3", { textContent: L("Style", "風格") }),
      el("small", { className: "muted", textContent: L("The shape and feel: cards, fonts and how the stickers look. Colours come from the theme beside it.", "整體的感覺：卡片、字型和貼圖的樣子。顏色由旁邊的主題決定。") }),
      stylePicker(() => setTimeout(redraw, 80))), colours) : colours);
  { const d = lookCard(); if (d) main.append(d); } // (1.3.0, track A: Doodles)
  if (st.menuTimer) main.append(el("section", { className: "card menu-card" }, el("h3", { textContent: L("The menu bar (top right of your screen)", "選單列（螢幕右上角）") }),
    el("div", { className: "field" }, el("span", { textContent: L("Little timer in the menu bar", "選單列小倒數") }),
      seg([["away", L("When the buddies and windows are put away", "夥伴和視窗都收起來時")], ["always", L("Always", "一直顯示")], ["off", L("Off", "不顯示")]], st.menuTimer,
        (v) => { state.st.menuTimer = v; host.settingText("menuTimer", v); toast(L("Saved", "已儲存")); setTimeout(redraw, 120); }, L("Little timer in the menu bar", "選單列小倒數"))),
    st.menuTimer !== "off" ? el("div", { className: "field" }, el("span", { textContent: L("With no timer running, the menu bar shows", "沒有在倒數時，選單列顯示") }),
      seg([["task", L("Time on what you're doing", "手上這件事做了多久")], ["today", L("Today's work", "今天總共工作多久")], ["none", L("Nothing", "不顯示")]], st.menuShow || "task",
        (v) => { state.st.menuShow = v; host.settingText("menuShow", v); toast(L("Saved", "已儲存")); }, L("With no timer running", "沒有在倒數時"))) : null,
    el("p", { className: "muted", textContent: L("With the buddies and windows put away, the heart in the menu bar shows 🍅 18:42 (☕ on a break).", "夥伴和視窗都收起來時，選單列的愛心旁會顯示 🍅 18:42（休息時是 ☕）。") })));
}

/** How often the buddies change sticker (seconds; 0 = keep one). Kept in the windows' own storage: the buddies hear at once. */
function keepGroup(main, redraw) {
  const st = state.st || {}, w = work, keep = st.keep || "work";
  // ① How the app keeps time (the same as the two ways at the top of Today).
  const modeBtn = (k, icon, title, sub) => {
    const b = el("button", { type: "button", className: "mode" + (keep === k ? " on" : ""), "aria-pressed": String(keep === k) }, el("b", { textContent: title }), el("small", { textContent: sub }));
    b.addEventListener("click", () => { work.act("switch-keep", k); toast(L("Saved", "已儲存")); setTimeout(redraw, 150); });
    return b;
  };
  main.append(el("section", { className: "card keep-card" }, el("h3", { textContent: L("① How the app keeps time (the same as the top of Today)", "① 怎麼計時（跟「今天」最上面的兩個按鈕一樣）") }),
    el("div", { className: "modes" },
      modeBtn("work", "", L("Work clock", "工作時鐘"), L("Counts while you're at the computer", "在電腦前就會計時")),
      modeBtn("both", "", L("Pomodoro", "番茄鐘"), L("Rounds and breaks; each round counts as work", "一輪一輪來；每一輪都算工作"))),
    el("p", { className: "muted", textContent: keep === "work" ? L("The work clock counts while you're at the computer, and stops by itself when you've been away 5 minutes. Today and Data show where the time went.", "只要你在電腦前，工作時鐘就會計時；離開 5 分鐘以上會自動停下。在「今天」和「數據」可以看到時間都花去哪了。")
      : L("You work in Pomodoro rounds: each focus round counts as work under what you're working on, and each break goes in the log. The time between rounds doesn't count.", "用番茄鐘：每一輪專注都會算進你手上那件事，每次休息也會記下來。兩輪之間的時間不算工作。") }),
    keep !== "work" ? el("div", { className: "field" }, el("span", { textContent: L("Pomodoro lengths", "番茄鐘長度") }), lengthsPicker(st, redraw)) : null,
    // (off: a break that ends asks, the buddy's bubble or the card, and the next round waits for "Back to work")
    keep !== "work" ? field(L("When a break ends", "休息結束時"), check(st.pomoAutoNext === true, (v) => { state.st.pomoAutoNext = v; host.settingText("pomoAutoNext", v ? "on" : "off"); toast(L("Saved", "已儲存")); setTimeout(redraw, 120); },
      L("Start the next round by itself", "自動開始下一輪"))) : null,
    keep !== "work" ? el("p", { className: "muted", textContent: st.pomoAutoNext === true ? L("The next round starts as soon as the break ends.", "休息一結束，下一輪就會馬上開始。")
      : L("When a break ends, the buddy (or a card) asks, and the next round waits until you press Back to work.", "休息結束時，夥伴（或卡片）會問你，等你按「回去工作」才會開始下一輪。") }) : null,
    field(L("Ask what I'm working on after 10 unnamed minutes", "超過 10 分鐘沒取名字時，問我在做什麼"), check(st.askName !== false, (v) => w.setting("askName", v ? 1 : 0), L("Ask what I'm working on", "問我在做什麼")))));
  main.append(focusCard(st, redraw));
  // ② Breaks.
  const remindOn = check(st.breakEvery > 0, (v) => { w.setting("breakEvery", v ? Math.max(10, Number(after.value) || 50) : 0); }, L("Break reminder on", "開啟休息提醒"));
  const after = number(st.breakEvery || 50, { min: 10, max: 240, step: 5, label: L("Minutes of work before a break", "工作幾分鐘後休息"), onChange: (v) => { if (remindOn.checked) w.setting("breakEvery", v); } });
  main.append(el("section", { className: "card breaks-card" }, el("h3", { textContent: L("② Breaks", "② 休息") }),
    // (the Pomodoro has its own breaks: the gentle reminders are the work clock's)
    keep !== "work" ? el("p", { className: "muted", textContent: L("The Pomodoro has its own breaks: on any break, choose what it is and how long on Today.", "番茄鐘自己會休息；每次休息都可以在「今天」選種類和長度。") }) : null,
    keep !== "work" ? null : field(L("Gentle break reminders", "溫和的休息提醒"), remindOn, L("after", "工作"), after, L("min of work", "分鐘後")),
    keep !== "work" ? null : field(L("Break length", "休息長度"), number(st.breakLength ?? 10, { min: 1, max: 60, label: L("Break length in minutes", "休息分鐘數"), onChange: (v) => w.setting("breakLength", v) }), L("min", "分鐘")),
    keep !== "work" ? null : field(L("If I don't take it, remind me again after", "沒去休息的話，過多久再提醒我"), number(st.askAgain ?? 10, { min: 5, max: 60, step: 5, label: L("Minutes", "分鐘"), onChange: (v) => w.setting("askAgain", v) }), L("min", "分鐘")),
    field(L("Eye rests: look far away for 20 seconds", "讓眼睛休息：看遠方 20 秒"), number(st.eyeEvery ?? 0, { min: 0, max: 120, step: 5, label: L("Minutes of work between eye rests", "工作幾分鐘讓眼睛休息一次"), onChange: (v) => w.setting("eyeEvery", v) }), L("min of work (0 = off)", "分鐘（0 = 關閉）")),
    host.breakVideo ? field(L("On a break, suggest a MilkLove video (GMMTV OFFICIAL, on Today)", "休息時推薦一支 MilkLove 的影片（GMMTV OFFICIAL，在「今天」）"),
      check(st.breakVideos !== false, (v) => host.settingText("breakVideos", v ? "on" : "off"), L("Suggest a MilkLove video on a break", "休息時推薦 MilkLove 影片"))) : null));
  // ③ Goals.
  main.append(el("section", { className: "card goals-card" }, el("h3", { textContent: L("③ Goals", "③ 目標") }),
    field(L("Daily goal", "每日目標"), number(st.dailyGoal ?? 6, { min: 0, max: 16, step: 0.5, label: L("Daily goal in hours", "每日目標（小時）"), onChange: (v) => w.setting("dailyGoal", v) }), L("hours a day (0 = no goal)", "小時／天（0 = 不設目標）")),
    field(L("Weekend goal", "週末目標"), number(st.weekendGoal ?? 0, { min: 0, max: 16, step: 0.5, label: L("Weekend goal in hours", "週末目標（小時）"), onChange: (v) => w.setting("weekendGoal", v) }), L("hours (0 = same as the daily goal)", "小時（0 = 跟每日目標一樣）")),
    clockOutField(st),
    el("p", { className: "muted", textContent: L("The buddy celebrates when you get there, and Data counts the days.", "達標時夥伴會幫你慶祝，「數據」也會算你達標了幾天。") })));
  // ④ Starting the day.
  const start = startCard(st, redraw);
  start.querySelector("h3").textContent = L("④ Starting the day", "④ 每天開始");
  main.append(start);
}

/**
 * Keeping time › ③ Goals: your clock-out time (settings.clockOut, "19:00"). MUVMUV's milk pin counts the workdays you
 * press Done for today by then; a change counts from then on. (Track B1; the integrator puts it in the Goals card.)
 */
export function clockOutField(st = state.st || {}) {
  const i = el("input", { type: "time", value: /^\d{2}:\d{2}$/.test(st.clockOut || "") ? st.clockOut : "19:00", step: 300, "aria-label": L("Clock-out time", "收工時間") });
  i.addEventListener("change", () => {
    const v = /^\d{2}:\d{2}$/.test(i.value) ? i.value : "19:00";
    i.value = v;
    host.settingText("clockOut", v);
    if (state.st) state.st.clockOut = v;
    toast(L("Saved", "已儲存"));
  });
  return el("label", { className: "field clockout-field" },
    el("span", {}, el("span", { textContent: L("Your clock-out time", "你的收工時間") }),
      el("small", { className: "muted", textContent: L("MUVMUV's milk counts the days you press Done for today by then", "MUVMUV 的牛奶會記下你在這個時間前按「收工」的天數") })),
    el("span", { className: "inline" }, i));
}

/** ⛶ The focus screen's options (the same as the ⚙ on the screen itself). */
function focusCard(st, redraw) {
  const f = { bg: "sticker", move: "edge", sets: ["milk", "love", "together"], stickerEvery: 10, photosBy: PHOTOGRAPHERS, photoEvery: 5, bright: 35, lines: ["worked", "next"], auto: false, dim: true, ...LOOK_DEFAULTS, ...(st.focusScreen || {}) };
  const save = (patch) => { host.settingText("focusScreen", JSON.stringify(patch)); state.st = { ...state.st, focusScreen: { ...f, ...patch } }; toast(L("Saved", "已儲存")); setTimeout(redraw, 120); };
  const pick = (key, items, label) => seg(items, f[key], (v) => save({ [key]: v }), label);
  const ticks = (key, items) => el("span", { className: "row-flex" }, items.map(([v, t]) => {
    const c = el("input", { type: "checkbox", checked: f[key].includes(v) });
    c.addEventListener("change", () => save({ [key]: f[key].filter((x) => x !== v).concat(c.checked ? [v] : []) }));
    return el("label", { className: "chk" }, c, " " + t);
  }));
  const bright = el("input", { type: "range", min: "10", max: "100", step: "5", value: String(f.bright), "aria-label": L("Brightness", "亮度") });
  bright.addEventListener("change", () => save({ bright: Number(bright.value) }));
  const open = el("button", { type: "button", className: "btn small", textContent: L("Open it now", "現在打開") });
  open.addEventListener("click", () => openFocus());
  return el("section", { className: "card focus-card" }, el("div", { className: "spread" }, el("h3", { textContent: L("Focus screen", "專注全螢幕") }), open),
    el("p", { className: "muted", textContent: L("For reading, studying on paper, any work away from the computer: the clock full screen, and sitting still isn't \"away\" while it's open. Open it from Today, the menu bar, or right-clicking the buddy (⌃⌘F).",
      "看書、讀書、任何不用電腦的工作：時鐘全螢幕，打開時不動也不會算成「離開」。從「今天」、選單列，或在夥伴上按右鍵打開（⌃⌘F）。") }),
    el("div", { className: "field cl-field" }, el("span", { textContent: L("The clock", "時鐘") }), lookControls(f, save)),
    field(L("Every Pomodoro round opens it", "每一輪番茄鐘都自動打開"), check(!!f.auto, (v) => save({ auto: v }), L("Every round opens the focus screen", "每一輪都打開專注全螢幕"))),
    field(L("Behind the clock", "時鐘後面"), pick("bg", [["sticker", L("One sticker", "一張貼圖")], ["photos", L("Photos", "照片")], ["none", L("Nothing", "什麼都不放")]], L("Behind the clock", "時鐘後面"))),
    f.bg === "sticker" ? field(L("The sticker", "貼圖"), pick("move", [["still", L("Still", "不動")], ["slow", L("Walks slowly", "慢慢走")], ["edge", L("Round the edges", "沿著邊緣走")]], L("The sticker", "貼圖"))) : null,
    f.bg === "sticker" ? field(L("Stickers from", "貼圖來自"), ticks("sets", [["milk", "Milk"], ["love", "Love"], ["together", L("Together", "同框")]]),
      pick("stickerEvery", [[0, L("new each round", "每一輪換")], [10, L("every 10 min", "每 10 分鐘")], [30, L("every 30 min", "每 30 分鐘")], [-1, L("keep one", "不換")]], L("A new sticker", "換貼圖"))) : null,
    f.bg === "photos" ? field(L("Photos by", "照片來自"), ticks("photosBy", [...PHOTOGRAPHERS.map((p) => [p, p]), ["mine", L("My own photos", "我自己的照片")]]),
      pick("photoEvery", [[1, L("every minute", "每 1 分鐘")], [5, L("5 min", "5 分鐘")], [15, L("15 min", "15 分鐘")], [30, L("30 min", "30 分鐘")]], L("A new photo", "換照片"))) : null,
    f.bg === "photos" ? el("p", { className: "muted small", textContent: L("My own photos: the photos you added yourself (Stickers › Photos). The app's own photos are only ever shown, never changed.", "我自己的照片：你自己加進來的照片（貼圖 › 照片）。App 附的照片只會拿來顯示，不會被改。") }) : null,
    f.bg !== "none" ? field(L("Brightness", "亮度"), bright, `${f.bright}%`) : null,
    field(L("Under the clock", "時鐘下面"), ticks("lines", [["next", L("Next reminder or event", "下一個提醒或活動")], ["focus", L("Today's focus", "本日主題")]])),
    field(L("A little dimmer after 22:00", "22:00 以後暗一點"), check(f.dim !== false, (v) => save({ dim: v }), L("Dimmer at night", "晚上暗一點"))));
}

function remGroup(main, redraw, go) {
  const st = state.st || {};
  // (the desktop buddy hidden: a card on screen, or nothing: its switch is on the Desktop buddy page, When to hide)
  const cardOn = st.cardWhenHidden !== false;
  const toBuddy = el("button", { type: "button", className: "linkish", textContent: L("Desktop buddy › When to hide ›", "桌面夥伴 › 什麼時候躲起來 ›") });
  toBuddy.addEventListener("click", () => go("buddy", { card: "#g-hide" }));
  const cardField = el("p", { className: "muted bp-cardlink" }, cardOn ? L("With the desktop buddy hidden, these pop up as a small card on the screen you're on. ", "桌面夥伴收起來時，這些會在你正在用的螢幕跳出小卡片。")
    : L("Off: with the desktop buddy hidden, nothing pops up. ", "已關閉：桌面夥伴收起來時，什麼都不會跳出來。"), toBuddy);
  const warn = null;
  main.append(el("section", { className: "card sound-card" }, el("h3", { textContent: L("When it's time", "時間到的時候") }), st.sound ? soundField(st) : null, cardField, warn,
    el("p", { className: "muted", textContent: L("Add reminders and events in Reminders & events; without Apple Calendar, events stay in the app and still remind you.", "在「提醒與活動」新增提醒和活動；沒連結 Apple 行事曆也能加活動，會存在 App 裡，時間到一樣會提醒你。") })));
  // What pops up, and holding reminders while you focus.
  const sw = (k, label) => check(st[k] !== false, (v) => { state.st[k] = v; host.settingText(k, v ? "on" : "off"); toast(L("Saved", "已儲存")); setTimeout(redraw, 120); }, label);
  const hold = st.holdFocus !== false;
  main.append(el("section", { className: "card pops-card" }, el("h3", { textContent: L("What pops up", "哪些會跳出來") }),
    el("div", { className: "pops" }, [["popRem", L("Reminders", "提醒")], ["popEv", L("Events", "活動")], ["popBrk", L("Break reminders", "休息提醒")]].map(([k, t]) =>
      el("label", { className: "pop" }, sw(k, t), el("span", { textContent: t })))),
    el("p", { className: "muted", textContent: L("Untick one and it doesn't pop up at all (it's still in your list).", "取消勾選，那一種就完全不會跳出來（清單裡還是看得到）。") }),
    el("div", { className: "field" }, el("span", {}, el("b", { textContent: L("Hold pop-ups while I'm focusing", "專注的時候先不要跳出來") }), el("br"),
      el("small", { className: "muted", textContent: L("While the focus screen is open or a Pomodoro round is running, reminders wait, then show together in one card when you finish. Break reminders and the Pomodoro's “time's up” always come through.", "專注全螢幕開著、或番茄鐘正在專注時，提醒會先等等，結束後一起用一張卡片告訴你。休息提醒和番茄鐘的「時間到」一定會跳出來。") })),
      sw("holdFocus", L("Hold pop-ups while I'm focusing", "專注的時候先不要跳出來"))),
    hold ? el("label", { className: "pop through" }, sw("eventsThrough", L("Events still come through", "活動還是會跳出來")), el("span", { textContent: L("Events still come through (so you don't miss a meeting or a fan event)", "活動還是會跳出來（才不會錯過會議或粉絲活動）") })) : null,
    // The card with the desktop buddy hidden: over everything (full-screen apps, every desktop), or only over ordinary windows.
    el("div", { className: "field" }, el("span", {}, el("b", { textContent: L("Alerts on top of everything", "提醒卡片永遠在最上層") }), el("br"),
      el("small", { className: "muted", textContent: L("The card comes up over every app, full-screen ones too, on whichever desktop you're on. Off: only over ordinary windows.", "卡片會出現在所有 App 上面，全螢幕的也一樣，不管你在哪個桌面。關掉的話：只會在一般視窗上面。") })),
      sw("alertsOnTop", L("Alerts on top of everything", "提醒卡片永遠在最上層")))));
  if (host.apple || host.calendar) main.append(connectCard("apple", redraw), connectCard("calendar", redraw));
}

function catsGroup(main, redraw = () => {}) {
  const st = state.st || {};
  const catBox = (kind) => {
    const list = kind === "work" ? st.workTypes || [] : st.breakTypes || [];
    return el("div", { className: "cats" }, list.map((c) => {
      const e = el("input", { type: "text", className: "e", value: c.emoji, maxLength: 4, "aria-label": L("Emoji", "表情符號") });
      const l = el("input", { type: "text", className: "l", value: L(c.label, c.zh || c.label), maxLength: 40, "aria-label": L("Name", "名稱") });
      const col = el("input", { type: "color", value: c.color || "#cccccc", "aria-label": L("Colour", "顏色") });
      const save = async (ch) => { await work.call("saveCategory", kind, { id: c.id, ...ch }); toast(L("Saved", "已儲存")); };
      e.addEventListener("change", () => save({ emoji: e.value }));
      l.addEventListener("change", () => save(host.lang === "zh" ? { zh: l.value } : { label: l.value }));
      col.addEventListener("change", () => save({ color: col.value }));
      const row = el("div", { className: "catrow" }, e, l, col);
      if (kind === "break") {
        const m = el("input", { type: "number", min: 0, max: 240, value: c.minutes ?? 10, style: "width:60px", "aria-label": L("Usual minutes (0 = until I'm back)", "預設分鐘數（0 = 等我回來為止）") });
        m.addEventListener("change", () => save({ minutes: Number(m.value) || 0 }));
        row.append(m, el("span", { className: "muted", textContent: L("min", "分鐘") }));
      }
      const del = el("button", { type: "button", className: "del", textContent: "✕", "aria-label": L(`Remove ${c.label}`, `移除「${c.zh || c.label}」`), title: L("Remove (its time moves to the first one)", "移除（時間會併到第一個分類）") });
      del.addEventListener("click", async () => { if (list.length <= 1) return; if (!confirm(L(`Remove “${L(c.label, c.zh)}”? Its time moves to the first category.`, `要移除「${c.zh || c.label}」嗎？它的時間會併到第一個分類。`))) return; await work.call("removeCategory", kind, c.id); toast(L("Removed", "已移除")); });
      row.append(del);
      return row;
    }));
  };
  const newCat = (kind) => {
    const i = el("input", { type: "text", placeholder: kind === "work" ? L("＋ New work category (e.g. 🧪 Lab)", "＋ 新增工作分類（例如 🧪 實驗）") : L("＋ New kind of break (e.g. 🐶 Walk the dog)", "＋ 新增休息種類（例如 🐶 遛狗）"), "aria-label": L("New category", "新分類") });
    const b = el("button", { type: "button", className: "btn small", textContent: L("Add", "新增") });
    const add = async () => { if (i.value.trim()) { await saveCategoryFromText(kind, i.value); i.value = ""; } };
    b.addEventListener("click", add); i.addEventListener("keydown", (e) => { if (enterKey(e)) add(); });
    return el("div", { className: "newcat" }, i, b);
  };
  main.append(el("section", { className: "card cats-card" }, el("h3", { textContent: L(`Work categories (${(st.workTypes || []).length})`, `工作分類（${(st.workTypes || []).length}）`) }), catBox("work"), newCat("work"),
    el("p", { className: "muted", textContent: L("A task keeps the category you gave it last; change it any time in Today. Data uses these colours.", "每件事會記住你上次選的分類；隨時可以到「今天」修改。「數據」用的就是這些顏色。") })),
    el("section", { className: "card cats-card brk" }, el("h3", { textContent: L(`Kinds of break (${(st.breakTypes || []).length})`, `休息種類（${(st.breakTypes || []).length}）`) }), catBox("break"), newCat("break")));
  photoSources(main, redraw);
}

/**
 * Photo sources: the people your photos are credited to. The app's own (with how many of your photos each
 * has), and the ones you added crediting your photos: change a name or link, remove one, add one. A photo's
 * own credit changes in Stickers › Photos (click it › Change who took it).
 */
async function photoSources(main, redraw) {
  const card = el("section", { className: "card sources-card" }, el("h3", { textContent: L("Photo sources", "照片來源") }), el("p", { className: "muted", textContent: "…" }));
  main.append(card);
  let d; try { d = await host.photoCredits(); } catch { d = null; }
  if (!d) { card.lastChild.textContent = L("The photo library isn't set up yet.", "照片庫還沒設定好。"); return; }
  const count = {};
  for (const tags of Object.values(d.credits || {})) for (const t of [].concat(tags || [])) count[t] = (count[t] || 0) + 1;
  const n = (k) => L(`${count[k] || 0} photo${count[k] === 1 ? "" : "s"}`, `${count[k] || 0} 張照片`);
  const link = (p) => p.url ? el("a", { href: p.url, target: "_blank", rel: "noopener", textContent: p.handle || p.url.replace(/^https:\/\//, "") }) : null;
  const theirs = [...(d.order || []), "commercial", "other"].map((k) => [k, d.people[k]]).filter(([, p]) => p);
  const mine = (d.mine || []).map((k) => [k, d.people[k]]).filter(([, p]) => p);
  const row = ([k, p]) => {
    const r = el("div", { className: "src-row" }, el("b", { textContent: L(p.name, p.zh || p.name) }), link(p), el("span", { className: "muted small", textContent: n(k) }));
    if (!p.mine) return r;
    const name = el("input", { type: "text", value: p.name, maxLength: 80, "aria-label": L("Name", "名稱") });
    const url = el("input", { type: "text", value: p.handle || p.url || "", maxLength: 200, placeholder: L("@account or link", "@帳號或連結"), "aria-label": L("X account or link", "X 帳號或連結") });
    const save = async () => { const res = await host.mySource("edit", { key: k, name: name.value, link: url.value }); toast(res?.error === "same" ? L("There's already a source with that name.", "已經有同名的來源了。") : res?.error ? L("A name, please.", "請輸入名稱。") : L("Saved", "已儲存")); if (!res?.error) redraw(); };
    name.addEventListener("change", save); url.addEventListener("change", save);
    const del = el("button", { type: "button", className: "del", textContent: "✕", "aria-label": L(`Remove ${p.name}`, `移除 ${p.name}`), title: L("Remove (its photos lose this credit)", "移除（照片會失去這個標註）") });
    del.addEventListener("click", async () => { if (!confirm(L(`Remove “${p.name}”? ${count[k] || 0} photo(s) lose this credit.`, `要移除「${p.name}」嗎？${count[k] || 0} 張照片會失去這個標註。`))) return; await host.mySource("remove", { key: k }); toast(L("Removed", "已移除")); redraw(); });
    return el("div", { className: "src-row mine" }, name, url, el("span", { className: "muted small", textContent: n(k) }), del);
  };
  const addName = el("input", { type: "text", maxLength: 80, placeholder: L("＋ New source (name)", "＋ 新的來源（名稱）"), "aria-label": L("New source name", "新來源的名稱") });
  const addLink = el("input", { type: "text", maxLength: 200, placeholder: L("@account or link (optional)", "@帳號或連結（可不填）"), "aria-label": L("New source's X account or link", "新來源的 X 帳號或連結") });
  const addBtn = el("button", { type: "button", className: "btn small", textContent: L("Add", "新增") });
  const add = async () => { if (!addName.value.trim()) return addName.focus(); const res = await host.mySource("add", { name: addName.value, link: addLink.value }); if (res?.error === "same") return toast(L("There's already a source with that name.", "已經有同名的來源了。")); toast(L("Added", "已新增")); redraw(); };
  addBtn.addEventListener("click", add); [addName, addLink].forEach((i) => i.addEventListener("keydown", (e) => { if (enterKey(e)) add(); }));
  const go = el("button", { type: "button", className: "linkish", textContent: L("Change a photo's credit: Stickers › Photos", "更改照片的標註：貼圖 › 照片") });
  go.addEventListener("click", () => window.__mlwhApp?.go("stickers"));
  card.replaceChildren(el("h3", { textContent: L("Photo sources", "照片來源") }),
    el("p", { className: "muted", textContent: L("Who your photos are credited to. Yours you can rename, link or remove; they stay on this Mac. Click a photo of yours in Stickers › Photos to change its credit.", "照片標註的來源。你自己加的可以改名、改連結或移除，只存在這台 Mac 上。到「貼圖 › 照片」點你的照片，就能改它的標註。") }),
    el("b", { className: "src-h", textContent: L(`Yours (${mine.length})`, `你加的（${mine.length}）`) }),
    mine.length ? el("div", { className: "src-list" }, mine.map(row)) : el("p", { className: "muted small", textContent: L("None yet: add one here, or when you add photos.", "還沒有：可以在這裡新增，或在加入照片時新增。") }),
    el("div", { className: "src-add" }, addName, addLink, addBtn),
    el("b", { className: "src-h", textContent: L(`From the app (${theirs.length})`, `App 內建（${theirs.length}）`) }),
    el("div", { className: "src-list" }, theirs.map(row)), go);
}

function aboutGroup(main, redraw, go) {
  { const n = thaiNote(); if (n) main.append(n); } // (in Thai: the note about the translation, first)
  const st = state.st || {};
  const btn = (label, fn) => { const b = el("button", { type: "button", className: "btn small", textContent: label }); b.addEventListener("click", fn); return b; };
  // (1.3.0, track D) "Updates" (version, Check now, once a day, new photos) and "Backup & restore" first; where the host
  // has neither (the website's demo) the old version line stays in the Notices card.
  const d = [updatesCard(), yourDataCard()].filter(Boolean);
  main.append(...d);
  const old = !d.length;
  main.append(el("section", { className: "card about-card" }, el("h3", { textContent: old ? L("Version and notices", "版本與通知") : L("Notices", "通知") }),
    old && st.version ? field(L("Version", "版本"), el("div", { className: "row-flex" }, el("b", { textContent: st.version }),
      st.update ? btn(L(`Download ${st.update.version}`, `下載新版本 ${st.update.version}`), () => host.settingText("openPage", "download"))
        : el("span", { className: "muted", textContent: st.updateAsked ? L("You have the latest.", "已是最新版本。") : "" }),
      btn(L("Check now", "現在檢查"), () => { host.settingText("updateNow", "1"); toast(L("Checking…", "檢查中⋯")); setTimeout(redraw, 2500); }))) : null,
    old && st.version && st.update && (st.update.notes?.en || st.update.notes?.zh) ? el("p", { className: "muted", textContent: L(st.update.notes.en || "", st.update.notes.zh || st.update.notes.en || "") }) : null,
    old && st.version ? field(L("Look for a new version once a day", "每天檢查一次有沒有新版本"), check(st.updateCheck !== false, (v) => host.settingText("updateCheck", v ? "on" : "off"), L("Look for a new version", "檢查新版本"))) : null,
    old && st.version ? el("p", { className: "muted", textContent: L("It only reads a small file on the app's page (GitHub); nothing about you or your work is sent.", "只會讀取 App 網頁（GitHub）上的一個小檔案，不會傳送任何關於你或你工作的資料。") }) : null,
    st.contact ? field(L("New versions & important notices go to", "新版本與重要通知寄到"), el("div", { className: "row-flex" },
      el("b", { textContent: st.contact.email || L("(not given yet)", "（還沒填寫）") }),
      st.contact.email && !st.contact.sent ? el("span", { className: "muted", textContent: L("(saved; sent once we can)", "（已記下，連上網路就會送出）") }) : null,
      btn(st.contact.email ? L("Change…", "更改⋯") : L("Add…", "填寫⋯"), () => host.openTool("welcome", { only: "contact" })))) : null,
    st.version ? field(L("The app's page (downloads, news)", "App 網頁（下載、最新消息）"), btn(L("Open", "打開"), () => host.settingText("openPage", "page"))) : null));
  main.append(el("section", { className: "card tours-card" }, el("h3", { textContent: L("Tours", "導覽") }),
    field(L("A tour of this window, with Muv", "讓 Muv 帶你看看這個視窗"), btn(L("Show me around", "帶我看看"), () => go("today", { tour: true }))),
    field(L("A tour of Settings, a group at a time", "設定導覽（一個主題一步）"), btn(L("Show me Settings", "帶我看設定"), () => startTour(go, "settings"))),
    field(L("A tour of Data", "數據導覽"), btn(L("Show me Data", "帶我看數據"), () => { go("week"); setTimeout(() => startTour(go, "data"), 400); })),
    field(L("Welcome and tour", "歡迎與導覽"), btn(L("Show again", "再看一次"), () => host.openTool("welcome")))));
  main.append(el("section", { className: "card other-card" }, el("h3", { textContent: L("Other", "其他") }),
    field(L("Start at login", "登入時啟動"), check(st.startAtLogin, (v) => work.setting("startAtLogin", v ? 1 : 0), L("Start at login", "登入時啟動"))),
    // The photos that come with the app: the full library (a one-time download), if you started with your own.
    field(L("The photo library", "照片庫"), st.library === "full" ? el("span", { className: "muted", textContent: L("The full library ✓", "完整貼圖庫 ✓") })
      : ["downloading", "unpacking"].includes(st.photoPack) ? el("span", { className: "muted", textContent: L("Downloading…", "下載中⋯") })
      : btn(L("Get the full library…", "加上完整貼圖庫⋯"), () => host.openTool("welcome", { only: "photos" }))),
    field(L("Photo credits", "照片來源"), btn(L("Open Photo credits →", "打開「照片來源」→"), () => go("credits"))),
    field(L("Uninstall ML WorkHelp", "解除安裝 ML WorkHelp"), (() => { const b = btn(L("Uninstall…", "解除安裝⋯"), () => host.uninstall()); b.classList.add("danger"); return b; })())));
}

// ---- Settings › About & updates: "Updates" and "Backup & restore" (track D, plan WP5/WP6) ---------------------------
// The cards themselves are in about-cards.js (with their dialogs and the welcome window's restore offer); main.js does
// the work (backup.js, content-updates.js). Each returns null where the host can't (the website's demo, VS Code).
// To wire (integrator): in aboutGroup(), `main.append(...[updatesCard(), yourDataCard()].filter(Boolean))` first;
// the old "Version and notices" card keeps only the email and the app's page, renamed "Notices" (the version line,
// Check now and "once a day" are in Updates now). See app/desktop/backup-ipc.md.
import { updatesCard as aboutUpdatesCard, yourDataCard as aboutDataCard, aboutHas } from "./about-cards.js";
/** "Updates": the version (and the red dot for a new one), new photos and stickers (ask / automatic / never), small updates. */
function updatesCard() { return aboutUpdatesCard(); }
/** "Backup & restore": Back up now, every week, Restore, Reset pins (when pins.js is in), Delete everything. */
function yourDataCard() { return aboutDataCard(); }

/** Track A (look): Settings › Look › "Doodles" (look-card.js), shown under the Style card (lookGroup). */
export function lookCard() {
  return doodlesCard();
}

/**
 * Settings › Pins, a page of its own (track B2; the integrator puts pinsCard() in GROUPS(), after Look, and
 * ["pins", "Pins", "徽章"] in app.js's SUB.settings): the earning moment (celebrate / a quiet note / nothing; celebrating is always Classic); the pin
 * on the desktop buddy card; the special-days reminder; a code from a fan event; how pins are counted (the clock-out
 * time, which lives in Keeping time › Goals; special days; not-yet pins; counted on this Mac; Reset pins, which lives
 * in Backup & restore). Settings are the pins engine's own (pins.json › settings), set with MLHost.pins.call("setSetting").
 */
export function pinsCard() {
  const st = state.st || {}, ps = st.pins || {};
  return { id: "pins", title: T3("Pins", "徽章", "เข็มกลัด"), words: "pins code unlock earn celebrate clock-out special days birthday secret reset 徽章 兌換碼 解鎖 收工 特別的日子 生日 祕密 重設",
    sum: [ps.total ? T3(`${ps.earned || 0} of ${ps.total} pins`, `${ps.earned || 0} / ${ps.total} 個徽章`, `เข็มกลัด ${ps.earned || 0} จาก ${ps.total}`) : ""].filter(Boolean).join(" · "),
    has: T3("The earning moment, codes, clock-out time, special days", "拿到時的動畫、兌換碼、收工時間、特別的日子", "ตอนได้รับ โค้ด เวลาเลิกงาน วันพิเศษ"), draw: pinsGroup };
}
function pinsGroup(main, redraw, go) {
  pinsCss();
  const st = state.st || {}, set = (st.pins || {}).settings || {};
  const save = async (k, v) => { await pinsCall("setSetting", k, v); if (st.pins?.settings) st.pins.settings[k] = v; toast(L("Saved", "已儲存")); };
  const note = (t, cls = "") => el("p", { className: "muted small pp-note " + cls, textContent: t });
  const row = (label, sub, ...ctrl) => el("div", { className: "field" }, el("span", {}, el("span", { textContent: label }), sub ? el("small", { className: "muted", textContent: " " + sub }) : null), el("span", { className: "inline" }, ...ctrl));
  if (!pinsApi()) { main.append(el("section", { className: "card pins-set-card" }, el("h3", { textContent: L("Pins", "徽章") }), note(T3("Pins are collected in the desktop app.", "徽章是在桌面版 App 裡收集的。", "เข็มกลัดสะสมได้ในแอปเดสก์ท็อป")))); return; }

  // 1. how they show
  const cele0 = set.celebrate || "big";
  const showMe = el("button", { type: "button", className: "btn small pp-show", textContent: T3("Show me", "播放看看", "ลองดู") });
  showMe.addEventListener("click", async () => {
    const s = await pinsCall("summary"), list = (await pinsCall("list")) || [], v = list.find((x) => x.id === s?.newest && x.earned) || list.find((x) => x.earned);
    if (!v) { toast(T3("No pins yet: the moment comes with your first.", "還沒有徽章：拿到第一個就會看到。", "ยังไม่มีเข็มกลัด ได้อันแรกแล้วจะเห็น")); return; }
    pinsMoment([{ id: v.id, tier: v.tier, first: v.tier === 0 }], { celebrate: "big", demo: true });
  });
  const buddySel = el("select", { "aria-label": T3("On the desktop buddy card", "桌面夥伴卡片上的徽章", "เข็มกลัดบนการ์ดบัดดี้") }, el("option", { value: "", textContent: T3("None", "不放", "ไม่มี") }));
  buddySel.addEventListener("change", async () => { await pinsCall("wear", buddySel.value || null); toast(L("Saved", "已儲存")); });
  main.append(el("section", { className: "card pins-set-card pins-show-card" }, el("h3", { textContent: T3("Showing your pins", "徽章怎麼出現", "การแสดงเข็มกลัด") }),
    row(T3("When you earn one", "拿到新徽章時", "เมื่อได้เข็มกลัดใหม่"), null, seg([["big", T3("Celebrate", "慶祝一下", "ฉลอง")], ["quiet", T3("A quiet note", "低調通知一下", "แจ้งเบา ๆ")], ["none", T3("Nothing", "不用通知", "ไม่ต้องแจ้ง")]], cele0,
      (v) => save("celebrate", v), T3("When you earn one", "拿到新徽章時", "เมื่อได้เข็มกลัดใหม่")), showMe),
    el("hr", { className: "pp-hr" }),
    row(T3("On the desktop buddy card", "桌面夥伴卡片上的徽章", "เข็มกลัดบนการ์ดบัดดี้"), null, buddySel),
    row(T3("Special days (birthdays)", "特別的日子（生日）", "วันพิเศษ (วันเกิด)"), null, seg([["on", T3("Remind me the day before", "前一天提醒我", "เตือนก่อนหนึ่งวัน")], ["off", T3("No reminder", "不用提醒", "ไม่ต้องเตือน")]], set.sdRemind === "on" ? "on" : "off",
      (v) => save("sdRemind", v), T3("Special days (birthdays)", "特別的日子（生日）", "วันพิเศษ (วันเกิด)")))));

  // 2. a code from a fan event
  const input = el("input", { type: "text", className: "pp-code", inputMode: "latin", autocomplete: "off", spellcheck: false, maxLength: 16, placeholder: "MLWH-XXXX-XXXX", "aria-label": T3("Unlock code", "兌換碼", "โค้ดปลดล็อก"), "aria-describedby": "pp-code-msg" });
  const msg = el("p", { id: "pp-code-msg", className: "small pp-msg", role: "status", "aria-live": "polite" });
  const go1 = el("button", { type: "button", className: "btn primary small pp-unlock", textContent: T3("Unlock", "兌換", "ปลดล็อก") });
  const tryCode = async () => { if (!input.value.trim()) return; go1.disabled = true; const m = await pinsCode(input.value); go1.disabled = false; msg.textContent = m.text; msg.className = "small pp-msg " + (m.ok ? "ok" : "bad"); if (m.ok) input.value = ""; };
  go1.addEventListener("click", tryCode);
  input.addEventListener("keydown", (e) => { if (enterKey(e)) tryCode(); });
  main.append(el("section", { className: "card pins-set-card pins-code-card" }, el("h3", { textContent: T3("Enter a code", "輸入兌換碼", "ใส่โค้ด") }),
    row(T3("Code", "兌換碼", "โค้ด"), null, input, go1), msg,
    note(T3("A code unlocks pins straight away. No internet or account needed.", "輸入兌換碼，徽章馬上解鎖。不用網路，也不用帳號。", "ใส่โค้ดแล้วเข็มกลัดปลดล็อกทันที ไม่ต้องใช้อินเทอร์เน็ตหรือบัญชี"))));

  // 3. how they're counted
  const toKeep = el("button", { type: "button", className: "btn small", textContent: T3("Change in Keeping time ›", "到「計時與每天的節奏」修改 ›", "เปลี่ยนที่ การจับเวลาและจังหวะของวัน ›") });
  toKeep.addEventListener("click", () => go("settings", { group: "keep", card: ".clockout-field" }));
  const toReset = el("button", { type: "button", className: "btn pp-link", textContent: T3("Reset pins… (in Backup & restore)", "重設徽章⋯（在「備份與還原」）", "รีเซ็ตเข็มกลัด… (ในสำรองและกู้คืน)") });
  toReset.addEventListener("click", () => go("settings", { group: "about", card: ".pd-reset" }));
  main.append(el("section", { className: "card pins-set-card pins-count-card" }, el("h3", { textContent: T3("How pins are counted", "徽章怎麼算", "นับเข็มกลัดอย่างไร") }),
    row(T3("Your clock-out time", "你的收工時間", "เวลาเลิกงานของคุณ"), T3("MUVMUV's milk counts the days you press Done for today by then", "MUVMUV 的牛奶會記下你在這個時間前按「收工」的天數", "นมของเมิฟเมิฟนับวันที่คุณกด \"เลิกงานวันนี้\" ก่อนเวลานี้"),
      el("b", { className: "pp-clockout", textContent: /^\d{2}:\d{2}$/.test(st.clockOut || "") ? st.clockOut : "19:00" }), toKeep),
    el("p", { className: "pp-line" }, el("b", { textContent: T3("Special days: ", "特別的日子：", "วันพิเศษ: ") }),
      T3("a special day counts when you open the app or work on any day of that week (from the birthday on), by your Mac's own clock.", "從生日那天起的一週內，任何一天打開 App 或工作都算，以你 Mac 的時間為準。", "นับเมื่อเปิดแอปหรือทำงานวันไหนก็ได้ในสัปดาห์นั้น (นับจากวันเกิด) ตามเวลาในเครื่อง Mac ของคุณ")),
    el("p", { className: "pp-line" }, el("b", { textContent: T3("Not-yet pins: ", "還沒拿到的徽章：", "เข็มกลัดที่ยังไม่ได้: ") }),
      T3("they show how to get them, but not what they look like: a grey silhouette with the rule. A few are secret, with only a hint.", "會顯示怎麼拿，但不顯示長相：灰色剪影加上規則。有幾個是祕密，只有提示。", "จะบอกวิธีได้ แต่ไม่บอกหน้าตา เป็นเงาสีเทากับกติกา มีบางอันเป็นความลับ มีแค่คำใบ้")),
    note(T3("Pins are counted on this Mac from your own work log; nothing is sent anywhere. They're kept with your data, so updates, reinstalls and backups keep them.", "徽章是用這台 Mac 上你自己的工作紀錄算出來的，不會傳到任何地方。徽章和你的資料存在一起，更新、重新安裝和備份都不會不見。", "เข็มกลัดนับจากบันทึกงานของคุณบนเครื่องนี้ ไม่มีการส่งออก เก็บไว้กับข้อมูลของคุณ อัปเดต ติดตั้งใหม่ หรือสำรองข้อมูลก็ยังอยู่")),
    el("div", { className: "row-flex pp-btns" }, toReset)));

  // what needs the collection: the buddy card's choices
  pinsLoad().then(async (d) => {
    if (!d) return;
    for (const v of d.list.filter((x) => x.earned)) buddySel.append(el("option", { value: v.id, textContent: pinName(v), selected: d.sum.settings?.buddyPin === v.id }));
  });
}
