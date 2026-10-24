/* ML WorkHelp redesign prototype: 4 styles × 6 screens, EN / 中文, light / dark, colour themes. */
const S = {
  style: "a", page: "today", theme: "matcha", lang: "en", mode: "light", compare: false,
  mode2: "pomo", running: true, left: 18 * 60 + 42, total: 25 * 60, worked: 72 * 60 + 5,
  flipped: false, word: 0, who: "pair", hfont: "line", phase: "focus", tour: -1, wstep: 0, wphotos: null, remType: "rem", when: "30", repeat: "once", filter: "all",
  range: "week", dtab: "sum", share: false, tray: "sort", sorted: {}, setGroup: "look", qcard: true, bubble: 0,
  added: [],
};
try { Object.assign(S, JSON.parse(localStorage.getItem("mlwh-proto") || "{}"), { running: true, share: false, added: [], sorted: {} }); } catch { /* fine */ }
if (!["a","b","c","d","e","f","g","h"].includes(S.style)) S.style = "d";
S.hfont = "line";
/* Embedded in the website (#embed): no controls, scaled to fit, driven by the page; #public: only stickers cleared for the public page */
const EMBED = location.hash.includes("embed"), PUBLIC = true; // (the public copy: only stickers cleared for the web)
{ const hp = location.hash.match(/page=([a-z]+)/); if (hp) S.page = hp[1]; }
if (EMBED) { Object.assign(S, { style: "f", page: S.page || "today", lang: "en", mode: "light", theme: "matcha", compare: false }); document.body.classList.add("embed"); }
/* Public page: the app's own stickers, except ones not from Blumoon, Lyrac, NGMin or otter (or wanwannjeab's Muv cartoons),
   which get a same-group stand-in by those photographers (s/pub/<same name>). */
const PUBSWAP = new Set(["app-credits-top-3a840744.png", "app-data-sum-bd3cff9f.png", "app-help-top-3386667a.png", "app-now-work-f915203f.png", "app-pomo-break-4b6b24bf.png", "app-rem-add-fa866d09.png", "app-rem-empty-f5e65e76.png", "app-rem-event-3c3d2d46.png", "app-rem-head-4c9f45a3.png", "app-rem-next-9c88e0ee.png", "app-reminders-empty-218677d2.png", "app-settings-about-d6a96149.png", "app-settings-look-abb6988e.png", "app-today-left-7a130976.png", "app-week-analysis-bb0b1b3e.png", "pick-05-milk.png", "w1-left-491a9220.png", "w1-right-39adbd5c.png", "together-17.png", "w2-full-f98592e3.png", "w2-starter-9c88e0ee.png", "w5-72989f1d.png", "pick-18-love.png", "w8-ea416006.png"]);
const pub = (f) => PUBLIC && PUBSWAP.has(f) ? "pub/" + f : f;
const fitEmbed = () => document.documentElement.style.setProperty("--k", String(innerWidth / 1100));
if (EMBED) { fitEmbed(); addEventListener("resize", fitEmbed); addEventListener("message", (e) => { if (e.data && e.data.mlwh) { Object.assign(S, e.data.mlwh); draw(); } }); }
const save = () => {
  if (EMBED) { try { parent.postMessage({ mlwhPage: S.page, mlwhStyle: S.style }, "*"); } catch { /* fine */ } return; }
  try { localStorage.setItem("mlwh-proto", JSON.stringify({ style: S.style, page: S.page, theme: S.theme, lang: S.lang, mode: S.mode, compare: S.compare, hfont: S.hfont })); } catch { /* fine */ }
};

const t = (en, zh) => (S.lang === "zh" ? zh : en);
const ic = (n, cls = "") => `<i data-lucide="${n}" class="${cls}" aria-hidden="true"></i>`;
const stk = (file, cls = "", alt = "") => `<span class="stk ${cls}"><img src="s/${pub(file)}" alt="${alt}" loading="lazy"></span>`;
const seg = (key, items, label) => `<div class="seg" role="group" aria-label="${label || key}">${items.map(([v, txt, icn]) =>
  `<button type="button" data-set="${key}" data-val="${v}" aria-pressed="${S[key] === v}">${icn ? ic(icn) : ""}${txt}</button>`).join("")}</div>`;
const chips = (key, items) => `<div class="chips">${items.map(([v, txt]) => `<button type="button" class="chip" data-set="${key}" data-val="${v}" aria-pressed="${S[key] === v}">${txt}</button>`).join("")}</div>`;
const ph = (title, sub, file, actions = "", crumb = "") => `<div class="ph st-left">${file ? stk(file, "ph-stk") : ""}<div class="ph-text">${crumb}<h1>${title}</h1>${sub ? `<p>${sub}</p>` : ""}</div>${actions ? `<div class="ph-actions">${actions}</div>` : ""}</div>`;
const START = [["Work hard today for the next fancon / fan meeting!", "今天努力工作，為了下一場見面會！"], ["Let's get it done, then watch MilkLove ♡", "做完就能看 MilkLove 了 ♡"], ["One thing at a time. สู้ๆ นะ!", "一次一件事。สู้ๆ นะ！"]];
const START_AT = Math.floor(Math.random() * START.length);
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const hms = (s) => `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const STYLES = [
  ["a", "Sticker Book", "貼紙手帳", "Cream paper, washi tape, die-cut stickers", "米色紙張、紙膠帶、白邊貼紙"],
  ["b", "Milk Tea Clay", "奶茶黏土", "Soft, squishy, toy-like", "軟軟的、圓圓的、像玩具"],
  ["c", "Clean Pastel", "清爽粉彩", "Calm and tidy, stickers peek in", "安靜整齊，貼紙從邊邊探出頭"],
  ["d", "Fan Zine Pop", "應援小誌", "Outlined like fan merch (toned down)", "像應援周邊的線條（調柔和了）"],
  ["e", "Concert Night", "演唱會之夜", "Frosted glass and light-stick glow; best in dark", "霧面玻璃加手燈光暈；深色最好看"],
  ["f", "Purikura", "拍貼機", "Photo-booth frames, sparkles, candy colours", "拍貼框、亮晶晶、糖果色"],
  ["g", "Retro Desktop", "復古桌面", "Every card is a little old-computer window", "每張卡都是一個復古電腦小視窗"],
  ["h", "Fan Magazine", "粉絲雜誌", "Big serif titles, cover-style stickers", "大大的襯線標題、封面感貼圖"],
];
const ZH_FONT = {
  a: ["jf open 粉圓, with 辰宇落雁體 handwriting on the sticky note", "jf open 粉圓；便條紙用辰宇落雁體手寫字"],
  b: ["源泉圓體 (Regular + Bold), chunky and round like the clay", "源泉圓體（一般＋粗體），跟黏土一樣圓滾滾"],
  c: ["思源黑體 / Noto Sans TC, plain and clear", "思源黑體 / Noto Sans TC，乾淨清楚"],
  d: ["思源黑體 / Noto Sans TC in Black for loud headings", "思源黑體 / Noto Sans TC，標題用最粗的 Black"],
  e: ["寒蟬全圓體, soft and round like a light-stick glow", "寒蟬全圓體，柔柔圓圓像手燈的光"],
  f: ["jf open 粉圓, round and bubbly like photo-booth doodles", "jf open 粉圓，圓滾滾像拍貼機的塗鴉"],
  g: ["俐方體11號 pixel font for headings and numbers", "標題和數字用俐方體11號像素字"],
  h: ["LINE Seed TW (with its matching Thai)", "LINE Seed TW（泰文也用同一套）"],
};
const THEMES = [["matcha", "Matcha & Sakura", "抹茶櫻花", "#3f7d5c", "#e48aa6"], ["mint", "Mint & Strawberry", "薄荷草莓", "#1f8065", "#ff8fb4"],
  ["rose", "Rose & Mint", "玫瑰薄荷", "#b9507a", "#7cc59a"], ["lavender", "Lavender & Peach", "薰衣草蜜桃", "#6b57a8", "#f2a27e"], ["sky", "Sky & Lemon", "天空檸檬", "#3d73b0", "#ecc451"]];
const PAGES = [["today", "Today", "今天"], ["reminders", "Reminders", "提醒"], ["data", "Data", "數據"], ["stickers", "Stickers", "貼圖"], ["settings", "Settings", "設定"], ["buddy", "Desktop buddy", "桌面夥伴"], ["help", "Help", "幫助"], ["credits", "Photo credits", "照片來源"], ["welcome", "Welcome pages", "歡迎頁"]];
const WORDS = [
  { th: "ใกล้", rom: "klai", en: "near, close", zh: "靠近", song: "Kissin' Out of Dream" },
  { th: "กอด", rom: "kot", en: "to hug", zh: "擁抱", song: "Kissin' Out of Dream" },
  { th: "หัวใจ", rom: "hua jai", en: "heart", zh: "心", song: "One-Heart Deal" },
  { th: "เขิน", rom: "khoen", en: "shy, blushing", zh: "害羞、臉紅", song: "YOU'RE BLUSHING?" },
];

/* ---------------- side menu ---------------- */
function nav() {
  const w = WORDS[S.word];
  const item = (id, icn, en, zh, extra = "") => `<button type="button" class="nav-i" data-go="${id}" ${S.page === id ? 'aria-current="page"' : ""}>${ic(icn)}<span>${t(en, zh)}</span>${extra}</button>`;
  return `<nav class="nav" aria-label="ML WorkHelp">
    <div class="brand">${stk("muv-heart.png")}<div><b>ML WorkHelp</b><small>${t("your work buddy", "你的工作夥伴")}</small></div></div>
    ${item("today", "calendar-heart", "Today", "今天")}
    ${item("reminders", "bell", "Reminders", "提醒與活動", `<span class="count">3</span>`)}
    ${item("data", "chart-column", "Data", "數據")}
    <div class="nav-h">${t("Fan corner", "粉絲角落")}</div>
    ${item("stickers", "sticker", "Stickers", "貼圖", `<span class="count">12</span>`)}
    ${item("buddy", "smile", "Desktop buddy", "桌面夥伴")}
    ${item("credits", "heart", "Photo credits", "照片來源")}
    <div class="nav-foot">
      <button type="button" class="wordmini" data-act="nextword" title="${t("New word", "換一個字")}">
        <small>${t("Word of the day", "今日泰文")}</small><b class="th">${w.th}</b><span>${w.rom} · ${t(w.en, w.zh)}</span></button>
      ${item("settings", "settings-2", "Settings", "設定")}
      <button type="button" class="muv" data-go="help">${stk("muv-cartoon.png")}<span class="say">${t("Need help?", "需要幫忙嗎？")}</span></button>
    </div>
  </nav>`;
}

/* ---------------- Today ---------------- */
function today() {
  const pomo = S.mode2 === "pomo";
  const frac = pomo ? S.left / S.total : (S.worked % 3600) / 3600;
  const C = 2 * Math.PI * 88;
  const w = WORDS[S.word];
  const seg2 = (cls, from, to, title) => `<span class="${cls}" style="width:${((to - from) / 540) * 100}%;background:var(--${cls})" title="${title}"></span>`;
  const gap = (from, to) => `<span style="width:${((to - from) / 540) * 100}%"></span>`;
  const rows = [
    ["09:30 – 10:20", "c3", t("Email & planning", "信件與規劃"), t("Admin", "雜事"), "50m"],
    ["10:25 – 11:15", "c1", t("Chapter 3 draft", "第三章初稿"), t("Focus work", "專注工作"), "50m"],
    ["11:15 – 11:25", "c-break", t("Break · stretch", "休息 · 伸展"), t("Break", "休息"), "10m"],
  ];
  const brk = S.phase === "break", done = S.phase === "done";
  const heroStk = brk ? "app-now-pomo-52c6b97f.png" : done ? "app-now-done-443b4259.png" : pomo ? "app-now-pomo-52c6b97f.png" : "app-now-work-f915203f.png";
  return `<div class="page">
    <div class="ph"><div class="ph-text"><h1>${t(...START[START_AT])}</h1>
      <p>${S.empty ? t("Saturday 24 October · your goal today is 6h", "10 月 24 日（週六）· 今天的目標 6 小時") : t("Saturday 24 October · 2h 35m done of your 6h", "10 月 24 日（週六）· 已工作 2 小時 35 分 / 目標 6 小時")}</p></div>
      <div class="ph-actions"><button type="button" class="btn btn-s btn-sm" data-act="tour">${ic("compass")}${t("Show me around", "帶我看看")}</button></div>
</div>

    <section class="card now tape" aria-label="${t("Timer", "計時")}">
        <div class="now-top">${seg("mode2", [["work", t("Work clock", "工作時鐘"), "clock-3"], ["pomo", t("Pomodoro", "番茄鐘"), "timer"]], "mode")}
          <span class="tag ${brk || done ? "a" : "p"}">${ic(brk ? "coffee" : done ? "moon" : S.running ? "circle-dot" : "circle-pause")}${brk ? t("On a break", "休息中") : done ? t("Done for today", "收工了") : pomo ? t(S.running ? "Round 2 of 4 · focusing" : "Paused", S.running ? "第 2 / 4 輪 · 專注中" : "暫停中") : t(S.running ? "Clocked in" : "Paused", S.running ? "上班中" : "暫停中")}</span>
          <span class="help-tip"><button type="button" class="btn btn-g btn-sm btn-icon" aria-label="${t("What is this?", "這是什麼？")}">${ic("circle-help")}</button>
            <span class="tip" role="tooltip">${pomo ? t("A round of focus, then a short break. Every round counts toward today's work; time between rounds doesn't.", "專注一輪、休息一下。每一輪都算進今天的工作；兩輪之間不算。") : t("Counts while you're at your computer and logs each thing you do.", "在電腦前就計時，記下每件事。")}</span></span>
          <span style="flex:1"></span><button type="button" class="btn btn-s btn-sm" data-act="focus">${ic("maximize-2")}${t("Focus screen", "專注全螢幕")}</button>
        </div>
        ${done ? `<div class="now-done"><div><span class="kick">${t("Done for today", "收工")} ✦</span><h2>${t("Nice work today!", "今天辛苦了！")}</h2>
            <p class="muted">${t("2h 35m of work · 3 rounds · 25 min of breaks. Milk and Love are celebrating with you.", "工作 2 小時 35 分 · 3 輪 · 休息 25 分。Milk 和 Love 陪你一起慶祝。")}</p>
            <div class="actions"><button type="button" class="btn btn-p btn-lg" data-act="back">${ic("rotate-ccw")}${t("Start again", "再開始")}</button><button type="button" class="btn btn-s btn-lg" data-go="data">${ic("chart-column")}${t("See my week", "看看這週")}</button></div></div></div>` : `
        <div class="now-body">
          <div class="ring ${brk ? "is-break" : ""}"><svg viewBox="0 0 200 200"><circle class="trk" cx="100" cy="100" r="88" fill="none" stroke-width="14"/>
            <circle class="bar" cx="100" cy="100" r="88" fill="none" stroke-width="14" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - frac)}"/></svg>
            <div class="ring-in"><b id="${brk ? "brk" : "clock"}">${brk ? "4:12" : pomo ? mmss(S.left) : hms(S.worked)}</b><small>${brk ? t("break left", "休息剩下") : pomo ? t("focus left", "專注剩下") : t("on this task", "這件事做了")}</small></div></div>
          <div class="right">${brk ? `
            <div class="task"><span class="label">${t("On a break", "休息中")}</span><b style="font:700 22px/1.3 var(--font-h)">${t("Stretch, drink some water ♡", "伸展一下、喝點水 ♡")}</b></div>
            <div class="actions"><button type="button" class="btn btn-p btn-lg" data-act="back">${ic("undo-2")}${t("I'm back", "我回來了")}</button><button type="button" class="btn btn-s btn-lg">${ic("alarm-clock")}${t("5 more min", "再 5 分鐘")}</button></div>` : `
            <label class="task"><span class="label">${t("Working on", "正在做")}</span><input value="${t("Chapter 3 draft", "第三章初稿")}" aria-label="${t("Working on", "正在做")}">
              <span class="task-meta"><span class="tag">${ic("laptop")}${t("Focus work", "專注工作")}</span><button type="button" class="btn btn-g btn-sm">${t("Change", "更改")}</button></span></label>
            ${pomo ? `<div class="rounds" aria-label="${t("Round 2 of 4", "第 2 / 4 輪")}"><i class="done"></i><i class="now"></i><i></i><i></i><span class="muted" style="margin-left:6px;font-size:13px">${t("Long break after round 4", "第 4 輪後長休息")}</span></div>` : ""}
            <div class="actions">
              <button type="button" class="btn btn-p btn-lg" data-act="run">${ic(S.running ? "pause" : "play")}${S.running ? t("Pause", "暫停") : t("Start", "開始")}</button>
              <button type="button" class="btn btn-s btn-lg" data-act="break">${ic("coffee")}${t("Take a break", "休息一下")}</button>
            </div>
            <div class="links-row">${pomo ? `<button type="button" class="btn btn-g btn-sm">${ic("settings-2")}${t("Classic 25 · 5 · long break 15", "經典 25 · 5 · 長休息 15")}</button>` : ""}<button type="button" class="btn btn-g btn-sm" data-act="done">${ic("moon")}${t("Done for today", "收工")}</button></div>`}
          </div>
        </div>`}
        ${stk(heroStk, "hero" + (done ? " big" : ""))}
      </section>

      ${brk ? breakVideo() : ""}
      <div class="grid trio"><div class="stack">
        <section class="card focusbox">${stk("app-today-left-7a130976.png", "fb-stk")}<span class="label">${t("Focus of the day", "本日主題")}</span>
          <input class="fb-in" value="${t("Finish chapter 3, then treat myself ♡", "寫完第三章，然後犒賞自己 ♡")}" placeholder="${t("What's today about?", "今天的重點是？")}" aria-label="${t("Focus of the day", "本日主題")}"></section>
        ${S.empty ? `<section class="card"><div class="next"><span class="ic">${ic("bell-off")}</span><div style="flex:1"><span class="label">${t("Next up", "接下來")}</span><div class="muted">${t("Nothing coming up today.", "今天沒有提醒。")}</div></div><button type="button" class="btn btn-s btn-sm" data-go="reminders">${ic("plus")}${t("Add", "新增")}</button></div></section>` : `<section class="card"><div class="next"><span class="ic a">${ic("bell")}</span><div style="flex:1"><span class="label next-lbl">${t("Next up · in 40 min", "接下來 · 40 分鐘後")}${stk("app-rem-next-9c88e0ee.png", "dog")}</span>
          <div><b class="when">15:00</b> ${t("Call the bank", "打給銀行")}</div></div><button type="button" class="btn btn-g btn-sm btn-icon" data-go="reminders" aria-label="${t("All reminders", "所有提醒")}">${ic("chevron-right")}</button></div></section>`}</div>
        <section class="card word" data-act="flip" tabindex="0" role="button" aria-label="${t("Thai word card, click to flip", "泰文卡片，點一下翻面")}">
          <div class="card-h"><h2>${t("Thai from the songs", "歌裡的泰文")}</h2><span class="spacer"></span><button type="button" class="btn btn-g btn-sm btn-icon" aria-label="${t("Hear it", "聽發音")}" data-act="noop">${ic("volume-2")}</button></div>
          <span class="th">${w.th}</span><span class="rom">${w.rom}</span>
          <div class="mean ${S.flipped ? "" : "hidden"}">${S.flipped ? t(w.en, w.zh) : t("Tap to see the meaning", "點一下看意思")}</div>
          <div class="word-foot"><span class="tag a">${ic("music-2")}${w.song}</span></div>
          ${stk("w3-keep-c8b7ca47.png")}
        </section>

    </div>

    <section class="card dayline">
      <div class="card-h"><h2>${t("Your day", "今天的紀錄")}</h2><span class="spacer"></span>
        <div class="totals"><span class="tag p">${ic("briefcase")}${S.empty ? t("Work 0m", "工作 0 分") : t("Work 2h 35m", "工作 2 時 35 分")}</span><span class="tag a">${ic("coffee")}${S.empty ? t("Break 0m", "休息 0 分") : t("Break 25m", "休息 25 分")}</span><span class="tag">${ic("target")}${t("Goal 6h", "目標 6 小時")}</span></div></div>
      <div class="tl" aria-hidden="true">${S.empty ? "" : `${gap(0, 30)}${seg2("c3", 30, 80, "")}${seg2("c-break", 80, 85, "")}${seg2("c1", 85, 135, "")}${seg2("c-break", 135, 145, "")}${seg2("c1", 145, 170, "")}`}</div>
      <div class="tl-scale"><span>9:00</span><span>11:00</span><span>13:00</span><span>15:00</span><span>17:00</span><span>18:00</span></div>
      ${S.empty ? `<div class="empty-state">${stk("app-reminders-empty-218677d2.png")}<div><b>${t("Nothing logged yet today.", "今天還沒有紀錄。")}</b><br><span class="muted">${t("Press Start and your day fills in here.", "按「開始」，今天的紀錄就會出現在這裡。")}</span></div></div>` : `<div class="log">${rows.map(([tm, c, n, cat, d]) => `<div class="log-row"><span class="t">${tm}</span><span class="dot" style="background:var(--${c})"></span><span><b>${n}</b> <span class="muted" style="font-size:12.5px">· ${cat}</span></span><span class="dur">${d}</span><button type="button" class="btn btn-g btn-sm btn-icon row-act" aria-label="${t("Edit", "編輯")}">${ic("pencil")}</button></div>`).join("")}
        <div class="log-row live"><span class="t">11:25 – ${t("now", "現在")}</span><span class="dot" style="background:var(--c1)"></span><span><b>${t("Chapter 3 draft", "第三章初稿")}</b> <span class="muted" style="font-size:12.5px">· ${t("Focus work", "專注工作")}</span></span><span class="dur">25m</span><span></span></div>
      </div>`}
    </section>
  </div>`;
}

/* A MilkLove video for the break, like the app's card now: thumbnail, Watch, Another one, Not this one */
const VIDS = [
  { id: "m2NgaO-ztAA", title: "[Behind The Scenes] ‘MILK LOVE WHIMSICAL HOUSE FANCON’ 🚪✨ #MilkLoveFancon", s: 359 },
  { id: "lK53z1eem6o", title: "เล่นมุกแบบนี้ เพื่อนว่าไง!! | Blacklist นักเรียนลับ บัญชีดำ [Behide The Scene]", s: 291 },
  { id: "c-Ll4qGru2A", title: "ส่อง Safe zone มุมโปรดที่ใช่กับเพลงของ มิ้ลค์-เลิฟ 💚🩷 #MilkLoveFancon", s: 127 },
];
function breakVideo() {
  const v = VIDS[(S.vid || 0) % VIDS.length];
  return `<section class="card break-video" aria-label="${t("A video for your break", "休息時的影片")}">
    <div class="bv-main">
      <button type="button" class="thumb" aria-label="${t("Watch on YouTube", "在 YouTube 看")}"><img src="s/yt-${v.id}.jpg" alt=""><span class="len">${mmss(v.s)}</span><span class="play">${ic("play")}</span></button>
      <div class="bv-text"><div class="vt">${v.title}</div><span class="muted small">GMMTV OFFICIAL</span>
        <div class="actions"><button type="button" class="btn btn-p btn-sm">${ic("circle-play")}${t("Watch", "看影片")}</button><button type="button" class="btn btn-s btn-sm" data-act="vid">${ic("shuffle")}${t("Another one", "換一個")}</button><button type="button" class="btn btn-g btn-sm" data-act="vid">${t("Not this one", "不要這支")}</button></div>
        <span class="muted small">${t("Some videos may not be available in every country or region; if one won't play, try another.", "有些影片在部分國家或地區可能看不了；如果播不了，就按「換一個」。")}</span></div>
    </div>
    <div class="bv-side"><div class="say-bubble">${t("Take a break: MilkLove videos", "休息一下，看支 MilkLove 的影片吧")}</div>${stk("app-pomo-break-4b6b24bf.png")}</div>
  </section>`;
}

/* ---------------- Reminders ---------------- */
function parse(text) {
  return { what: String(text || "").trim(), when: null }; // (no guessing the time from the words: tap when)
  const s = text.toLowerCase();
  let when = null, what = text.trim();
  const m = s.match(/in (\d+) ?(min|minutes|m|h|hour|hours)/) || s.match(/(\d+) ?(分鐘|小時)後/);
  const hm = s.match(/(\d{1,2}):(\d{2})/);
  const tmr = /tomorrow|明天/.test(s);
  if (m) { const n = +m[1], h = /h|小時/.test(m[2]); const d = new Date(Date.now() + n * (h ? 3600e3 : 60e3)); when = `${t("Today", "今天")} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`; what = what.replace(m[0], ""); }
  if (hm) { when = `${tmr ? t("Tomorrow", "明天") : t("Today", "今天")} ${hm[1]}:${hm[2]}`; what = what.replace(hm[0], ""); }
  what = what.replace(/tomorrow|明天|at\b/gi, "").replace(/\s+/g, " ").trim();
  return { when, what };
}
function remRow(r) {
  return `<div class="rem ${r.soon ? "soon" : ""}"><span class="tm">${r.tm}</span><span class="ic ${r.ev ? "a" : ""}">${ic(r.ev ? "calendar-days" : "bell")}</span>
    <div><b>${r.name}</b><div class="sub">${r.sub}</div></div>
    <div class="row-act">${r.ev ? `<button type="button" class="btn btn-g btn-sm">${ic("external-link")}${t("Open", "打開")}</button>` : `<button type="button" class="btn btn-s btn-sm">${ic("alarm-clock")}${t("+10 min", "晚 10 分")}</button><button type="button" class="btn btn-s btn-sm">${ic("check")}${t("Done", "完成")}</button>`}
      <button type="button" class="btn btn-g btn-sm btn-icon" aria-label="${t("Delete", "刪除")}">${ic("trash-2")}</button></div></div>`;
}
function reminders() {
  const p = parse(S.draft || "");
  const whenTxt = { 15: t("in 15 min", "15 分鐘後"), 30: t("in 30 min", "30 分鐘後"), 60: t("in 1 hour", "1 小時後"), eve: t("Tonight 20:00", "今晚 20:00"), am: t("Tomorrow 9:00", "明天早上 9:00") };
  const todayRows = [
    { tm: "11:50", name: t("Stretch", "伸展"), sub: `<span class="tag a">${t("in 25 min", "25 分鐘後")}</span>${t("Once", "一次")}`, soon: true },
    ...S.added,
    { tm: "15:00", name: t("Call the bank", "打給銀行"), sub: t("Once · this app", "一次 · 這個 App") },
    { tm: "18:30", name: t("MilkLove IG live", "MilkLove IG 直播"), sub: `${ic("calendar")}${t("From your Calendar", "來自行事曆")}`, ev: true },
  ];
  const tmrRows = [
    { tm: "09:00", name: t("Drink water", "喝水"), sub: t("Every day", "每天") },
    { tm: "20:00", name: t("New episode night", "追新集數"), sub: `${ic("calendar")}${t("From your Calendar · 2 h", "來自行事曆 · 2 小時")}`, ev: true },
  ];
  const show = (r) => S.filter === "all" || (S.filter === "ev") === !!r.ev;
  return `<div class="page">
    <div class="ph st-left">${stk("app-rem-head-4c9f45a3.png", "ph-stk")}<div class="ph-text"><h1>${t("Reminders & events", "提醒與活動")}</h1><p>${t("We'll call you when it's time: stretch, call someone, drink water. With the buddy hidden, a card pops up on the screen you're on.", "時間到就叫你一聲：伸展、打電話、喝水。夥伴收起來時，會在你正在用的螢幕跳出小卡片。")}</p></div></div>
    <section class="card composer tape2">${stk(S.remType === "ev" ? "app-rem-event-3c3d2d46.png" : "app-rem-add-fa866d09.png", "cmp-stk")}
      <div class="card-h"><h2>${t("Add one", "新增")}</h2><span class="spacer"></span>${seg("remType", [["rem", t("Reminder", "提醒"), "bell"], ["ev", t("Event", "活動"), "calendar-days"]])}</div>
      <div class="cmp-in">${ic("sparkles")}<input id="draft" value="${(S.draft || "").replace(/"/g, "&quot;")}" placeholder="${t("What is it? e.g. Stretch, call the bank", "要做什麼？例如：伸展、打給銀行")}" aria-label="${t("What and when", "什麼事、什麼時候")}">
        <button type="button" class="btn btn-p" data-act="addrem">${ic("plus")}${t("Add", "新增")}</button></div>
      <div class="parsed" id="parsed">${p.what || p.when ? `${ic("wand-sparkles")}${t("Will remind you:", "會提醒你：")} <span class="tag p">${ic("bell")}${p.what || t("(what?)", "（什麼事？）")}</span><span class="tag">${ic("clock-3")}${p.when || whenTxt[S.when]}</span>` : `<span>${t("Then tap when, below.", "再在下面點時間。")}</span>`}</div>
      <div class="row2"><span class="label">${t("When", "什麼時候")}</span>${chips("when", [["15", whenTxt[15]], ["30", whenTxt[30]], ["60", whenTxt[60]], ["eve", whenTxt.eve], ["am", whenTxt.am], ["pick", t("Pick a time…", "選時間…")]])}
        <span class="label">${t("Repeat", "重複")}</span>${chips("repeat", [["once", t("Once", "一次")], ["day", t("Every day", "每天")], ["wd", t("Weekdays", "平日")], ["wk", t("Every week", "每週")], ["more", t("More…", "更多…")]])}</div>
      <div class="comp-foot"><span class="muted" style="font-size:12.5px">${ic("smartphone", "")} ${t("Goes to this app only.", "只放在這個 App。")} <button type="button" class="btn btn-g btn-sm" data-go="settings">${t("Also send to Apple Reminders…", "也放進 Apple 提醒事項…")}</button></span></div>
    </section>
    <section class="card">
      <div class="card-h"><h2>${t("Coming up", "接下來")}</h2>${S.empty ? "" : stk("app-rem-next-9c88e0ee.png", "dog")}<span class="spacer"></span>${seg("filter", [["all", t("All", "全部")], ["rem", t("Reminders", "提醒")], ["ev", t("Events", "活動")]])}</div>
      <div class="dayh"><h3>${t("Today", "今天")}</h3><span class="muted">${t("Sat 24 Oct", "10 月 24 日（週六）")}</span></div>
      ${S.empty || !todayRows.filter(show).length ? `<div class="rem-empty">${stk("app-rem-empty-f5e65e76.png")}<span>${t("That's all for today. MilkLove are relaxing too~", "今天就到這裡囉，MilkLove 也在放鬆～")}</span></div>` : todayRows.filter(show).map(remRow).join("")}
      <div class="dayh"><h3>${t("Tomorrow", "明天")}</h3><span class="muted">${t("Sun 25 Oct", "10 月 25 日（週日）")}</span></div>
      ${tmrRows.filter(show).map(remRow).join("")}
    </section>
  </div>`;
}

/* ---------------- Data ---------------- */
function data() {
  const days = [[t("Mon", "週一"), 3.2, 1.0, .5], [t("Tue", "週二"), 2.5, 1.5, .8], [t("Wed", "週三"), 4.2, 1.1, .8], [t("Thu", "週四"), 3.0, 1.4, .3], [t("Fri", "週五"), 0, 0, 0], [t("Sat", "週六"), 1.6, .8, 0], [t("Sun", "週日"), 0, 0, 0]];
  const max = 7;
  return `<div class="page">
    <div class="ph st-left">${stk("app-data-sum-bd3cff9f.png", "ph-stk")}<div class="ph-text"><h1>${t("Data", "數據")}</h1><p>${t("How your week went, in hours and in plain words.", "這週過得怎麼樣：看數字，也看白話。")}</p></div><div class="ph-actions"><span style="position:relative"><button type="button" class="btn btn-s" data-act="share">${ic("share")}${t("Share", "分享")}</button>
        <span class="menu-pop ${S.share ? "open" : ""}" role="menu"><button type="button">${ic("image-down")}${t("Make a picture", "做成圖片")}</button><button type="button">${ic("file-spreadsheet")}${t("Export CSV", "匯出 CSV")}</button><button type="button">${ic("compass")}${t("Show me around", "帶我看數據")}</button></span></span></div>${stk("app-data-sum-bd3cff9f.png", "big")}</div>
    <section class="card dbar" style="padding:10px 12px">
      ${seg("range", [["week", t("Week", "週")], ["month", t("Month", "月")], ["year", t("Year", "年")]])}
      <button type="button" class="btn btn-g btn-icon btn-sm" aria-label="${t("Previous", "上一個")}">${ic("chevron-left")}</button>
      <span class="period">${t("This week · 19–25 Oct", "本週 · 10/19 – 10/25")}</span>
      <button type="button" class="btn btn-g btn-icon btn-sm" aria-label="${t("Next", "下一個")}">${ic("chevron-right")}</button>
      <span class="spacer"></span>
      ${seg("dtab", [["sum", t("Summary", "總覽")], ["ana", t("Analysis", "分析")], ["cal", t("Calendar", "日曆")]])}
    </section>
    ${S.dtab !== "sum" ? `<section class="card muted" style="text-align:center;padding:30px">${t("Analysis and Calendar would get the same look. This prototype draws Summary only.", "分析和日曆會用同一套樣式；這個原型只畫了總覽。")}</section>` : ""}
    <div class="kpis">
      <section class="card kpi"><span class="label">${t("Work", "工作")}</span><b>18h 40m</b><span class="delta">${ic("trending-up")}${t("+2h 05m vs last week", "比上週多 2 時 05 分")}</span></section>
      <section class="card kpi"><span class="label">${t("Per workday", "平均每個工作天")}</span><b>4h 40m</b><span class="muted" style="font-size:12.5px">${t("4 days worked", "4 天有工作")}</span></section>
      <section class="card kpi"><span class="label">${t("Days at goal", "達標天數")}</span><b>1 / 6</b><div class="meter"><span style="width:17%"></span></div></section>
      <section class="card kpi"><span class="label">${t("Rest", "休息")}</span><b>3h 10m</b><span class="muted" style="font-size:12.5px">${t("about 10 min an hour", "大約每小時 10 分鐘")}</span></section>
    </div>
    <section class="card">
      <div class="card-h"><h2>${t("Each day, by category", "每一天，依分類")}</h2><span class="spacer"></span>
        <div class="legend"><span><i class="dot" style="background:var(--c1)"></i>${t("Focus work", "專注工作")}</span><span><i class="dot" style="background:var(--c3)"></i>${t("Admin", "雜事")}</span><span><i class="dot" style="background:var(--c2)"></i>${t("Meetings", "會議")}</span></div></div>
      <div class="chart"><div class="yax">${[0, 1, 2, 3, 4, 5, 6, 7].map((h) => `<span>${h}h</span>`).join("")}</div>
        <div class="plot"><div class="goal" style="bottom:calc(22px + (100% - 22px) * ${6 / max})"><span>${t("Goal 6h", "目標 6 小時")}</span></div>
          ${days.map(([d, a, b, c], i) => `<div class="col ${i === 5 ? "today" : ""}" title="${d}: ${(a + b + c).toFixed(1)}h">
            ${a ? `<span class="seg-b" style="height:${(a / max) * 100}%;background:var(--c1)"></span>` : ""}${b ? `<span class="seg-b" style="height:${(b / max) * 100}%;background:var(--c3)"></span>` : ""}${c ? `<span class="seg-b" style="height:${(c / max) * 100}%;background:var(--c2)"></span>` : ""}
            <span class="lbl">${i === 5 ? t("Today", "今天") : d}</span></div>`).join("")}
        </div></div>
    </section>
    <section class="card hl"><div><div class="card-h"><h2>${t("Highlights", "重點整理")}</h2></div><ul>
      <li>${ic("trophy")}<span>${t("Best day: <b>Wednesday</b>, 6h 10m. You hit your goal!", "最棒的一天：<b>週三</b>，6 小時 10 分，達標了！")}</span></li>
      <li>${ic("laptop")}<span>${t("Most time on <b>Focus work</b>: 14h 30m", "最多時間花在<b>專注工作</b>：14 小時 30 分")}</span></li>
      <li>${ic("coffee")}<span>${t("Longest stretch without a break: 1h 50m on Tuesday. Milk and Love say: drink some water!", "最久沒休息：週二 1 小時 50 分。Milk 和 Love 說：記得喝水！")}</span></li></ul></div>
      ${stk("app-week-analysis-bb0b1b3e.png", "", "")}</section>
  </div>`;
}

/* ---------------- Stickers ---------------- */
const TRAY = ["pick-05-milk.png", "pick-18-love.png", "preview-milk-25d9980b.png", "preview-love-3e1da30c.png", "together-17.png", "w7-205202d7.png", "app-rem-add-fa866d09.png", "app-help-top-3386667a.png", "w10-32626d3f.png", "app-rem-empty-f5e65e76.png", "w2-full-f98592e3.png", "app-rem-event-3c3d2d46.png"];
function stickers() {
  const left = TRAY.filter((f) => !S.sorted[f]);
  const n = (k) => Object.values(S.sorted).filter((v) => v === k).length;
  const counts = { sort: left.length, milk: 48 + n("milk"), love: 52 + n("love"), together: 31 + n("together"), other: 6, no: 9 };
  const list = S.tray === "sort" ? left : TRAY.filter((f) => S.sorted[f] === S.tray);
  const lbl = { milk: "Milk", love: "Love", together: t("Together", "同框") };
  return `<div class="page">
    <div class="ph st-left">${stk("app-stickers-title-3526fdd0.png", "ph-stk big")}<div class="ph-text"><h1>${t("Stickers", "貼圖")}</h1><p>${t("Sort your cut-outs. Tap one to see the original photo and who took it.", "把去背的圖分類；點任何一張，就能看到原始照片和拍攝者。")}</p></div>
      <div class="ph-actions"><button type="button" class="btn btn-p">${ic("image-plus")}${t("Add photos", "加入照片")}</button></div></div>
    <section class="card consent"><span class="ic a">${ic("shield-check")}</span><div style="flex:1">${t("Only use photos you're allowed to use, and keep your stickers inside this app.", "請只用你有權使用的照片，做好的貼圖只在這個 App 裡自己用。")}</div><button type="button" class="btn btn-g btn-sm">${t("Read the full note", "看完整說明")}</button></section>
    <section class="card"><div class="next"><span class="ic">${ic("smile")}</span><div style="flex:1"><b>${t("Your desktop buddy uses 36 of 48 stickers", "桌面夥伴用了 36 / 48 張貼圖")}</b>
      <div class="kpi"><div class="meter" style="max-width:320px"><span style="width:75%"></span></div></div></div><button type="button" class="btn btn-s">${t("Choose…", "選擇…")}</button></div></section>
    <section class="card">
      <div class="tray-h">${seg("tray", [["sort", `${t("To sort", "待分類")} <span class="n">${counts.sort}</span>`], ["milk", `Milk <span class="n">${counts.milk}</span>`], ["love", `Love <span class="n">${counts.love}</span>`], ["together", `${t("Together", "同框")} <span class="n">${counts.together}</span>`], ["other", `${t("Other", "其他")} <span class="n">${counts.other}</span>`], ["no", `${t("Not used", "不要")} <span class="n">${counts.no}</span>`]])}</div>
      <div class="keys" style="margin:12px 0"><span><kbd>M</kbd> Milk</span><span><kbd>L</kbd> Love</span><span><kbd>T</kbd> ${t("Together", "同框")}</span><span><kbd>X</kbd> ${t("Not used", "不要")}</span><span><kbd>U</kbd> ${t("Undo", "復原")}</span></div>
      ${list.length ? `<div class="sgrid">${list.map((f) => `<div class="stile">${stk(f)}${S.tray === "sort" ? `<div class="who" style="display:flex;gap:4px">
          <button type="button" class="btn btn-s btn-sm" data-sort="${f}" data-to="milk">M</button><button type="button" class="btn btn-s btn-sm" data-sort="${f}" data-to="love">L</button><button type="button" class="btn btn-s btn-sm" data-sort="${f}" data-to="together">T</button></div>`
          : `<span class="who tag p">${lbl[S.sorted[f]]}</span><span class="on">${ic("check")}</span>`}</div>`).join("")}</div>`
        : `<div style="display:grid;justify-items:center;gap:8px;padding:28px">${stk("muv-baby.png", "", "")}<b>${S.tray === "sort" ? t("All sorted. Nice!", "全部分類完成！") : t("Sort a few from “To sort” to see them here.", "從「待分類」分幾張，就會出現在這裡。")}</b><span class="muted">${t("Your stickers join the desktop buddy.", "你的貼圖會加入桌面夥伴。")}</span></div>`}
    </section>
  </div>`;
}

/* ---------------- Settings ---------------- */
function settings() {
  const G = [["look", "palette", "Look & menu bar", "外觀與選單列", "Style, colours, language, light or dark, the menu bar", "風格、顏色、語言、淺色或深色、選單列", "app-look-card-17197ba2.png"],
    ["buddy", "smile", "Desktop buddy & Thai", "桌面夥伴與泰文", "Who's out, how lively, its stickers, Thai words", "誰在桌面、多活潑、貼圖、泰文單字", "preview-milk-25d9980b.png"],
    ["keep", "clock-3", "Keeping time & the day", "計時與每天的節奏", "Work clock or Pomodoro, the daily goal, the focus screen", "工作時鐘或番茄鐘、每日目標、專注全螢幕", "w3-keep-c8b7ca47.png"],
    ["rem", "bell", "Reminders & events", "提醒與活動", "The sound, what pops up, while you focus, Apple Reminders & Calendar", "鈴聲、跳出什麼、專注時、Apple 提醒事項和行事曆", "app-rem-add-fa866d09.png"],
    ["cats", "tags", "Categories", "分類", "Your kinds of work and break", "工作和休息的種類", "w10-32626d3f.png"],
    ["about", "info", "About & updates", "關於與更新", "Version, updates, tours, the photo library", "版本、更新、導覽、照片庫", "app-settings-about-d6a96149.png"]];
  const g = G.find((x) => x[0] === S.setGroup && S.setOpen);
  if (!g) return `<div class="page">
    ${ph(t("Settings", "設定"), t("Everything in one place: pick a card.", "所有設定都在這裡：點一張卡片。"), "app-settings-look-abb6988e.png",
      `<label class="search">${ic("search")}<input placeholder="${t("Find a setting: sound, calendar, week…", "找設定：音效、行事曆、週…")}" aria-label="${t("Find a setting", "找設定")}"></label><button type="button" class="btn btn-s" data-act="tour">${ic("compass")}${t("Show me Settings", "帶我看設定")}</button>`)}
    <div class="set-grid">${G.map(([k, icn, en, zh, den, dzh]) => `<button type="button" class="card set-card" data-act="setopen" data-val="${k}">${ic(icn)}<b>${t(en, zh)}</b><span>${t(den, dzh)}</span></button>`).join("")}</div>
    <section class="card setup"><div class="card-h"><h2>${t("Getting set up", "設定小幫手")}</h2><span class="tag p">5 / 6</span></div>
      <ul class="checks"><li class="ok">${ic("circle-check")}${t("How you keep time", "計時方式")}</li><li class="ok">${ic("circle-check")}${t("A daily goal", "每日目標")}</li><li class="ok">${ic("circle-check")}${t("The focus screen", "專注全螢幕")}</li><li>${ic("circle")}${t("Apple Reminders & Calendar (if you use them)", "Apple 提醒事項和行事曆（如果你有用）")}</li><li class="ok">${ic("circle-check")}${t("The buddy and its stickers", "夥伴和它的貼圖")}</li><li class="ok">${ic("circle-check")}${t("Your kinds of work and break", "你的工作和休息種類")}</li></ul></section>
  </div>`;
  const i = G.indexOf(g), prev = G[(i + G.length - 1) % G.length], next = G[(i + 1) % G.length];
  const row = (en, zh, ctl, sen = "", szh = "") => `<div class="srow"><div><b>${t(en, zh)}</b>${sen ? `<small>${t(sen, szh)}</small>` : ""}</div>${ctl}</div>`;
  const check = (on) => `<span class="switch ${on ? "on" : ""}" aria-hidden="true"><i></i></span>`;
  const body = {
    look: `<section class="card">${row("Style", "風格", "", "The shape and feel. Colours come from the theme below.", "形狀和感覺；顏色由下面的主題決定。")}
        <div class="stylecards">${STYLES.map(([k, en, zh]) => `<button type="button" class="stylecard" data-style-pick="${k}" aria-pressed="${S.style === k}"><span class="mini" data-mini="${k}"></span><b>${t(en, zh)}</b></button>`).join("")}</div></section>
      <section class="card">${row("Colours", "顏色", `<div class="themes">${THEMES.map(([k, en, zh, c1, c2]) => `<button type="button" class="themecard" data-theme-pick="${k}" aria-pressed="${S.theme === k}" title="${t(en, zh)}"><span class="pv"><span style="background:${c1}"></span><span style="background:${c2}"></span></span></button>`).join("")}</div>`)}
        ${row("Language / 語言 / ภาษา", "Language / 語言 / ภาษา", seg("lang", [["en", "English"], ["zh", "繁體中文"]]))}${row("Light or dark", "淺色或深色", seg("mode", [["light", t("Light", "淺色"), "sun"], ["dark", t("Dark", "深色"), "moon"]]))}
        ${row("Little countdown in the menu bar", "選單列小倒數", seg("mb1", [["hid", t("When all are put away", "收起來時")], ["al", t("Always", "一直顯示")]]))}</section>`,
    buddy: `<section class="card">${row("Who's on your desktop", "桌面上是誰", seg("who", [["pair", t("Both", "兩個")], ["together", t("Together", "同框")], ["milk", "Milk"], ["love", "Love"], ["others", t("Others", "其他")]]))}
        ${row("How lively", "多活潑", seg("pace", [["lively", t("Lively", "活潑")], ["calm", t("Calm", "悠閒")], ["calmer", t("Calmer", "更悠閒")], ["still", t("Still", "安靜")]]), "The calmer, the less battery it uses.", "越悠閒越省電。")}
        ${row("White edge", "白邊", seg("edge", [["none", t("None", "無")], ["thin", t("Thin", "細")], ["thick", t("Thick", "粗")]]))}${row("Teach me Thai words", "教我泰文單字", check(true))}</section>`,
    keep: `<section class="card">${row("How you keep time", "計時方式", seg("mode2", [["work", t("Work clock", "工作時鐘")], ["pomo", t("Pomodoro", "番茄鐘")]]))}${row("Daily goal", "每日目標", `<span class="tag p">6 h</span>`)}${row("Open the focus screen with every round", "每一輪都打開專注全螢幕", check(false))}</section>`,
    rem: `<section class="card">${row("The sound", "鈴聲", `<select class="sel"><option>P'Ink!</option><option>${t("Chime", "叮")}</option><option>牙蟲</option><option>พี่มิว!</option></select>`, "Milk and Love's voices, or the chime.", "Milk 和 Love 的聲音，或內建的「叮」。")}
        ${row("Buddy hidden? Show a card", "夥伴收起來時，跳出小卡片", check(true), "At the top right of the screen you're on.", "在你正在用的螢幕右上角。")}</section>
      <section class="card"><div class="card-h"><h2>${t("What pops up", "會跳出什麼")}</h2></div>${row("Reminders", "提醒", check(true))}${row("Events", "活動", check(true))}${row("Break reminders", "休息提醒", check(true))}
        ${row("While I focus, reminders wait", "專注時，提醒先等等", check(true), "The focus screen or a Pomodoro round: they come together at the end.", "專注全螢幕或番茄鐘進行中：結束後一起告訴你。")}${row("Events still come through", "活動照樣跳出來", check(true))}</section>`,
    cats: `<section class="card"><div class="chips">${[["Focus work", "專注工作"], ["Admin", "雜事"], ["Meetings", "開會"], ["Study", "讀書"], ["Break · stretch", "休息 · 伸展"], ["Lunch", "午餐"]].map(([en, zh]) => `<span class="chip">${t(en, zh)}</span>`).join("")}</div></section>`,
    about: `<section class="card">${row("ML WorkHelp 1.2.0", "ML WorkHelp 1.2.0", `<button type="button" class="btn btn-s btn-sm">${ic("refresh-cw")}${t("Check now", "現在檢查")}</button>`, "You have the newest version.", "你用的是最新版本。")}
        ${row("The photo library", "照片庫", `<span class="muted">${t("The full library ✓", "完整貼圖庫 ✓")}</span>`, "Downloaded once; started with your own? Get it here any time.", "只下載一次；一開始選了自己的照片？隨時可以在這裡加上。")}
        ${row("Welcome and tour", "歡迎與導覽", `<button type="button" class="btn btn-s btn-sm" data-go="welcome">${t("Show again", "再看一次")}</button>`)}</section>`,
  }[g[0]];
  return `<div class="page">
    ${ph(t(g[2], g[3]), t(g[4], g[5]), g[6], `<button type="button" class="btn btn-g btn-sm" data-act="setopen" data-val="${prev[0]}">‹ ${t(prev[2], prev[3])}</button><button type="button" class="btn btn-g btn-sm" data-act="setopen" data-val="${next[0]}">${t(next[2], next[3])} ›</button>`,
      `<button type="button" class="crumb" data-act="sethome">← ${t("All settings", "所有設定")}</button>`)}
    <div class="stack">${body}</div></div>`;
}
S.mb1 = "hid"; S.mb2 = "task"; S.pace = "calm"; S.edge = "thin";

/* ---------------- Desktop buddy ---------------- */
const WHO = [
  ["pair", "Side by side", "並排", ["preview-milk-25d9980b.png", "preview-love-3e1da30c.png"]],
  ["together", "Together", "同框", ["together-17.png"]],
  ["milk", "Milk", "Milk", ["preview-milk-25d9980b.png"]],
  ["love", "Love", "Love", ["preview-love-3e1da30c.png"]],
  ["others", "Others", "其他", ["w5-72989f1d.png"]],
];
function buddy() {
  const w = WORDS[S.word];
  const who = WHO.find((x) => x[0] === S.who) || WHO[0];
  const groupW = who[3].length * 118 + 20;
  const bubble = S.bubble % 2 === 0
    ? `<div class="bubble" style="right:28px;bottom:184px"><span class="th">${w.th}</span><span class="rom">${w.rom}</span> · <span class="mean">${t(w.en, w.zh)}</span>
        <div class="song">${ic("music-2")}${w.song}</div></div>`
    : `<div class="bubble" style="right:28px;bottom:184px"><b>${t("Break time!", "休息時間到了！")}</b><div class="muted" style="font-size:12.5px;margin-top:2px">${t("Stand up and stretch with me for 5 minutes.", "起來跟我一起伸展 5 分鐘。")}</div>
        <div class="bb-act"><button type="button" class="btn btn-p btn-sm">${t("Start break", "開始休息")}</button><button type="button" class="btn btn-s btn-sm">${t("5 more min", "再 5 分鐘")}</button></div></div>`;
  const ib = (icn, en, zh, extra = "") => `<button type="button" class="qi" aria-label="${t(en, zh)}" title="${t(en, zh)}" ${extra}>${ic(icn)}</button>`;
  return `<div class="page">
    <div class="ph"><div class="ph-actions" style="order:2">${seg("pace", [["lively", t("Lively", "活潑")], ["calm", t("Calm", "悠閒")], ["calmer", t("Calmer", "更悠閒")], ["still", t("Still", "安靜")]], "How lively")}</div><div class="ph-text"><h1>${t("Desktop buddy", "桌面夥伴")}</h1><p>${t("Click the buddy for the next bubble; right-click for the card. Try picking who's out in the card.", "點夥伴換下一個泡泡；右鍵打開小卡。試試在小卡裡選誰出來。")}</p></div></div>
    <div class="desk">
      <div class="menubar"><b></b><span>Finder</span><span>File</span><span>Edit</span><span class="sp"></span><span class="hb">${ic("heart")}18:42</span><span>Sat 11:31</span></div>
      <span class="desk-cap">${t("Your desktop (pretend)", "你的桌面（示意）")}</span>
      <div class="win" style="left:40px;top:60px;width:420px;height:250px"></div>
      <div class="win" style="left:300px;top:120px;width:300px;height:200px;opacity:.8"></div>
      ${bubble}
      ${S.hidden ? `<div class="popcard" role="status"><div><span class="k">${t("Reminder", "提醒")}</span><b>${t("Call the bank", "打給銀行")}</b><span class="muted">15:00 · ${t("now", "現在")}</span>
          <div class="pc-a"><button type="button" class="btn btn-p btn-sm">${t("Done", "完成")}</button><button type="button" class="btn btn-s btn-sm">${t("In 10 min", "10 分鐘後")}</button></div></div>${stk("app-rem-add-fa866d09.png")}</div>
        <button type="button" class="btn btn-s btn-sm bring" data-act="hidebuddy">${ic("eye")}${t("Bring the buddy back", "叫回夥伴")}</button>` : ""}
      ${S.hidden ? "" : `<button type="button" class="buddy" style="right:20px;bottom:6px;display:flex;gap:0" data-act="bubble" data-ctx="qcard" aria-label="${t("Desktop buddy", "桌面夥伴")}">${who[3].map((f, i) => stk(f, i ? "r" : "")).join("")}</button>`}
      ${S.qcard && !S.hidden ? `<div class="qcard" style="right:${groupW + 16}px;bottom:14px" role="menu" aria-label="${t("Buddy card", "夥伴小卡")}">
        <div class="qtop"><b>2:35</b><span class="muted">${t("worked today", "今天工作")}</span><span style="flex:1"></span><button type="button" class="qpomo">${ic("timer")}18:42</button></div>
        <div class="qtask"><span>${t("Chapter 3 draft", "第三章初稿")}</span><button type="button" class="chip">${t("Switch", "切換")} ${ic("chevron-down")}</button></div>
        <div class="qgrid">
          <button type="button">${ic("coffee")}${t("Take a break", "休息一下")}</button><button type="button">${ic("maximize-2")}${t("Focus screen", "專注全螢幕")}</button>
          <button type="button">${ic("bell-plus")}${t("Remind me", "提醒我")}</button><button type="button">${ic("moon")}${t("Done for today", "收工")}</button></div>
        <div class="qwho"><span class="label">${t("On my desktop", "桌面上是")}</span>
          <div class="qwho-row" role="group">${WHO.map(([k, en, zh, files]) => `<button type="button" class="av ${files.length > 1 ? "two" : ""}" data-set="who" data-val="${k}" aria-pressed="${S.who === k}" title="${t(en, zh)}" aria-label="${t(en, zh)}">${files.map((f) => `<img src="s/${pub(f)}" alt="">`).join("")}</button>`).join("")}</div>
          <span class="qwho-name">${t(who[1], who[2])} <span class="muted">· ${t("tap again for another sticker", "再點一次換一張")}</span></span></div>
        <div class="qrow">${ib("image", "Original photo", "原始照片")}${ib("eye-off", "Hide", "隱藏", 'data-act="hidebuddy"')}${ib("app-window", "Open app", "打開 App", 'data-go="today"')}${ib("settings-2", "Settings", "設定", 'data-go="settings"')}</div>
      </div>` : ""}
    </div>
  </div>`;
}

function credits() {
  const P = [["Blumoon", "@blumoonfoto", 1], ["Lyrac", "@loveminiheartph", 1], ["NGMin", "@ngmin", 1], ["otter", "@Miiiichstabe", 1], ["wanwannjeab", "@wanwannjeab", 1, "draw"],
    ["GMMTV", "@GMMTV", 0, "official"], ["Milk", "@panlyyy", 0, "her"], ["Love", "@loverrukk", 0, "her"], ["MilkPansaFamily", "@milkfamily__"], ["KIU", "@kiu_628ML"], ["Sflove0523", "@sflove0523"], ["alitasdepollos", "@alitasdepollos0", 0, "own"]];
  const what = (k) => ({ draw: t("Cartoon Muv drawings", "卡通 Muv 插畫"), official: t("Official photos", "官方照片"), her: t("Her posts", "她的貼文"), own: t("Photos & Muv drawings", "照片和 Muv 插畫") }[k] || t("Photos", "照片"));
  return `<div class="page">
    ${ph(t("Thank you to the photographers and artist", "謝謝攝影師和畫家"), t("We've been given permission to use photos by Blumoon, Lyrac, NGMin and otter, and the cartoon drawings by wanwannjeab. Point at any sticker to see whose photo it is.", "我們已經得到 Blumoon、Lyrac、NGMin、otter 的照片，以及 wanwannjeab 的卡通插畫的使用許可。滑鼠移到任何貼圖上，就知道是誰的照片。"), "app-credits-top-3a840744.png", "", `<span class="crumb">${t("Photos & credits", "照片來源")}</span>`)}
    <div class="cc-grid">${P.map(([n, h, ok, k]) => `<div class="card cc">${ok ? `<span class="cc-ok" title="${t("Gave us permission", "已同意我們使用")}">✓</span>` : ""}<span class="ic">${ic(k === "draw" ? "pen-tool" : "camera")}</span><b>${n}</b><span class="h">${h}</span><span class="muted">${what(k)}</span></div>`).join("")}</div>
    <section class="card note-i">${ic("info")}<p>${t("For the other photos, we tried to reach the photographers but heard nothing back, or we don't know who took them. If a photo is yours and you'd like the credit changed or the photo removed, tell us any time and we'll fix it in the next update.", "其他的照片，我們試著聯絡過攝影師但沒有收到回覆，或不知道是誰拍的。如果其中有你的照片，想更改標註或希望移除，隨時告訴我們，我們會在下一次更新修正。")}</p></section>
  </div>`;
}

function help() {
  const Q = [["How do I switch between the work clock and the Pomodoro?", "工作時鐘和番茄鐘怎麼切換？", "At the top of the timer card on Today. Nothing is lost, and you can undo.", "在「今天」計時卡的最上面。已經記下的時間不會不見，也可以復原。"],
    ["How do I change the style?", "怎麼換風格？", "Settings › Look › Style. Colours and light or dark are right underneath.", "設定 › 外觀 › 風格。顏色和淺色、深色就在下面。"],
    ["Where are my photos and stickers?", "我的照片和貼圖在哪裡？", "Only on your Mac. The app never uploads them.", "只在你的 Mac 上，App 不會上傳。"]];
  return `<div class="page">
    <div class="help-head">${stk("app-help-top-3386667a.png")}<h1>${t("Help & questions", "幫助與常見問題")}</h1><p class="muted">${t("Muv's here to help.", "Muv 來幫你了。")}</p></div>
    <section class="card faq">${Q.map(([q, qz, a2, az], i) => `<details ${i ? "" : "open"}><summary>${t(q, qz)}</summary><p>${t(a2, az)}</p></details>`).join("")}</section>
    <section class="card contact">${stk("w-contact-a0141675.png", "contact-stk")}<div><div class="card-h"><h2>${t("Still stuck? Write to us", "還是不懂？寫信給我們")}</h2></div>
      <div class="actions"><button type="button" class="btn btn-p">${ic("mail")}${t("Email us", "寫信給我們")}</button><button type="button" class="btn btn-s" data-act="tour">${ic("compass")}${t("Show me around again", "再帶我看一次")}</button></div></div></section>
  </div>`;
}

/* ---------------- Welcome pages (their own window): one framed card, as in the app ---------------- */
const tip = (en, zh) => `<div class="pansa">${stk("muv-plain.png")}<p><b>${t("Muv's tip:", "Muv 小提醒：")}</b> ${t(en, zh)}</p></div>`;
const pts = (list) => `<ul class="pts">${list.map(([en, zh]) => `<li>${t(en, zh)}</li>`).join("")}</ul>`;
function welcome() {
  const opt = (k, key, file, en, zh, den, dzh) => `<button type="button" class="opt" data-set="${key}" data-val="${k}" aria-pressed="${S[key] === k}">${stk(file)}<b>${t(en, zh)}</b><span>${t(den, dzh)}</span></button>`;
  const pomo = S.mode2 === "pomo";
  const two = (left, right) => `<div class="wl-two"><div class="wl-col">${left}</div><div class="wl-pic">${right}</div></div>`;
  const STEPS = [
    ["Welcome", "歡迎", "Drawings: @wanwannjeab", two(`<span class="kick">ML WorkHelp</span><h1>${t("Hi! Meet your work buddies.", "嗨！來認識一下你的工作夥伴吧。")}</h1>
      <p>${t("Milk and Love keep you company while you work: they stroll about on your screen, keep time with you, remind you to take breaks, hold up your reminders and events, and teach you a Thai word now and then.", "你工作時，Milk 和 Love 會陪在旁邊：在螢幕上走來走去、幫你計時、提醒你起來休息、把提醒和活動舉給你看，偶爾還會教你一個泰文單字。")}</p>
      <div class="wl-row"><span>${t("Language", "語言")}</span>${seg("lang", [["en", "English"], ["zh", "繁體中文"]])}</div><div class="wl-row"><span>${t("Light or dark", "淺色或深色")}</span>${seg("mode", [["light", t("Light", "淺色")], ["dark", t("Dark", "深色")]])}</div>
      <b class="small-h">${t("Pick a look (you can change it any time in Settings)", "挑一個樣子（之後隨時能在「設定」改）")}</b>
      <div class="stylecards">${STYLES.map(([k, en, zh]) => `<button type="button" class="stylecard" data-style-pick="${k}" aria-pressed="${S.style === k}"><span class="mini" data-mini="${k}"></span><b>${t(en, zh)}</b></button>`).join("")}</div>`,
      `<div class="say-bubble"><b>${t("Hi, I'm Muv!", "嗨，我是 Muv！")}</b> ${t("You can call me Jubmeow too. I'll show you around.", "叫我 Jubmeow 也可以。我來帶你逛逛。")}</div>${stk("muv-baby.png", "wl-big bob")}`)],
    ["Photos", "照片", "Drawings: @wanwannjeab", `<h1>${t("Which photos to start with?", "要從哪些照片開始？")}</h1>
      <div class="opts two">${opt("full", "wphotos", "w2-full-f98592e3.png", "Full sticker library", "完整貼圖庫", "Every photo and sticker that comes with the app, downloaded once. 743 photos · about 320 MB", "App 附的所有照片和貼圖，只要下載一次。743 張照片 · 約 320 MB")}${opt("own", "wphotos", "app-stickers-title-3526fdd0.png", "None: I'll add my own", "不用了，我自己加照片", "Start empty and make stickers from your own photos.", "從零開始，用你自己的照片做貼圖。")}</div>
      ${S.wphotos === "full" ? (S.wdl == null ? `<div class="wl-dl"><b>${t("Disclaimer: please read", "免責聲明：請先看完")}</b><p class="muted small">${t("Some photos we have the photographer's permission for; some come from GMMTV and Milk and Love's own posts; for some we couldn't reach the photographer, or don't know who took them. They're for your own personal, non-commercial use…", "有些照片的攝影師已經同意我們使用；有些來自 GMMTV、Milk 和 Love 自己的貼文；還有一些我們聯絡不到攝影師，或不知道是誰拍的。只供個人、非商業用途⋯")}</p>
          <label class="check"><input type="checkbox" checked> ${t("I have read and agree to this disclaimer.", "我已經看完並同意以上聲明。")}</label><button type="button" class="btn btn-p" data-act="wdl">${ic("download")}${t("Download the photos (320 MB)", "下載照片（320 MB）")}</button></div>`
        : `<div class="wl-dl"><b>${S.wdl >= 100 ? t("Done: 859 stickers are ready.", "完成：859 張貼圖都準備好了。") : t("Downloading the photos…", "正在下載照片⋯")}</b> <span class="muted">${S.wdl >= 100 ? "" : `${Math.round(S.wdl * 3.2)} / 320 MB · ${t("you can keep going, it carries on", "可以繼續往下，下載不會停")}`}</span><div class="wl-bar"><i style="width:${S.wdl}%"></i></div>
          <p class="muted small">${t("It goes straight into the app: nothing to unzip or move. Each photo shows who took it; use them as stickers and on your desktop, but they can't be cut or changed.", "照片會直接放進 App 裡，不用解壓縮或搬檔案。每張都標明是誰拍的；可以當貼圖、當桌面夥伴，但不能裁切或修改。")}</p></div>`) : ""}
      ${tip("you can add your own photos any time (anyone, not only MilkLove), sorted into Milk, Love, Together or Others.", "之後隨時都能加自己的照片（誰都可以，不限 MilkLove），分到 Milk、Love、同框或其他。")}`],
    ["Keeping time", "計時", "Photos: alitasdepollos · Blumoon · Drawings: @wanwannjeab", `<h1>${t("How do you want to keep time?", "你想怎麼計時？")}</h1>
      <div class="opts two">${opt("work", "mode2", "w3-keep-c8b7ca47.png", "Work clock", "工作時鐘", "The clock counts while you're at the computer, and stops by itself when you're away 5 minutes.", "只要你在電腦前就會計時，離開 5 分鐘以上會自動停下。")}${opt("pomo", "mode2", "app-now-pomo-52c6b97f.png", "Pomodoro", "番茄鐘", "25 minutes of focus, a 5-minute break, round after round. Each round counts as today's work.", "專注 25 分鐘、休息 5 分鐘，一輪接一輪。每一輪都算進今天的工作。")}</div>
      <label class="check"><input type="checkbox"> ${t("I often work away from the computer (reading, studying on paper, drawing…)", "我常常不在電腦前工作（看書、讀紙本、畫畫⋯）")}</label>
      ${tip("not sure? Start with the work clock. Switch any time with the two buttons at the top of Today.", "還沒決定？就先選「工作時鐘」吧。之後在「今天」最上面就能隨時切換。")}`],
    ["The buddy", "夥伴", "Photos: NGMin · otter · Drawings: @wanwannjeab", two(`<h1>${t("1. The desktop buddy", "1. 桌面夥伴")}</h1>
      ${pts([["<b>Drag it</b> anywhere, onto any screen; <b>right-click it</b> for its card.", "<b>拖曳</b>她到任何地方、任何螢幕；<b>按右鍵</b>可以打開小卡。"], ["<b>Click it</b> and it does something else; on a break, click it to say you're back.", "<b>點一下</b>她會換個動作；休息時點她，就能說「我回來了」。"]])}
      <div class="wl-row"><span>${t("Under the buddy", "夥伴下面")}</span><select class="sel"><option>${t("What I'm working on · time on it", "正在做的事 · 做了多久")}</option></select></div>
      <div class="wl-row"><span>${t("How lively", "多活潑")}</span>${seg("pace", [["lively", t("Lively", "活潑")], ["calm", t("Calm", "悠閒")], ["calmer", t("Calmer", "更悠閒")], ["still", t("Still", "安靜")]])}</div>
      <label class="check"><input type="checkbox" checked> ${t("Teach me Thai words", "教我泰文單字")}</label><button type="button" class="btn btn-p">${ic("sparkles")}${t("Bring the desktop buddy out", "叫出桌面夥伴")}</button>`,
      `<div class="w-preview"><div class="pv-pair">${stk("preview-milk-25d9980b.png")}${stk("preview-love-3e1da30c.png", "r")}</div><div class="pv-label">${t("Chapter 3 draft", "第三章初稿")} · 25 min</div></div>${tip("change it any time in Settings → Desktop buddy, or right-click the buddy.", "之後可以到「設定 → 桌面夥伴」修改，或直接在夥伴上按右鍵。")}`)],
    ["The window", "視窗", "Drawings: @wanwannjeab", two(`<h1>${t("2. Everything is in one window", "2. 所有功能都在一個視窗裡")}</h1>
      <p>${t("Click the little heart in the menu bar, or right-click the buddy. The tabs down the left:", "點選單列的小愛心，或在夥伴上按右鍵。左邊的分頁：")}</p>
      ${pts([["<b>Today</b>: the clock, the Pomodoro, your day", "<b>今天</b>：計時、番茄鐘、你今天做了什麼"], ["<b>Reminders & events</b>", "<b>提醒與活動</b>"], ["<b>Data</b>: your week, month and year", "<b>數據</b>：看一週、一個月、一年"], ["<b>Settings</b>, <b>Stickers</b>, <b>Photo credits</b>", "<b>設定</b>、<b>貼圖</b>、<b>照片來源</b>"]])}
      ${tip("lost? Click Muv at the bottom left of the window.", "迷路了？點視窗左下角的 Muv。")}`, stk("muv-cartoon.png", "wl-big bob"))],
    pomo ? ["Pomodoro", "番茄鐘", "Photo: Blumoon", two(`<h1>${t("3. The Pomodoro", "3. 番茄鐘")}</h1>${pts([["25 minutes of focus, 5 of rest, a longer break every 4 rounds (or your own lengths).", "專注 25 分鐘、休息 5 分鐘，每 4 輪多休息一下（長度可以自己設）。"], ["Every break is one screen, with a MilkLove video (GMMTV OFFICIAL).", "每次休息都是同一個畫面，還有一支 MilkLove 的影片（GMMTV OFFICIAL）。"], ["<b>Done for today</b>: a half-done round counts too.", "<b>收工</b>：做到一半的這一輪也算。"]])}`, stk("app-now-pomo-52c6b97f.png", "wl-big"))]
      : ["Work time", "工作時間", "Photo: Blumoon", two(`<h1>${t("3. Your work time", "3. 你的工作時間")}</h1>${pts([["Each day the buddy asks whether to start; the clock counts from <b>Start</b>.", "每天夥伴會問你要不要開始；按下<b>開始</b>才會計時。"], ["Set a <b>focus of the day</b>: the theme of the whole day.", "設定<b>本日主題</b>：今天整天的重點。"], ["<b>Focus screen</b>: away from the computer? The clock fills the screen and keeps counting.", "<b>專注全螢幕</b>：不在電腦前時，時鐘放大到整個螢幕，一直計時。"]])}`, stk("app-now-pomo-52c6b97f.png", "wl-big"))],
    ["Reminders & events", "提醒與活動", "Drawings: @wanwannjeab", two(`<h1>${t("4. Reminders & events", "4. 提醒與活動")}</h1>
      ${pts([["<b>Write what it is, then tap when</b>: in 15 minutes, tonight, or pick a date and time.", "<b>寫下要做什麼，再點時間</b>：15 分鐘後、今晚，或自己選日期和時間。"], ["<b>It rings when it's time</b>: the chime, or Milk and Love's voices (“P'Ink!”, “牙蟲”, “พี่มิว!”…).", "<b>時間到會響</b>：內建的「叮」，或 Milk 和 Love 的聲音（「P'Ink！」、「牙蟲」、「พี่มิว！」⋯）。"],
        ["<b>With the buddy hidden</b>, a small card pops up at the top right of the screen you're on. <b>While you focus</b>, reminders wait and come together at the end.", "<b>夥伴收起來的時候</b>，會在你正在用的螢幕右上角跳出一張小卡片。<b>專注時</b>，提醒會先等等，結束後一起告訴你。"]])}`,
      `<div class="popcard"><div><span class="k">${t("Reminder", "提醒")}</span><b>${t("Call the bank", "打給銀行")}</b><span class="muted">15:00 · ${t("now", "現在")}</span><div class="pc-a"><button type="button" class="btn btn-p btn-sm">${t("Done", "完成")}</button><button type="button" class="btn btn-s btn-sm">${t("In 10 min", "10 分鐘後")}</button></div></div>${stk("muv-heart.png")}</div>`)],
    ["Data", "數據", "Photo: Lyrac", two(`<h1>${t("5. Data", "5. 數據")}</h1>${pts([["A week, a month or a year: Summary, Analysis and Calendar.", "一週、一個月或一年：總覽、分析和日曆。"], ["Click a day to see what you did, and change it.", "點一天就能看那天做了什麼，也能修改。"], ["<b>Make a picture</b>: a little card with a sticker you pick, credit included.", "<b>做成圖片</b>：一張小卡片，貼圖自己挑，附上照片來源。"]])}`, stk("w10-32626d3f.png", "wl-big"))],
    ["Your stickers", "你的貼圖", "Photo: Lyrac", two(`<h1>${t("6. Make your own stickers", "6. 做你自己的貼圖")}</h1>${pts([["Stickers → <b>+ Add photos</b>: anyone you like, with their credit.", "貼圖 → <b>＋ 加入照片</b>：誰都可以，標上來源。"], ["Touch them up (crop, erase, soft edges), then sort into Milk, Love, Together or Others.", "修一修（裁切、擦除、柔邊），再分到 Milk、Love、同框或其他。"], ["Point at any sticker to see whose photo it is.", "滑鼠移到任何貼圖上，就知道是誰的照片。"]])}
      <p class="warn">${t("The stickers you make stay in this app. The ones that come with the app are there to look at, not to change.", "你做的貼圖只會留在這個 App 裡。App 內建的貼圖可以看，但不能修改。")}</p>`, stk("w7-205202d7.png", "wl-big"))],
    ["Updates", "新版本與重要通知", "Photo: Blumoon", two(`<h1>${t("New versions & important notices", "新版本與重要通知")}</h1><p>${t("One last step: leave your email. We'll write when there's a new version, or something you need to know.", "最後一步：留下你的 email。有新版本或需要你知道的事時，我們會寫信給你。")}</p>
      <div class="cmp-in" style="max-width:420px"><input placeholder="you@example.com" aria-label="Email"></div>${pts([["Only ML WorkHelp's news. No ads, no spam.", "只寄 ML WorkHelp 的消息，沒有廣告、不寄垃圾信。"], ["Never shared, sold or given to anyone.", "絕不分享、出售或提供給任何人。"]])}`, stk("w-contact-a0141675.png", "wl-big"))],
    ["Done", "完成", "Drawings: @wanwannjeab", `<div class="wl-done">${stk("w11-right-303518a9.png", "wl-heart")}<h1>${t("You're all set!", "都準備好了！")} <span>สู้ๆ นะ!</span></h1><p class="muted">${t("Click Finish: the window opens and Muv shows you around.", "按下「完成」會打開 App 的視窗，Muv 會帶你逛一圈。")}</p>
      <div class="wl-thanks"><b>${t("Thank you to the people behind these photos and drawings", "謝謝這些照片和插畫的主人")}</b><div class="wl-cards">${[["Blumoon", 1], ["Lyrac", 1], ["NGMin", 1], ["otter", 1], ["wanwannjeab", 1, 1], ["GMMTV"], ["Milk"], ["Love"], ["MilkPansaFamily"], ["KIU"], ["Sflove0523"], ["alitasdepollos"]].map(([n, ok, draw], i) => `<div class="wl-tc" style="animation-delay:${.1 * i}s">${ok ? `<span class="ok">✓</span>` : ""}${draw ? `<span class="muvs">${stk("muv-heart.png")}${stk("muv-baby.png")}${stk("muv-plain.png")}</span>` : ic("camera")}<b>${n}</b></div>`).join("")}</div>
      <p class="muted small">${t("✓ Gave us permission: Blumoon, Lyrac, NGMin and otter (photos), and wanwannjeab (the Muv drawings). Thank you to everyone else too. For the rest, we tried to reach the photographers but heard nothing back, or we don't know who took them.", "✓ 已經同意我們使用：Blumoon、Lyrac、NGMin 和 otter（照片），以及 wanwannjeab（Muv 插畫）。也謝謝其他每一位。其他的照片，我們試著聯絡過攝影師但沒有收到回覆，或不知道是誰拍的。")}</p></div></div>`],
  ];
  const N = STEPS.length, step = Math.min(S.wstep || 0, N - 1), [ten, tzh, credit, html] = STEPS[step];
  const wait = step === 1 && (!S.wphotos || (S.wphotos === "full" && S.wdl == null));
  return `<div class="wl-frame">
    <div class="wl-top"><b>ML WorkHelp</b><span class="muted">· ${t(ten, tzh)}</span><span class="wl-dots">${STEPS.map((_, i) => `<i class="${i === step ? "on" : i < step ? "done" : ""}"></i>`).join("")}</span><span class="muted small">${step + 1} / ${N}</span></div>
    <div class="wl-body">${html}</div>
    <span class="wl-credit">${credit.replace("Drawings", t("Drawings", "插畫")).replace("Photos", t("Photos", "照片")).replace("Photo:", t("Photo:", "照片："))}</span>
    <div class="wl-foot"><button type="button" class="btn btn-s" data-act="wback" ${step ? "" : "disabled"}>${t("Back", "上一步")}</button><span class="muted small">${wait ? t("Pick one to go on", "選一個再繼續") : step === 0 ? t("Everything here can be changed later in Settings", "這些之後都能在「設定」裡改") : ""}</span>
      ${step < N - 1 ? `<button type="button" class="btn btn-p" data-act="wnext" ${wait ? "disabled" : ""}>${t("Next", "下一步")}</button>` : `<button type="button" class="btn btn-p" data-go="today" data-act="tour">${t("Finish", "完成")}</button>`}</div>
  </div>`;
}

/* ---------------- the walkthrough (Muv points things out) ---------------- */
const TOUR = [
  [".card.now", "This is your timer. Switch between the work clock and the Pomodoro here, and take a break or call it a day.", "這是你的計時。在這裡切換工作時鐘和番茄鐘，也能休息一下或收工。", "top:calc(100% + 14px);left:24px"],
  [".card.word", "A Thai word from the songs. Tap it to see what it means.", "歌裡的泰文單字，點一下看意思。", "top:60px;left:-300px"],
  [".nav", "Everything else is here: reminders, your data, stickers, and Settings at the bottom.", "其他功能都在這裡：提醒、數據、貼圖，設定在最下面。", "top:120px;left:200px"],
];
function applyTour() {
  if (S.tour == null || S.tour < 0 || S.page !== "today") return;
  const [sel, en, zh, pos] = TOUR[S.tour];
  document.querySelectorAll(".app").forEach((app) => {
    const el = app.querySelector(sel); if (!el) return;
    app.classList.add("touring");
    el.classList.add("tour-on");
    el.insertAdjacentHTML("beforeend", `<div class="tour-bub" style="${pos}">${stk("muv-cartoon.png")}<p>${t(en, zh)}</p>
      <div class="actions"><span class="muted" style="font-size:12px">${S.tour + 1} / ${TOUR.length}</span><span style="flex:1"></span><button type="button" class="btn btn-g btn-sm" data-act="tourend">${t("Skip", "略過")}</button><button type="button" class="btn btn-p btn-sm" data-act="tournext">${S.tour < TOUR.length - 1 ? t("Next", "下一步") : t("Done", "完成")}</button></div></div>`);
  });
}

const PAGE_FN = { today, reminders, data, stickers, settings, buddy, credits, help, welcome };

/* ---------------- notes under the window ---------------- */
const NOTES = {
  today: [
    ["Stickers here: the timer card changes with you (focusing, on a break, done for today), Today's theme has her own sticker, the dachshund sits on “Next up” when there's a reminder, and the two of them appear in Your day only when nothing's logged yet (try “Empty day” at the top).", "這頁的貼圖：計時卡會跟著你變（專注、休息、收工），本日主題有自己的貼圖，有提醒時臘腸狗會坐在「接下來」上，「今天的紀錄」裡的兩人只在還沒有紀錄時出現（試試上方的「空白的一天」）。"],
    ["On a break, the MilkLove video card shows right under the timer: a big thumbnail with its length, Watch, Another one and Not this one, the same as the app now (press Take a break to see it).", "休息時，MilkLove 影片卡就在計時下面：大大的縮圖和長度、看影片、換一個、不要這支，跟現在的 App 一樣（按「休息一下」就會看到）。"],
    ["New: Take a break shows a break card with MilkLove videos; Done for today shows a celebration. “Show me around” starts Muv's walkthrough.", "新：「休息一下」會出現有 MilkLove 影片的休息卡；「收工」會出現慶祝畫面。「帶我看看」會開始 Muv 的導覽。"],
    ["Work clock and Pomodoro are now one switch inside the timer card, not two big cards on top.", "工作時鐘和番茄鐘變成計時卡裡的一個切換，不再是上面兩張大卡。"],
    ["One main button per screen (Start/Pause), the same shape everywhere. The rest are quieter.", "每個畫面只有一個主要按鈕（開始/暫停），到處長得一樣；其他按鈕安靜一點。"],
    ["Today's theme sits next to the timer as a little note, so you see it while you work.", "本日主題變成計時旁的小便條，工作時看得到。"],
    ["New: the Thai word card on Today (from the songs). Tap to flip. Learning shows up in the app, not only on the buddy.", "新：今天頁的泰文卡（來自歌詞），點一下翻面。學泰文不只在桌面夥伴上。"],
    ["New: “Next up” shows the next reminder without switching tabs.", "新：「接下來」直接顯示下一個提醒，不用切頁。"],
    ["Help text moved into a ? tip instead of three lines of grey text.", "說明文字收進 ? 小提示，不再是三行灰字。"],
    ["The day is a coloured timeline plus a short log; hover a row to edit.", "今天變成彩色時間軸加簡短紀錄；滑過一列就能編輯。"],
  ],
  reminders: [
    ["Stickers here: one by the title, one in the add form (a different one when you switch to Event), the dachshund on the list when something's coming up, and “MilkLove are relaxing too” only when today is empty.", "這頁的貼圖：標題旁一張、新增表單一張（切到活動會換一張）、有接下來的提醒時臘腸狗在清單上，「MilkLove 也在放鬆」只在今天沒有提醒時出現。"],
    ["Type it like a sentence. A preview shows what it understood before you add it (try typing “stretch in 20 min”).", "像說話一樣打字，新增前先顯示它聽懂了什麼（試打「20 分鐘後 伸展」）。"],
    ["Reminder or Event is a switch at the top; When and Repeat are two tidy rows.", "提醒/活動是上方的切換；什麼時候和重複整齊排兩行。"],
    ["The list reads like a day planner. The next one is highlighted with Snooze and Done ready.", "清單像手帳一樣按天排；最近的一個會亮起來，延後和完成直接可按。"],
    ["Calendar events get a calendar icon, reminders a bell, so you can tell them apart at a glance.", "行事曆活動用日曆圖示、提醒用鈴鐺，一眼分得出來。"],
  ],
  data: [
    ["Save image, Export CSV and the tour move into one Share menu: fewer buttons on top.", "存成圖片、匯出 CSV 和導覽收進一個「分享」選單，上方按鈕變少。"],
    ["Summary / Analysis / Calendar is one switch next to the week picker. The sidebar no longer grows sub-items.", "總覽/分析/日曆是週選擇旁的一個切換；左側選單不再展開子項目。"],
    ["Bars are stacked by category with the goal line; today is labelled.", "長條依分類疊起來，有目標線，今天有標示。"],
    ["Highlights in plain words, with a little nudge from Milk and Love.", "重點用白話寫，再加一句 Milk 和 Love 的提醒。"],
  ],
  stickers: [
    ["The big pink rules box becomes a one-line note you can open (it can still show in full the first time).", "大大的粉紅規則框變成一行，可以點開看全文（第一次仍可完整顯示）。"],
    ["Sort right on the tile: M / L / T buttons, plus the keyboard keys shown as little keys. Try it.", "直接在貼圖上分類：M / L / T 按鈕，鍵盤快捷鍵也標出來。試試看。"],
    ["Add photos uses the same main button as everywhere else (it was black before).", "「加入照片」用跟其他地方一樣的主要按鈕（原本是黑色的）。"],
  ],
  settings: [
    ["Stickers here: Getting set up, the Look card, Milk and Love previews for the desktop buddy, and one standing at the bottom of About & updates: all the ones Settings has now.", "這頁的貼圖：設定小幫手、外觀卡、桌面夥伴的 Milk 和 Love 預覽，還有站在「關於與更新」底下的那張：跟現在設定頁的一樣。"],
    ["New idea: a Style setting. We could ship two of these looks and let fans pick. Try clicking the cards.", "新點子：「風格」設定。可以放兩種風格讓粉絲自己選。點點看。"],
    ["Colour themes show a little preview with their names, not only two-colour dots.", "主題顏色顯示小預覽和名字，不只是雙色圓點。"],
    ["Settings groups live inside the Settings page, so the side menu stays short and doesn't jump.", "設定的分組放在設定頁裡，左側選單保持短短的、不會跳動。"],
  ],
  buddy: [
    ["The right-click card is smaller (about 220 px wide) and matches the app's style.", "右鍵小卡變小了（約 220 px 寬），跟 App 同一個風格。"],
    ["“Other sticker” becomes “On my desktop”: pick Side by side, Together, Milk, Love or Others right in the card (today it's hidden in the menu-bar menu). Tapping the one already picked still swaps to another sticker.", "「換貼圖」變成「桌面上是」：直接在小卡裡選並排、同框、Milk、Love 或其他（現在藏在選單列裡）。再點一次已選的，還是會換一張貼圖。"],
    ["Same buttons as today's card: Take a break, Focus screen, Remind me, Done for today; Photo, Hide, Open app and Settings become small icons.", "保留現在小卡的按鈕：休息一下、專注全螢幕、提醒我、收工；原始照片、隱藏、打開 App、設定變成小圖示。"],
    ["Thai word bubble is smaller: Thai, then the sound and meaning, and the song as a small tag.", "泰文泡泡變小：泰文、發音和意思，歌名是小標籤。"],
  ],
  credits: [["Photo credits, restyled: everyone who took a photo, with their handle and how many photos; the ones who gave permission are marked. Its sticker stays at the top.", "照片來源換上新樣式：每位拍攝者、帳號和照片數，有授權的會標出來。貼圖還是在最上面。"]],
  help: [["Help keeps the 1.0.1 layout: the title in the middle with the bigger sticker above it, then questions, and a contact card with its own sticker.", "幫助頁保留 1.0.1 的排法：標題置中、上面放大的貼圖，接著是常見問題，還有附貼圖的聯絡卡。"], ["Click Muv at the bottom left of any page to get here.", "在任何一頁點左下角的 Muv 就會到這裡。"]],
  welcome: [["The welcome pages follow the real ones, page for page (10 here: Pomodoro people see the Pomodoro page instead of Your work time), with their text, Pansa's tips and every sticker in its spot.", "歡迎頁跟原本的一頁一頁對應（這裡 10 頁：選番茄鐘的人會看到番茄鐘那頁，不是「你的工作時間」），文字、Pansa 小提醒和每張貼圖都在原本的位置。"], ["New: pick your look (the 8 styles) on the first page; Muv peeks in from the left.", "新：第一頁就能挑風格（8 種）；Muv 從左邊探出頭。"], ["The last page keeps the thank-you credits, and Finish starts Muv's walkthrough.", "最後一頁保留感謝名單，按「完成」會開始 Muv 的導覽。"]],
};
const ALL = [
  ["Side menu: grouped (work things, then a “Fan corner”), Settings at the bottom with the Word of the day and Muv.", "左側選單分組（工作的東西，然後是「粉絲角落」），設定放底部，旁邊是今日泰文和 Muv。"],
  ["Every page starts the same way: title, one line, and a sticker in the same spot, so stickers never cover words.", "每一頁開頭都一樣：標題、一行說明、固定位置的貼圖，貼圖不會再蓋到字。"],
  ["One set of buttons, chips, switches and cards across the whole app (and the buddy).", "整個 App（和桌面夥伴）用同一套按鈕、標籤、切換和卡片。"],
  ["Lucide icons everywhere instead of emoji (no more 💻 in the category picker).", "全部用 Lucide 圖示，不用 emoji（分類選單不再有 💻）。"],
  ["Cute rounded fonts that cover Chinese (粉圓) and Thai (Mali), bundled with the app.", "圓圓可愛的字型，中文（粉圓）和泰文（Mali）都有，跟 App 一起打包。"],
];

/* ---------------- drawing ---------------- */
function appHTML(style) {
  const solo = S.page === "welcome";
  return `<div class="app-win"><div class="app ${solo ? "solo" : ""}" data-style="${style}" data-theme="${S.theme}" data-mode="${S.mode}" data-hfont="${S.hfont}"><div class="titlebar"><i></i><i></i><i></i><span>${solo ? t("Welcome to ML WorkHelp", "歡迎使用 ML WorkHelp") : "ML WorkHelp"}</span></div>${solo ? "" : nav()}<main class="main">${PAGE_FN[S.page]()}</main></div></div>`;
}
function draw() {
  document.documentElement.lang = S.lang === "zh" ? "zh-Hant" : "en";
  document.querySelectorAll("[data-t]").forEach((e) => { const [en, zh] = e.dataset.t.split("|"); e.textContent = t(en, zh); });
  const btns = (id, items, key) => { document.getElementById(id).innerHTML = items.map(([v, html]) => `<button type="button" data-bar="${key}" data-val="${v}" aria-pressed="${S[key] === v}">${html}</button>`).join(""); };
  btns("styleBtns", STYLES.map(([k, en, zh, d1, d2]) => [k, `<span class="bar-style"><b>${k.toUpperCase()}</b> ${t(en, zh)}</span>`]), "style");
  btns("pageBtns", PAGES.map(([k, en, zh]) => [k, t(en, zh)]), "page");
  btns("themeBtns", THEMES.map(([k, en, zh, c1, c2]) => [k, `<span class="sw" style="background:linear-gradient(135deg, ${c1} 50%, ${c2} 50%)" title="${t(en, zh)}"></span>`]), "theme");
  btns("langBtns", [["en", "EN"], ["zh", "中文"]], "lang");
  btns("modeBtns", [["light", t("Light", "淺色")], ["dark", t("Dark", "深色")]], "mode");
  const eb = document.getElementById("emptyBtn");
  if (eb) { eb.textContent = t("Empty day", "空白的一天"); eb.setAttribute("aria-pressed", String(!!S.empty)); }
  const cb = document.getElementById("compareBtn");
  cb.textContent = S.compare ? t("Back to one", "回到單一") : t("Compare all 4", "四款並排比較"); cb.setAttribute("aria-pressed", S.compare);

  const stage = document.getElementById("stage");
  const keepScroll = [...stage.querySelectorAll(".main")].map((m) => m.scrollTop);
  stage.classList.toggle("compare", S.compare);
  stage.innerHTML = S.compare
    ? STYLES.map(([k, en, zh]) => `<div class="frame-wrap" data-pick="${k}" title="${t("Open this one", "打開這款")}"><span class="frame-label">${k.toUpperCase()} · ${t(en, zh)}</span>${appHTML(k)}</div>`).join("")
    : `<div class="frame-wrap">${appHTML(S.style)}</div>`;
  stage.querySelectorAll(".main").forEach((m, i) => { m.scrollTop = keepScroll[i] || 0; });

  const st = STYLES.find((s) => s[0] === S.style);
  document.getElementById("notes").innerHTML = `
    <h3>${t("What changes on this page (in every style)", "這一頁改了什麼（每個風格都一樣）")}</h3>
    <ol>${(NOTES[S.page] || []).map(([en, zh]) => `<li>${t(en, zh)}</li>`).join("")}</ol>
    <div class="stylebox"><div><h3>${t("Across the whole app", "整個 App")}</h3><ol>${ALL.map(([en, zh]) => `<li>${t(en, zh)}</li>`).join("")}</ol></div>
    <div><h3>${st[0].toUpperCase()} · ${t(st[1], st[2])}</h3><p style="margin:0">${t(st[3], st[4])}.</p>
      <p style="margin:8px 0 0"><b>${t("Chinese font:", "中文字型：")}</b> ${t(...ZH_FONT[S.style])}</p>
<p class="why">${t("Styles change shape, fonts, shadows and how stickers are dressed. Your colour themes stay and work with every style; switch them in the bar above.", "風格改的是形狀、字型、陰影和貼圖的樣子；你原本的主題顏色都保留，每個風格都能用，在上方切換。")}</p></div></div>`;
  applyTour();
  window.lucide?.createIcons();
  save();
}

/* ---------------- clicks ---------------- */
document.addEventListener("click", (e) => {
  const b = e.target.closest("button, [data-act], [data-pick]");
  if (!b) return;
  const d = b.dataset;
  if (d.bar) { S[d.bar] = d.val; if (d.bar === "style") S.compare = false; return draw(); }
  if (d.pick && S.compare) { S.style = d.pick; S.compare = false; return draw(); }
  if (b.id === "compareBtn") { S.compare = !S.compare; return draw(); }
  if (b.id === "emptyBtn") { S.empty = !S.empty; return draw(); }
  if (d.go && !d.act) { S.page = d.go; return draw(); }
  if (d.go) S.page = d.go;
  if (d.stylePick) { S.style = d.stylePick; return draw(); }
  if (d.themePick) { S.theme = d.themePick; return draw(); }
  if (d.sort) { S.sorted[d.sort] = d.to; return draw(); }
  if (d.set) { S[d.set] = d.val; if (d.set === "remType") {} return draw(); }
  switch (d.act) {
    case "run": S.running = !S.running; return draw();
    case "break": S.phase = "break"; return draw();
    case "vid": S.vid = (S.vid || 0) + 1; return draw();
    case "done": S.phase = "done"; return draw();
    case "back": S.phase = "focus"; return draw();
    case "tour": S.page = "today"; S.tour = 0; S.phase = "focus"; return draw();
    case "tournext": S.tour = S.tour < TOUR.length - 1 ? S.tour + 1 : -1; return draw();
    case "tourend": S.tour = -1; return draw();
    case "wnext": S.wstep = Math.min(10, (S.wstep || 0) + 1); return draw();
    case "wback": S.wstep = Math.max(0, (S.wstep || 0) - 1); return draw();
    case "flip": S.flipped = !S.flipped; return draw();
    case "bubble": S.bubble++; if (S.bubble % 2 === 0) S.word = (S.word + 1) % WORDS.length; return draw();
    case "nextword": S.word = (S.word + 1) % WORDS.length; S.flipped = false; return draw();
    case "share": S.share = !S.share; return draw();
    case "hidebuddy": S.hidden = !S.hidden; return draw();
    case "setopen": S.setGroup = d.val; S.setOpen = true; return draw();
    case "sethome": S.setOpen = false; return draw();
    case "wdl": S.wdl = 0; { const tick = setInterval(() => { S.wdl = Math.min(100, (S.wdl || 0) + 5); if (S.page === "welcome") draw(); if (S.wdl >= 100) clearInterval(tick); }, 200); } return draw();
    case "help": if (EMBED) return; alert(t("Help would open here (same as now).", "這裡會打開幫助頁（跟現在一樣）。")); return;
    case "focus": if (EMBED) return; alert(t("The full-screen focus view would open (same as now, restyled).", "會打開全螢幕專注畫面（跟現在一樣，換上新風格）。")); return;
    case "addrem": {
      const p = parse(S.draft || ""); if (!p.what) return document.getElementById("draft")?.focus();
      S.added.push({ tm: (p.when || "").split(" ").pop() || "12:00", name: p.what, sub: `<span class="tag p">${t("New", "新")}</span>${t("Once · this app", "一次 · 這個 App")}` });
      S.draft = ""; return draw();
    }
  }
});
document.addEventListener("contextmenu", (e) => { const b = e.target.closest("[data-ctx]"); if (b) { e.preventDefault(); S[b.dataset.ctx] = !S[b.dataset.ctx]; draw(); } });
document.addEventListener("keydown", (e) => {
  if (e.target.closest?.(".word") && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); S.flipped = !S.flipped; draw(); }
  if (S.page === "stickers" && S.tray === "sort" && !e.target.closest("input")) {
    const to = { m: "milk", l: "love", t: "together", x: "no" }[e.key.toLowerCase()];
    const f = TRAY.find((x) => !S.sorted[x]);
    if (to && f) { S.sorted[f] = to; draw(); }
    if (e.key.toLowerCase() === "u") { const k = Object.keys(S.sorted).pop(); if (k) { delete S.sorted[k]; draw(); } }
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id !== "draft") return;
  S.draft = e.target.value;
  const p = parse(S.draft);
  const el = document.getElementById("parsed");
  el.innerHTML = p.what || p.when ? `${ic("wand-sparkles")}${t("Will remind you:", "會提醒你：")} <span class="tag p">${ic("bell")}${p.what || t("(what?)", "（什麼事？）")}</span><span class="tag">${ic("clock-3")}${p.when || t("in 30 min", "30 分鐘後")}</span>` : "";
  window.lucide?.createIcons();
});
document.addEventListener("keydown", (e) => { if (e.target.id === "draft" && e.key === "Enter") document.querySelector('[data-act="addrem"]')?.click(); });

/* the clock ticks (only the numbers, so nothing jumps under the mouse) */
setInterval(() => {
  if (!S.running) return;
  S.left = S.left > 0 ? S.left - 1 : S.total; S.worked++;
  if (S.page !== "today") return;
  const pomo = S.mode2 === "pomo", C = 2 * Math.PI * 88, frac = pomo ? S.left / S.total : (S.worked % 3600) / 3600;
  document.querySelectorAll("#clock").forEach((c) => { c.textContent = pomo ? mmss(S.left) : hms(S.worked); });
  document.querySelectorAll(".ring .bar").forEach((r) => r.setAttribute("stroke-dashoffset", C * (1 - frac)));
}, 1000);

if (location.hash.includes("tall")) document.body.classList.add("tall");
draw();
