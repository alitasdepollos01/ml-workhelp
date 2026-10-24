// The Desktop buddy page (Fan corner): Milk and Love on your desktop, and everything about them, here only.
// On top a live preview (a pretend desktop, the buddy with its two lines, at a few moments of the day) and
// one big button, Bring it out ↔ Put it away. Then four cards, the everyday things first and the rare ones
// under "More": ① who & look, ② how it behaves, ③ Thai words, ④ when to hide. Every sticker on the page
// says whose photo it is when you point at it. (Until 1.2 this was Settings › Desktop buddy & Thai.)

import { L, el, host, work, state, deco, toast, pageTop, creditFor } from "./app-common.js";
import { deckOptions } from "./deck.js";
import { labelLines, labelItems } from "./label.js";
import { buddyStickersCard } from "./buddy-picker.js";

const NS = "http://www.w3.org/2000/svg";
const P = {
  buddy: ["M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17z", "M9 10v.1", "M15 10v.1", "M8.5 14a4 4 0 0 0 7 0"],
  walk: ["M13 4.5v.1", "M9 21l2.5-6 2.5 2v4", "M7 12l3-3.5 3 1 2 3 2.5 1", "M10 8.5L9 14"],
  word: ["M4.5 5.5h15v10h-8l-4 3.5v-3.5h-3z", "M8.5 10.5h7"],
  hide: ["M3.5 12s3-6 8.5-6 8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6z", "M4.5 19.5l15-15"],
  show: ["M3.5 12s3-6 8.5-6 8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6z", "M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"],
  battery: ["M3.5 8h15v8h-15z", "M20.5 10.5v3", "M6.5 11v2", "M9.5 11v2"],
  phone: ["M6.5 4h3l1.5 4-2 1.5a10 10 0 0 0 5.5 5.5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A15.5 15.5 0 0 1 4.5 6a2 2 0 0 1 2-2z"],
};
function ico(name, cls = "ico") {
  const s = document.createElementNS(NS, "svg");
  for (const [k, v] of Object.entries({ viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.7", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true", class: cls })) s.setAttribute(k, v);
  for (const d of P[name] || []) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); s.append(p); }
  return s;
}
const saved = () => toast(L("Saved", "已儲存"));
const DECK_ZH = { "All cards": "全部卡片", "All song words": "所有歌曲單字", "All everyday words": "所有日常單字", "Song lines": "歌詞句", Songs: "歌曲", "Everyday Thai": "日常泰文" };

// Who's on the desktop: the app's own preview stickers for each (with whose photo they are), as on the right-click card.
const FACES = { pair: ["preview-milk", "preview-love"], together: ["w11-left"], milk: ["preview-milk"], love: ["preview-love"], others: ["app-menu"] };
const WHO = () => [["pair", L("Side by side", "並排"), L("Milk and Love, side by side", "Milk 和 Love 並排")], ["together", L("Together", "同框"), L("Milk and Love together", "Milk 和 Love 同框")],
  ["milk", "Milk", "Milk"], ["love", "Love", "Love"], ["others", L("Others", "其他"), L("Others (your own stickers)", "其他（你自己的貼圖）")]];
const PACES = () => [["lively", L("Lively", "活潑"), L("Walks about all the time", "一直走來走去")], ["calm", L("Calm", "悠閒"), L("A stroll every half a minute or so", "每半分鐘左右散步一下")],
  ["calmer", L("Calmer", "更悠閒"), L("A stroll every minute or two", "每一兩分鐘散步一下")], ["still", L("Still", "安靜"), L("Stays where you put it", "待在你放的地方")]];
const SIZES = () => [[0.75, L("Small", "小")], [1, L("Medium", "中")], [1.25, L("Large", "大")], [1.5, L("Extra large", "特大")]];

let moment = "work";  // the preview's moment of the day
let bubble = false;   // the preview's Thai word (click them)
const open = {};      // the "More" folds left open

/** Choice buttons filling the width (Settings' days-pick): the one picked shows at once. */
function pick(options, value, onPick, label) {
  const g = el("div", { className: "days-pick bp-dp", role: "radiogroup", "aria-label": label });
  g.append(...options.map(([v, t]) => {
    const b = el("button", { type: "button", className: String(v) === String(value) ? "on" : "", role: "radio", "aria-checked": String(String(v) === String(value)), textContent: t });
    b.addEventListener("click", () => { for (const x of g.children) { x.classList.toggle("on", x === b); x.setAttribute("aria-checked", String(x === b)); } onPick(v); });
    return b;
  }));
  return g;
}
function sw(on, onChange, label) {
  const b = el("button", { type: "button", className: "switch" + (on ? " on" : ""), role: "switch", "aria-checked": String(!!on), "aria-label": label });
  b.addEventListener("click", () => onChange(!on));
  return b;
}
function select(options, value, onChange, label) {
  const s = el("select", { "aria-label": label }, options.map(([v, t]) => new Option(t, String(v))));
  s.value = String(value);
  s.addEventListener("change", () => onChange(s.value));
  return s;
}
const fr = (label, control, desc = "", cls = "") => el("div", { className: "bp-fr " + cls, "data-label": label },
  el("span", { className: "bp-fr-l" }, el("b", { textContent: label }), desc ? el("span", { className: "muted", textContent: desc }) : null), el("span", { className: "bp-fr-c" }, control));
const fs = (label, ...body) => el("div", { className: "bp-fs", "data-label": label }, el("b", { className: "bp-fs-l", textContent: label }), ...body);
function more(id, summary, ...body) {
  const d = el("details", { className: "bp-det", open: !!open[id] }, el("summary", {}, el("span", { className: "bp-det-t", textContent: L("More", "更多") }), el("span", { className: "muted", textContent: summary })),
    el("div", { className: "bp-det-b" }, ...body));
  d.addEventListener("toggle", () => { open[id] = d.open; });
  return d;
}
const card = (id, icon, title, summary, side, ...body) => el("section", { className: "card bp-grp", id: "g-" + id },
  el("header", { className: "bp-gh" }, ico(icon), el("h3", { className: "bp-h", textContent: title }), el("span", { className: "muted bp-gsum", textContent: summary }), side), ...body);

/** "A new sticker every…": kept in this window's storage ("mlwh:pose"); the buddy pages hear a change at once. */
function switchEvery() {
  const opts = [[30, L("30 seconds", "30 秒")], [60, L("1 minute", "1 分鐘")], [120, L("2 minutes", "2 分鐘")], [300, L("5 minutes", "5 分鐘")], [600, L("10 minutes", "10 分鐘")],
    [1800, L("30 minutes", "30 分鐘")], [0, L("Never: keep one", "不換：一直用同一張")]];
  let now = 120; try { const v = localStorage.getItem("mlwh:pose"); if (v != null) now = Number(JSON.parse(v)); } catch { /* the default */ }
  return select(opts, opts.some(([v]) => v === now) ? now : 120, (v) => { try { localStorage.setItem("mlwh:pose", JSON.stringify(Number(v))); } catch { /* (private window) */ } saved(); }, L("A new sticker every", "多久換一張貼圖"));
}

// ---- the live preview ----------------------------------------------------------------
function preview(st, redraw) {
  const keep = st.keep || "work", t = Date.now();
  const moments = keep !== "work"
    ? [["focus", L("Focus", "專注")], ["pbreak", L("Break", "休息")], ["call", L("On a call", "通話中")]]
    : [["work", L("Working", "工作中")], ["brk", L("Break", "休息")], ["wait", L("Not started", "還沒開始")], ["call", L("On a call", "通話中")]];
  if (!moments.some(([k]) => k === moment)) moment = moments[0][0];
  const m = moment === "call" ? (keep !== "work" ? "focus" : "work") : moment;
  const base = { ...st, name: st.name || L("Thesis", "論文"), stretch: 25 * 60e3, today: 3 * 3600e3 + 20 * 60e3, started: true, onBreak: null, pomoNow: null, rounds: st.rounds || 5, dayStart: "ask",
    reminders: (st.reminders || []).length ? st.reminders : [{ text: L("Call the bank", "打給銀行"), at: t + 85 * 60e3 }] };
  const w = { ...base, ...({
    focus: { pomoNow: { phase: "focus", endsAt: t + (18 * 60 + 42) * 1000, round: 2, every: 4 } },
    pbreak: { pomoNow: { phase: "break", endsAt: t + (3 * 60 + 51) * 1000, round: 2, every: 4 } },
    brk: { onBreak: { kind: "coffee", since: t - 6 * 60e3, until: t + 4 * 60e3 } },
    wait: { started: false },
  }[m] || {}) };
  const [l1, l2] = labelLines(w, "", () => "น้ำ · " + L("water", "水"));
  const out = !!st.deskOut, away = (st.hiddenUntil || 0) > t, callHide = moment === "call" && st.hideInCalls !== false;
  const moodHide = keep !== "work" && m === "focus" && st.focusMood === "hide";
  const sign = keep !== "work" && m === "pbreak" && (st.breakMood || "lively") === "lively";
  const pace = sign ? "lively" : keep !== "work" && m === "focus" && st.focusMood === "calm" ? "still" : st.deskPace || "calm";
  const hidden = !out || away || callHide || moodHide;
  const until = away ? new Date(st.hiddenUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  const note = !out ? L("Put away. Bring it back here, or from the heart in the menu bar.", "收起來了。在這裡或選單列的愛心就能叫她回來。")
    : away ? L(`Hidden until ${until}`, `隱藏到 ${until}`) : callHide ? L("Hiding until the call ends", "通話結束再出來") : moodHide ? L("Out of sight until the break", "先躲起來，休息時再出來")
    : moment === "call" ? L("Hide during calls is off: still out", "「通話時先躲起來」關著：還在外面") : "";
  const thai = st.thai !== false;
  const walker = el("button", { type: "button", className: "bp-walker", "aria-label": thai ? L("Click them for a Thai word", "點她們看泰文單字") : L("Click them to say hi", "點她們打招呼") },
    bubble && !hidden ? el("div", { className: "bubble bp-bubble" }, ...(thai ? [el("p", { className: "th", lang: "th", textContent: "น้ำ" }), el("p", { className: "rom", textContent: "nám" }), el("p", { className: "en", textContent: L("water", "水") })]
      : [el("p", { className: "en", textContent: L("Hi! Back to work?", "嗨！繼續加油？") })])) : null,
    el("span", { className: "pv-pair" }, (FACES[st.deskWho || "pair"] || FACES.pair).map((s) => deco(s, ""))),
    l1 || l2 ? el("span", { className: "pv-label" }, l1 ? el("span", { className: "l1", textContent: l1 }) : null, l2 ? el("span", { className: "l2", textContent: l2 }) : null) : null);
  walker.addEventListener("click", () => { bubble = !bubble; redraw(); });
  const chips = el("div", { className: "pv-moments bp-moments", role: "group", "aria-label": L("Try a moment of the day", "試試一天裡的不同時候") }, moments.map(([k, txt]) => {
    const b = el("button", { type: "button", className: "chip" + (moment === k ? " on" : ""), "aria-pressed": String(moment === k) }, k === "call" ? ico("phone", "ico sm") : null, txt);
    b.addEventListener("click", () => { moment = k; redraw(); });
    return b;
  }));
  return el("div", { className: "bp-pv bp-pv-hero", "data-pace": pace, "data-size": String(st.size || 1), "data-hidden": String(hidden), "data-edge": st.stkEdge || "thin", "data-shadow": String((st.stkShadow || "soft") === "soft"),
    "aria-label": L("What the desktop buddy will look like", "桌面夥伴大概長這樣") },
    el("div", { className: "bp-menubar", "aria-hidden": "true" }, el("b"), el("b", { textContent: "Finder" }), el("span", { textContent: "File" }), el("span", { textContent: "Edit" }), el("span", { textContent: "View" }),
      el("span", { className: "sp" }), el("span", { className: "heart", textContent: "♡" }), el("span", { textContent: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) })),
    el("div", { className: "bp-win w1" }), el("div", { className: "bp-win w2" }), chips,
    sign && !hidden ? el("span", { className: "pv-sign bp-sign", textContent: L("Break time!", "休息時間！") }) : null,
    el("div", { className: "bp-roam" }, walker),
    note ? el("div", { className: "bp-note" + (out && !hidden ? " soft" : ""), textContent: note }) : null);
}

// ---- the page --------------------------------------------------------------------------
export function renderBuddy(main, { redraw, go, ask = {} }) {
  const st = state.st || {};
  const keep = st.keep || "work", thai = st.thai !== false, out = !!st.deskOut;
  main.classList.add("bp-page");
  main.append(pageTop({ crumb: L("Fan corner", "粉絲角落"), title: L("Desktop buddy", "桌面夥伴"), spot: "app-set-buddy", className: "bp-top",
    sub: L("Milk and Love on your desktop: who walks, how they look and behave, the Thai words they teach, and when they hide. The preview follows every change.",
      "Milk 和 Love 在你的桌面上：誰出來、長什麼樣、怎麼活動、教哪些泰文、什麼時候躲起來。示意圖會跟著每個設定變。") }));

  // The preview, and the one big button.
  const go1 = el("button", { type: "button", className: "btn primary big bp-go" }, ico(out ? "hide" : "show"), el("span", { textContent: out ? L("Put it away", "收起夥伴") : L("Bring it out", "叫出夥伴") }));
  go1.addEventListener("click", () => { host.setBuddies?.("desk", !out); state.st.deskOut = !out; if (!out) state.st.hiddenUntil = 0; bubble = false; setTimeout(redraw, 120); });
  main.append(el("section", { className: "card bp-hero" }, preview(st, redraw),
    el("div", { className: "bp-hero-bar" }, el("div", { className: "bp-main" }, go1,
      el("span", { className: "bp-status" + (out ? " on" : "") }, el("i", { "aria-hidden": "true" }), out ? L("On your desktop now", "正在你的桌面上") : L("Put away", "收起來了"))),
      el("span", { className: "muted bp-hint", textContent: thai ? L("Click them for a Thai word", "點她們看泰文單字") : L("Click them to say hi", "點她們打招呼") }))));

  // ① Who & look
  const who = st.deskWho || "pair", whoRow = WHO().find(([k]) => k === who) || WHO()[0];
  const faces = el("div", { className: "bp-faces", role: "radiogroup", "aria-label": L("Who walks", "誰出來散步") }, WHO().map(([k, short, long]) => {
    const b = el("button", { type: "button", className: "bp-face", role: "radio", "aria-checked": String(who === k), title: long },
      el("span", { className: "bp-face-img" + (FACES[k].length > 1 ? " two" : "") }, FACES[k].map((s) => deco(s, ""))), el("span", { className: "bp-face-t", textContent: short }));
    b.addEventListener("click", () => {
      // (the one picked again: another sticker of them, as on the right-click card)
      host.settingText(who === k ? "deskShuffle" : "deskWho", k); if (who !== k) { state.st.deskWho = k; saved(); } setTimeout(redraw, 120);
    });
    return b;
  }));
  const sizeName = (SIZES().find(([v]) => v === Number(st.size || 1)) || SIZES()[1])[1];
  main.append(card("look", "buddy", L("Who & look", "是誰與樣子"), `${whoRow[1]} · ${sizeName}`, null,
    fs(L("Who walks", "誰出來散步"), faces, el("span", { className: "muted", textContent: `${whoRow[2]} · ${L("Tap the one picked again for another sticker", "再點一次已選的就換一張")}` })),
    el("div", { className: "bp-two" },
      fs(L("Size", "大小"), pick(SIZES(), st.size || 1, (v) => { state.st.size = v; work.setting("buddySize", v); setTimeout(redraw, 120); }, L("Buddy size", "夥伴大小"))),
      fs(L("Stickers in use", "使用中的貼圖"), buddyStickersCard())),
    more("look", L("a new sticker every…, white edge, shadow, bumping into each other", "多久換一張貼圖、白邊、陰影、撞在一起"),
      fr(L("A new sticker every", "多久換一張貼圖"), switchEvery()),
      fr(L("White edge", "白邊"), pick([["none", L("None", "無")], ["thin", L("Thin", "細")], ["thick", L("Thick", "粗")]], st.stkEdge || "thin", (v) => { state.st.stkEdge = v; host.settingText("stkEdge", v); saved(); setTimeout(redraw, 120); }, L("White edge around the stickers", "貼圖的白邊"))),
      fr(L("Shadow", "陰影"), sw((st.stkShadow || "soft") === "soft", (v) => { state.st.stkShadow = v ? "soft" : "none"; host.settingText("stkShadow", v ? "soft" : "none"); saved(); setTimeout(redraw, 120); }, L("Shadow", "陰影")), L("A soft shadow under the stickers", "貼圖下面的柔和陰影")),
      fr(L("Bump into each other", "撞在一起"), sw(st.deskMerge !== false, (v) => { state.st.deskMerge = v; host.settingText("deskMerge", v ? "on" : "off"); saved(); setTimeout(redraw, 120); }, L("Bump into each other", "撞在一起")),
        L("Side by side, they sometimes bump into each other and walk on together", "並排時，她們偶爾會撞在一起，然後一起散步")))));

  // ② How it behaves
  const pace = st.deskPace || "calm", paceRow = PACES().find(([k]) => k === pace) || PACES()[1];
  const items = labelItems(keep, thai);
  const line = (k, label) => select(items, items.some(([v]) => v === st[k]) ? st[k] : "auto", (v) => { state.st[k] = v; host.settingText(k, v); saved(); setTimeout(redraw, 120); }, label);
  const mood = (k, opts, label) => select(opts, st[k] || opts[0][0], (v) => { state.st[k] = v; host.settingText(k, v); saved(); setTimeout(redraw, 120); }, label);
  // Which screen: a one-off move (or just drag it there).
  const screens = st.screens || [];
  const moveBtn = el("button", { type: "button", className: "btn small", disabled: screens.length < 2, textContent: L("Move to…", "移到⋯") });
  const moveMenu = el("div", { className: "bp-menu", hidden: true, role: "menu" }, screens.map((s) => {
    const b = el("button", { type: "button", role: "menuitem", className: s.id === st.deskScreen ? "on" : "", textContent: s.label + (s.id === st.deskScreen ? L(" · here now", " · 現在在這裡") : "") });
    b.addEventListener("click", () => { moveMenu.hidden = true; host.settingText("deskScreen", String(s.id)); toast(L(`Moved to ${s.label}`, `移到 ${s.label} 了`)); });
    return b;
  }));
  moveBtn.addEventListener("click", (e) => { e.stopPropagation(); moveMenu.hidden = !moveMenu.hidden; if (!moveMenu.hidden) setTimeout(() => document.addEventListener("click", () => { moveMenu.hidden = true; }, { once: true })); });
  const screenNote = screens.length < 2 ? L("One screen: nowhere else to go.", "只有一個螢幕，沒有地方可以移。") : L("Or just drag them onto the other screen.", "也可以直接把她們拖到另一個螢幕。");
  main.append(card("behave", "walk", L("How it behaves", "怎麼活動"), `${paceRow[1]} · ${st.deskOnTop === false ? L("behind windows", "在視窗後面") : L("on top of windows", "在視窗上面")}`, null,
    fs(L("How lively", "活潑程度"), pick(PACES().map(([v, t]) => [v, t]), pace, (v) => { state.st.deskPace = v; host.settingText("deskPace", v); saved(); setTimeout(redraw, 120); }, L("How lively", "活潑程度")),
      el("span", { className: "bp-desc", textContent: paceRow[2] }),
      el("span", { className: "muted bp-batt" }, ico("battery", "ico sm"), el("span", { textContent: L("On battery? Calm, Calmer or Still are easier on it than Lively.", "用電池的時候，「悠閒」、「更悠閒」或「安靜」都比「活潑」省電。") }))),
    el("div", { className: "bp-two" }, fs(L("Under the buddy: first line", "夥伴下面：第一行"), line("label1", L("First line under the buddy", "夥伴下面第一行"))),
      fs(L("Second line", "第二行"), line("label2", L("Second line under the buddy", "夥伴下面第二行")))),
    keep !== "work" ? el("div", { className: "bp-two" },
      fs(L("During a Pomodoro focus", "番茄鐘專注時"), mood("focusMood", [["usual", L("Carry on as usual", "跟平常一樣")], ["calm", L("Keep calm and quiet", "安靜地陪你")], ["hide", L("Out of sight until the break", "先躲起來，休息時再出來")]], L("During a Pomodoro focus", "番茄鐘專注時"))),
      fs(L("During a Pomodoro break", "番茄鐘休息時"), mood("breakMood", [["lively", L("Lively, with a sign", "活潑起來，舉牌提醒你")], ["usual", L("As usual", "跟平常一樣")]], L("During a Pomodoro break", "番茄鐘休息時"))))
      : el("p", { className: "muted bp-pomo-hint", textContent: L("With the Pomodoro, two more show here: during a focus, and during a break.", "用番茄鐘時，這裡還會多兩項：專注時、休息時。") }),
    more("behave", L("where windows overlap, which screen", "跟視窗重疊時、在哪個螢幕"),
      fr(L("Where windows overlap", "跟視窗重疊時"), pick([[1, L("On top of them", "在視窗上面")], [0, L("Behind them", "在視窗後面")]], st.deskOnTop === false ? 0 : 1, (v) => { state.st.deskOnTop = !!Number(v); work.setting("deskOnTop", Number(v)); saved(); }, L("Where windows overlap", "跟視窗重疊時"))),
      fr(L("Which screen", "在哪個螢幕"), el("span", { className: "bp-move" }, moveBtn, moveMenu), screenNote))));

  // ③ Thai words
  const deck = el("select", { "aria-label": L("The buddies teach words from", "夥伴教的單字從哪來") });
  host.library?.().then((lib) => {
    const opts = deckOptions(lib || {}), groups = new Map();
    for (const o of opts) {
      let parent = deck;
      if (o.group) { if (!groups.has(o.group)) { const g = el("optgroup", { label: L(o.group, DECK_ZH[o.group]) }); deck.append(g); groups.set(o.group, g); } parent = groups.get(o.group); }
      parent.append(new Option(L(o.label, DECK_ZH[o.label]), o.value));
    }
    let cur = "all"; try { cur = JSON.parse(localStorage.getItem("mlwh:deck")) || "all"; } catch { /* fine */ }
    deck.value = opts.some((o) => o.value === cur) ? cur : "all";
  }).catch(() => {});
  deck.addEventListener("change", () => { try { localStorage.setItem("mlwh:deck", JSON.stringify(deck.value)); } catch { /* fine */ } saved(); });
  main.append(card("thai", "word", L("Thai words (the buddy teaches them)", "泰文單字（夥伴教的）"), thai ? L("on", "開啟") : L("off", "關閉"),
    sw(thai, (v) => { state.st.thai = v; host.settingText("thai", v ? "on" : "off"); toast(v ? L("Thai words on", "泰文單字已開啟") : L("Thai words off", "泰文單字已關閉")); setTimeout(redraw, 150); }, L("Thai words", "泰文單字")),
    thai ? fr(L("The buddies teach words from", "夥伴教的單字從哪來"), deck, "", "bp-fr-deck") : null,
    el("p", { className: "muted bp-p", textContent: thai
      ? L("Click a buddy for a Thai word card; each reminder and break comes with a Thai word from here too.", "點夥伴會跳出泰文單字卡；每次提醒和休息，也會從這裡附上一個泰文單字。")
      : L("Off: no Thai word cards anywhere (clicking a buddy just says hi, and reminders and breaks come without a word). Turn it on any time.", "已關閉：不會出現任何泰文單字卡（點夥伴只會打招呼，提醒和休息也不附單字）。想學時隨時可以再打開。") }),
    thai ? el("p", { className: "muted bp-p", textContent: L("A Thai word can also sit under the buddy: How it behaves › the two lines.", "泰文單字也可以放在夥伴下面：怎麼活動 › 下面兩行。") }) : null));

  // ④ When to hide
  const away = (st.hiddenUntil || 0) > Date.now(), until = away ? new Date(st.hiddenUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  const hideFor = (min) => { host.settingText("hideFor", String(min)); state.st.hiddenUntil = min ? Date.now() + min * 60e3 : 0; setTimeout(redraw, 150); };
  const forWhile = away
    ? el("span", { className: "bp-fr-c" }, el("span", { className: "bp-until", textContent: L(`Hidden until ${until}`, `隱藏到 ${until}`) }), (() => { const b = el("button", { type: "button", className: "btn small", textContent: L("Show them again", "讓她們回來") }); b.addEventListener("click", () => hideFor(0)); return b; })())
    : el("span", { className: "chips bp-chips" }, [[30, L("30 minutes", "30 分鐘")], [60, L("1 hour", "1 小時")], [120, L("2 hours", "2 小時")]].map(([v, t]) => { const b = el("button", { type: "button", className: "chip", textContent: t }); b.addEventListener("click", () => hideFor(v)); return b; }));
  const cardOn = st.cardWhenHidden !== false;
  main.append(card("hide", "hide", L("When to hide", "什麼時候躲起來"), [st.hideInCalls !== false ? L("hides in calls", "通話時躲起來") : "", away ? L(`hidden until ${until}`, `隱藏到 ${until}`) : ""].filter(Boolean).join(" · "), null,
    fr(L("Hide during calls", "通話時先躲起來"), sw(st.hideInCalls !== false, (v) => { state.st.hideInCalls = v; work.setting("hideInCalls", v ? 1 : 0); saved(); setTimeout(redraw, 120); }, L("Hide during calls", "通話時先躲起來")), L("While the microphone or camera is on", "麥克風或相機開著的時候")),
    fr(L("Hide for a while", "暫時隱藏"), forWhile, L("For a meeting or sharing your screen; they come back by themselves.", "開會或分享螢幕時用；時間到會自己回來。")),
    fr(L("When it's hidden or put away, show a card on screen", "收起來或隱藏的時候，在螢幕上跳出卡片"), sw(cardOn, (v) => { state.st.cardWhenHidden = v; host.settingText("cardWhenHidden", v ? "on" : "off"); saved(); setTimeout(redraw, 120); }, L("Show a card when the buddy is hidden", "夥伴收起來時跳出卡片")),
      L("Breaks, events and reminders pop up as a small card at the top right of the screen you're on, until you answer. What pops up: Settings › Reminders & events.", "休息、活動和提醒會在你正在用的螢幕右上角跳出小卡片，回應了才會消失。哪些會跳出來：設定 › 提醒與活動。"), "bp-card-field"),
    cardOn ? null : el("p", { className: "card-warn", textContent: L("This is off: while the desktop buddy is hidden, nothing will remind you of breaks, events or reminders.", "已關閉：桌面夥伴收起來的時候，休息、活動和提醒都不會有任何提示。") })));

  // Asked for a part of the page (Settings' search, Getting set up, a link): there, with a flash.
  const target = ask.card ? main.querySelector(ask.card) : ask.field ? [...main.querySelectorAll("[data-label]")].find((x) => x.dataset.label === ask.field) : null;
  if (target) setTimeout(() => {
    const d = target.closest("details"); if (d) d.open = true;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.remove("flash"); void target.offsetWidth; target.classList.add("flash");
  }, 120);
}

/** Its settings' words, for Settings' search: [{ label, card }] (the page drawn off-screen once). */
export function buddySearchIndex() {
  const tmp = el("div");
  try { renderBuddy(tmp, { redraw: () => {}, go: () => {} }); } catch { /* (a part that needs the window) */ }
  const out = [];
  for (const c of tmp.querySelectorAll(".bp-grp")) out.push({ label: c.querySelector("h3")?.textContent || "", card: "#" + c.id, field: null });
  for (const f of tmp.querySelectorAll("[data-label]")) out.push({ label: f.dataset.label, card: null, field: f.dataset.label });
  return out.filter((x) => x.label);
}
/** Whose photos the "stickers in use" thumbnails are (buddy-picker.js). */
export { creditFor };
