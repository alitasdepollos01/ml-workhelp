// The website's live demo: the app's own pages (app.html, welcome.html) in a browser, with this standing
// in for the desktop app (main.js + preload.js). The work clock and reminders are the app's own engine
// (work.js, bundled as js/demo-work.js) on pretend files, with a few days of example work; settings are
// kept in memory (and the page's localStorage). Nothing leaves the browser.
//
// The website drives it with postMessage({ mlwh: { page, style, mode, theme, lang } }) and hears back
// { mlwhPage } when you change page inside it. Built by build.js (app/site-demo).
"use strict";
(function () {
  const Q = new URLSearchParams(location.search);
  const EMBED = Q.has("embed");
  const store = (k, v) => { try { if (v === undefined) { const t = localStorage.getItem("mlwh-demo:" + k); return t == null ? undefined : JSON.parse(t); } localStorage.setItem("mlwh-demo:" + k, JSON.stringify(v)); } catch { return undefined; } };
  const lang = ["en", "zh", "th"].includes(Q.get("lang")) ? Q.get("lang") : store("lang") || "en";
  const DATA = window.__mlwhDemoData || {}; // (demo-data.js: the stickers, credits, start lines, videos)

  // ---- the look: style, colour theme, light or dark -------------------------------------------
  const look = { style: Q.get("style") || store("style") || "f", theme: Q.get("theme") || store("theme") || "matcha" };
  const root = document.documentElement;
  root.dataset.style = look.style; root.dataset.theme = look.theme;

  // ---- pretend files for work.js ----------------------------------------------------------------
  const files = {};
  window.__memfs = {
    readFileSync: (f) => { if (!(f in files)) throw new Error("ENOENT " + f); return files[f]; },
    writeFileSync: (f, t) => { files[f] = String(t); },
    renameSync: (a, b) => { files[b] = files[a]; delete files[a]; },
    rmSync: (f) => { delete files[f]; },
  };

  // ---- settings, as the app keeps them --------------------------------------------------------
  const S = {
    keep: "work", label1: "auto", label2: "auto", thai: true, dailyGoal: 6, weekendGoal: 0, breakEvery: 50, breakLength: 10, askAgain: 10,
    deskWho: "pair", deskOnTop: true, stkEdge: "thin", stkShadow: "soft", deskPace: "calm", cardWhenHidden: true, popRem: true, popEv: true, popBrk: true,
    holdFocus: true, eventsThrough: true, hideInCalls: true, askName: true, appearance: "system", sound: "pink", soundVolume: 70,
    menuTimer: "away", menuShow: "task", contact: { email: "", sent: false }, library: "full", updateCheck: true, breakVideos: true,
    pomo: { kind: "classic", focus: 25, rest: 5, long: 15, every: 4 }, dayStart: "auto", askFrom: "07:00", startPick: "random", startLines: [],
    calendar: { on: false, cals: [], into: null, before: 10, allDay: false, ahead: 14 }, focusMood: null, breakMood: null, focusScreen: null,
    setupDone: true, buddyOff: [], ...(store("settings") || {}),
  };
  const saveS = () => store("settings", S);
  const pomoLengths = () => (S.pomo.kind === "classic" ? { focus: 25, rest: 5, long: 15, every: 4 } : { focus: S.pomo.focus, rest: S.pomo.rest, long: S.pomo.long, every: S.pomo.every });

  // ---- the engine, with a few days of example work ---------------------------------------------
  const W = window.__mlwhWork;
  const work = W.createWork({ dir: "/demo", now: () => Date.now() });
  const DAY = 864e5, H = 36e5, M = 6e4;
  const at = (daysAgo, h, m = 0) => { const d = new Date(Date.now() - daysAgo * DAY); d.setHours(h, m, 0, 0); return d.getTime(); };
  const T = (en, zh) => (lang === "zh" ? zh : en);
  (function seed() {
    const PLAN = [ // [start h, minutes, kind, name / type, category]
      [9, 30, 50, "work", T("Email & planning", "信件與規劃"), "admin"], [10, 25, 50, "work", T("Chapter 3 draft", "第三章初稿"), "focus"], [11, 15, 10, "break", "stretch"],
      [11, 25, 65, "work", T("Chapter 3 draft", "第三章初稿"), "focus"], [12, 30, 50, "break", "meal"], [13, 30, 45, "work", T("Team meeting", "團隊會議"), "meeting"],
      [14, 20, 80, "work", T("Reading for the thesis", "論文閱讀"), "study"], [15, 40, 15, "break", "coffee"], [16, 0, 70, "work", T("Chapter 3 draft", "第三章初稿"), "focus"],
    ];
    const FOCUS = [T("Finish chapter 3, then treat myself ♡", "寫完第三章，然後犒賞自己 ♡"), T("Reading day", "閱讀日"), T("Clear the inbox", "清空收件匣"), T("Meeting notes + slides", "會議紀錄和投影片"), T("Chapter 3, part 2", "第三章第二段")];
    for (let d = 13; d >= 1; d--) {
      const wd = new Date(Date.now() - d * DAY).getDay();
      if (wd === 0 || (wd === 6 && d % 3)) continue; // (weekends mostly off)
      const keep = 4 + ((d * 7) % 6); // (a different amount each day)
      PLAN.slice(0, keep).forEach(([h, m, len, kind, what, cat], i) => {
        const s = at(d, h, m + ((d * 3 + i) % 9)), e = s + len * M * (0.8 + ((d + i) % 4) * 0.12);
        work.addEntry(kind === "work" ? { kind, name: what, cat, start: s, end: e } : { kind, type: what, start: s, end: e });
      });
      work.setFocus(FOCUS[d % FOCUS.length], W.dayKey(at(d, 12)));
    }
    // Today: a morning so far, then working on chapter 3 now.
    const now = Date.now(), h0 = new Date().getHours();
    if (h0 >= 11) {
      work.addEntry({ kind: "work", name: T("Email & planning", "信件與規劃"), cat: "admin", start: at(0, 9, 30), end: at(0, 10, 15) });
      work.addEntry({ kind: "break", type: "coffee", start: at(0, 10, 15), end: at(0, 10, 25) });
    }
    work.setFocus(FOCUS[0]);
    try { work.startDay(); } catch { /* fine */ }
    work.setName(T("Chapter 3 draft", "第三章初稿"));
    for (const [text, min, rep] of [[T("Stretch", "伸展"), 25, null], [T("Call the bank", "打給銀行"), 140, null], [T("Drink water", "喝水"), 60 * 20, "daily"]]) {
      try { work.addReminder({ text, at: now + min * M, repeat: rep }); } catch { /* fine */ }
    }
    try { work.addReminder({ kind: "event", text: T("MilkLove IG live", "MilkLove IG 直播"), start: now + 6 * H, end: now + 7 * H }); } catch { /* fine */ }
  })();
  // You're at the computer: the clock counts (the app's tick, every second).
  const tick = () => { try { work.tick({ idle: 0, breakEvery: S.breakEvery, count: true, goal: S.dailyGoal }); } catch { /* fine */ } };
  setInterval(() => { tick(); tellWork(); }, 1000);

  // ---- the status the pages get ----------------------------------------------------------------
  let pomoNow = null;
  const status = () => ({
    ...work.status(), goal: S.dailyGoal, dailyGoal: S.dailyGoal, weekendGoal: S.weekendGoal, breakEvery: S.breakEvery, breakLength: S.breakLength, askAgain: S.askAgain,
    deskWho: S.deskWho, deskOnTop: S.deskOnTop, stkEdge: S.stkEdge, stkShadow: S.stkShadow, deskPace: S.deskPace, cardWhenHidden: S.cardWhenHidden,
    popRem: S.popRem, popEv: S.popEv, popBrk: S.popBrk, holdFocus: S.holdFocus, eventsThrough: S.eventsThrough, startAtLogin: false, size: 1, hideInCalls: S.hideInCalls, inCall: false,
    askName: S.askName, keep: S.keep, pomo: pomoLengths(), pomoKind: S.pomo.kind, pomoCustom: S.pomo, pomoNow: S.keep === "both" ? pomoNow : null,
    thai: S.thai, breakVideos: S.breakVideos, appearance: S.appearance, menuTimer: S.menuTimer, menuShow: S.menuShow,
    version: DATA.version || "1.2.0", whatsNew: null, update: null, updateCheck: S.updateCheck, updateAsked: 0, appPage: DATA.page || "", contact: S.contact, library: S.library, photoPack: "done",
    sound: S.sound, soundVolume: S.soundVolume, label1: S.label1, label2: S.label2, focusMood: S.focusMood, breakMood: S.breakMood, focusScreen: S.focusScreen, focusOn: false,
    calendar: S.calendar, dayStart: S.dayStart, askFrom: S.askFrom, startPick: S.startPick, startLines: S.startLines, startPresets: DATA.startLines || [],
  });
  let onCommand = null;
  const tellWork = () => { if (onCommand) try { onCommand("work", status()); } catch (e) { console.error(e); } };
  const later = (fn) => setTimeout(fn, 0);

  // The Pomodoro (the app's alarm page keeps it): a round running, so its timer and rounds show.
  const pomoStart = () => { const p = pomoLengths(); pomoNow = { kind: "focus", phase: "focus", endsAt: Date.now() + p.focus * M, round: 1, every: p.every }; try { work.setRound(1); } catch { /* fine */ } };

  // ---- what the pages ask for ------------------------------------------------------------------
  const ACT = {
    "switch-keep": (id) => { S.keep = id === "work" ? "work" : "both"; if (S.keep === "both") pomoStart(); else { pomoNow = null; try { work.setRound(null); } catch { /* fine */ } } },
    "take-break": () => work.takeBreak?.(),
    "snooze-break": () => work.snoozeBreak?.(),
    "reminder-done": (id) => work.doneReminder(String(id)),
    "reminder-snooze": (id) => work.snoozeReminder(String(id)),
    "start-break": (id) => { const [m, kind] = String(id ?? "0").split(":"); work.startBreak(Math.max(0, Math.min(240, Number(m) || 0)), kind && kind !== "pomodoro" ? kind : null); },
    "set-break": (id) => { const [m, kind] = String(id ?? "").split(":"); work.setBreak({ kind: kind || null, minutes: m === "" ? null : Number(m) }); },
    "end-break": () => work.endBreak({ breakEvery: S.breakEvery }),
    "back-next": () => { if (work.status().onBreak) work.endBreak({ breakEvery: S.breakEvery }); if (S.keep === "both") pomoStart(); },
    "pomo-break-now": () => { const p = pomoLengths(); pomoNow = { ...(pomoNow || {}), kind: "focus", phase: "break", endsAt: Date.now() + p.rest * M, round: pomoNow?.round || 1, every: p.every }; },
    "start-day": () => work.startDay(), "start": () => work.startDay(), "skip-day": () => work.skipDay(),
    "done-today": () => work.endDay(), "end-day": () => work.endDay(), "done": () => work.endDay(),
    "whats-new-seen": () => {}, "focus-screen": () => { if (!EMBED) alert(T("The focus screen fills your whole screen in the app.", "在 App 裡，專注全螢幕會佔滿整個螢幕。")); },
  };
  const act = (action, id) => {
    try { if (ACT[action]) ACT[action](id); else if (typeof work[action] === "function") work[action](id); } catch (e) { console.warn("demo:", action, e.message); }
    later(tellWork);
  };
  const setText = (key, value) => {
    if (key === "openPage" || key === "updateNow") return;
    if (key === "deskPace" || key === "deskWho" || key === "label1" || key === "label2" || key === "sound" || key === "keep" || key === "appearance" || key === "menuTimer" || key === "menuShow" || key === "stkEdge" || key === "stkShadow") S[key] = value;
    else if (["thai", "popRem", "popEv", "popBrk", "holdFocus", "eventsThrough", "cardWhenHidden", "breakVideos", "updateCheck"].includes(key)) S[key] = value === "on" || value === "1" || value === "true";
    else if (key === "startLines") { try { S.startLines = JSON.parse(value); } catch { /* fine */ } }
    else if (key === "pomoKind") S.pomo = { ...S.pomo, kind: value };
    else S[key] = value;
    if (key === "keep") ACT["switch-keep"](value === "work" ? "work" : "both");
    saveS(); later(tellWork);
  };
  const setNum = (key, value) => {
    if (/^pomo(Focus|Rest|Long|Every)$/.test(key)) S.pomo = { ...S.pomo, [key.slice(4).toLowerCase()]: Number(value) };
    else S[key] = Number(value);
    if (key === "breakEvery") work.setBreakEvery?.(Number(value));
    saveS(); later(tellWork);
  };
  const people = DATA.people || {}, order = DATA.order || [], contact = DATA.contact || { mail: "alitasdepollos01@gmail.com", x: "@alitasdepollos0", xUrl: "https://x.com/alitasdepollos0" };

  window.MLHost = {
    name: "electron", demo: true, lang,
    setLang: (l) => { store("lang", l); const u = new URL(location.href); u.searchParams.set("lang", l); location.replace(u.toString()); },
    themes: () => ({ theme: look.theme, themes: DATA.themes || [], style: look.style }),
    setTheme: (id) => { look.theme = id; root.dataset.theme = id; store("theme", id); onCommand?.("theme", id); },
    styles: () => ({ style: look.style, styles: DATA.styles || [] }),
    setStyle: (id) => { look.style = id; root.dataset.style = id; store("style", id); onCommand?.("style", id); },
    library: async () => DATA.library || { decks: {}, photos: [], stickers: {} },
    load: (k) => store("ui:" + k), save: (k, v) => store("ui:" + k, v),
    setInteractive: () => {}, setBuddyOff: (list) => { S.buddyOff = list; saveS(); }, notify: () => {}, report: () => {}, dragWindow: () => {},
    onCommand: (fn) => { onCommand = fn; later(tellWork); },
    menu: (kind) => { try { parent.postMessage({ mlwhMenu: { kind, x: pointer.x, y: pointer.y } }, "*"); } catch { /* fine */ } return true; }, setBuddies: () => {}, canSetBuddies: false, claimRing: async () => true, askToNotify: () => {},
    openTool: (which, ask) => { if (which === "welcome") location.href = "welcome.html" + location.search; else window.__mlwhApp?.go?.(which === "maker" ? "stickers" : which, ask || {}); },
    photoCredits: async () => ({ credits: DATA.credits || {}, stickers: DATA.stickers || [], people, order, mine: [], contact }),
    mySource: async () => ({ ok: false }), copyText: async () => true, openMail: async () => true, savePicture: async () => null, uninstall: () => {}, openPhotosFolder: () => {},
    pomo: () => {}, breakVideo: async (action) => (action === "list" || action === "next" || action === "pick" ? (DATA.videos || [])[Math.floor(Math.random() * (DATA.videos || [1]).length)] || null : null),
    calendar: async (action) => (action === "status" ? { access: "none", on: false } : action === "events" ? [] : null),
    apple: async (action) => (action === "status" ? { access: "none", on: false } : null),
    settingText: setText, deskWindow: () => {}, quick: { act: quickAct, size: (h) => up({ mlwhQuickSize: h }), ready: () => later(() => onCommand?.("quick", quickModel())) },
    remind: { act: () => up({ mlwhRemind: "close" }), size: (h) => up({ mlwhRemindSize: h }), ready: () => later(() => onCommand?.("cards", demoCards())) },
    workClock: () => {}, systems: () => {},
    setup: {
      info: async () => ({ os: "mac", seeds: { full: DATA.counts || { milk: 290, love: 287, together: 256, others: 26 } }, pack: { state: "idle", size: 3.2e8, photos: 743 },
        existing: { milk: 0, love: 0, together: 0, others: 0 }, folder: "", library: null, setupDone: false, contact: { email: "", sent: false } }),
      choose: async () => ({ ok: true, stickers: { milk: 0, love: 0, together: 0, others: 0 } }),
      // (the full library's download, pretended: a few seconds)
      pack: async () => { let got = 0; const size = 3.2e8; const t = setInterval(() => { got = Math.min(size, got + size / 25); packFn?.({ state: got >= size ? "done" : "downloading", got, size, stickers: DATA.counts || { milk: 290, love: 287, together: 256, others: 26 } }); if (got >= size) clearInterval(t); }, 200); return { ok: true }; },
      packState: async () => ({ state: "idle" }), onPack: (fn) => { packFn = fn; },
      bringBuddy: () => {}, contact: async () => ({ ok: true, state: "saved" }),
    },
    work: {
      status: async () => status(),
      act, addReminder: async (text, at2, repeat = null, more = {}) => { try { const r = work.addReminder({ ...more, text, at: at2, repeat }); later(tellWork); return { ok: true, reminder: r }; } catch (e) { return { ok: false, error: e.message }; } },
      removeReminder: (id) => { work.removeReminder(String(id)); later(tellWork); },
      setName: (t) => { work.setName(String(t || "")); later(tellWork); },
      history: async (from, to) => work.history(Number(from) || 0, Number(to) || Date.now()),
      setting: setNum,
      call: async (method, ...args) => { try { const out = work[method](...args); later(tellWork); return out === undefined ? true : out; } catch (e) { return { error: e.message }; } },
    },
  };
  let packFn = null;
  function up(msg) { try { parent.postMessage(msg, "*"); } catch { /* fine */ } }
  const pointer = { x: 0, y: 0 };
  addEventListener("contextmenu", (e) => { pointer.x = e.clientX; pointer.y = e.clientY; }, true);
  if (/mode=buddy/.test(location.search)) addEventListener("pointerdown", (e) => { if (e.button === 0) up({ mlwhDown: true }); }, true); // (a click on the desktop: the card goes)

  // The buddy's right-click card (quick.html), the app's model of it (main.js quickModel), in short.
  function quickModel() {
    const st = status(), hm = (ms) => { const m = Math.floor((ms || 0) / 6e4); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`; };
    const b = (id, icon, label, sub = false) => ({ id, icon, label, sub });
    return {
      time: hm(st.today), timeLabel: st.onBreak ? T("worked today · on a break", "今天工作 · 休息中") : T("worked today", "今天工作"), pomo: "",
      name: st.onBreak ? "" : st.name || "", nameHint: T("Name what I'm working on…", "幫正在做的事取名⋯"), nameTip: T("Change what I'm working on", "更改正在做的事"), switchLabel: T("Switch", "切換"),
      big: [st.onBreak ? b("break", "back", T("I'm back", "我回來了")) : b("break", "brk", T("Take a break", "休息一下"), true), b("focus", "focus", T("Focus screen", "專注全螢幕")),
        b("remind", "rem", T("Remind me", "提醒我"), true), b("done", "done", T("Done for today", "收工"))],
      who: S.deskWho || "pair", whoTitle: T("On my desktop", "桌面上是"), whoHint: T("tap again for another sticker", "再點一次換一張"),
      whoOpts: [["pair", T("Both, side by side", "並排")], ["together", T("Together", "同框")], ["milk", "Milk"], ["love", "Love"], ["others", T("Others", "其他")]],
      small: [b("hide", "hide", T("Hide", "隱藏"), true), b("app", "app", T("Open app", "打開 App")), b("settings", "settings", T("Settings", "設定"))],
    };
  }
  function quickAct(id) {
    if (String(id).startsWith("who:")) { const w = id.slice(4); const again = (S.deskWho || "pair") === w; S.deskWho = w; saveS(); up({ mlwhQuick: id, again }); onCommand?.("quick", quickModel()); return; }
    if (id === "break") act(work.status().onBreak ? "end-break" : "start-break", "10");
    up({ mlwhQuick: id });
  }
  // With the buddy hidden: the card at the top right of the screen (remind.html).
  const demoCards = () => [{ id: 1, title: T("Reminder", "提醒"), body: T("Call the bank", "打給銀行"), buttons: [T("Done", "完成"), T("In 10 min", "10 分鐘後")], spot: "app-rem-add", close: T("Close", "關閉") },
    { id: 2, title: T("Time for a break", "該休息了"), body: T("You've been working for 50 min.", "你已經連續工作 50 分鐘了。") + "\nพัก (phak): " + T("rest", "休息"), buttons: [T("Taking one", "去休息囉"), T("In 10 min", "10 分鐘後")], spot: "app-pomo-break", close: T("Close", "關閉") }];

  // ---- the website drives it -------------------------------------------------------------------
  const tellParent = (page) => { try { parent.postMessage({ mlwhPage: page }, "*"); } catch { /* fine */ } };
  window.__mlwhDemoTell = tellParent;
  addEventListener("message", (e) => {
    if (e.data && Array.isArray(e.data.mlwhCmd)) { onCommand?.(e.data.mlwhCmd[0], e.data.mlwhCmd[1]); return; } // (from the pretend desktop: buddy.html)
    const m = e.data && e.data.mlwh;
    if (!m) return;
    if (m.style && m.style !== look.style) window.MLHost.setStyle(m.style);
    if (m.theme && m.theme !== look.theme) window.MLHost.setTheme(m.theme);
    if (m.lang && m.lang !== lang && ["en", "zh", "th"].includes(m.lang)) return window.MLHost.setLang(m.lang);
    if (m.page && window.parent !== window && !/mode=buddy|quick|remind/.test(location.href)) window.__mlwhGoPage(m.page);
  });
  // The website's tabs: Welcome (welcome.html), Desktop buddy (buddy.html) and the window's pages (app.html).
  window.__mlwhGoPage = (page) => {
    const file = page === "welcome" ? "welcome.html" : page === "buddy" ? "buddy.html" : "app.html", here = location.pathname.split("/").pop() || "app.html";
    if (file !== here) { location.href = file + location.search + (file === "app.html" ? "#" + encodeURIComponent(JSON.stringify({ tab: page === "data" ? "week" : page })) : ""); return; }
    if (file === "app.html") window.__mlwhApp?.go?.(page === "data" ? "week" : page, page === "settings" ? { group: null } : {});
  };
  // You changed page inside: the website follows.
  let lastTab = null;
  setInterval(() => { const t = window.__mlwhApp?.tab?.(); if (t && t !== lastTab) { lastTab = t; tellParent(t === "week" ? "data" : t); } }, 400);
  // Embedded: the app's window, scaled to fit the frame (it's laid out for 1100 px).
  if (EMBED && /(app|welcome)\.html$/.test(location.pathname)) {
    const fit = () => { root.style.zoom = String(Math.min(1, innerWidth / 1100)); };
    fit(); addEventListener("resize", fit);
    root.classList.add("demo-embed");
  }
})();
