/* The ML WorkHelp page's "What it does" (three big things + the rest as chips) and the Desktop buddy block
   (Milk & Love on a pretend desktop, as on the app's Desktop buddy page). index.html calls drawFeatures() whenever
   the language changes; light/dark comes from html[data-look]. Every sticker here has its credit in WHO (the page's
   hover tooltip reads it too), and each section ends with a credit line for phones. */
(() => {
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const LG = () => (typeof lang === "string" ? lang : "en");
const T = (en, zh, th) => (LG() === "zh" ? zh : LG() === "th" ? (th || en) : en);
const L = (a) => T(a[0], a[1], a[2]);
const G = (h) => (typeof glue === "function" ? glue(h) : h);   // (the page's: no lonely last character in 中文 / ไทย)
const ic = (n) => `<i data-lucide="${n}" class="ic"></i>`;

/* whose photo (or drawing) each picture here is */
const WHO = {
  "assets/fan/muv-muv-cartoon.webp": "@wanwannjeab", "assets/fan/muv-muv-heart.webp": "@wanwannjeab",
  "assets/stk/milk-163-1.webp": "Blumoon", "assets/stk/milk-137-1.webp": "Blumoon", "assets/stk/milk-155-1.webp": "Blumoon",
  "assets/stk/love-191-1.webp": "Blumoon", "assets/stk/love-061-1.webp": "NGMin", "assets/stk/love-080-1.webp": "alitasdepollos",
  "assets/stk/together-215-1.webp": "Lyrac", "assets/stk/together-081-1.webp": "otter",
  "assets/deco/app-now-pomo-52c6b97f.webp": "Blumoon", "assets/stickers/final-1.webp": "alitasdepollos",
};
window.MLWH_WHO = Object.assign(window.MLWH_WHO || {}, WHO);
const IMG = {
  milk: "assets/stk/milk-163-1.webp", love: "assets/stk/love-191-1.webp", milk2: "assets/stk/milk-137-1.webp", milk3: "assets/stk/milk-155-1.webp",
  love2: "assets/stk/love-061-1.webp", love3: "assets/stk/love-080-1.webp", tog: "assets/stk/together-215-1.webp", tog2: "assets/stk/together-081-1.webp",
  muv: "assets/fan/muv-muv-cartoon.webp", muv2: "assets/fan/muv-muv-heart.webp",
  pomo: "assets/deco/app-now-pomo-52c6b97f.webp", own: "assets/stickers/final-1.webp",
};
const stk = (src, style) => `<img loading="lazy" class="stk" src="${src}" alt="" style="${style}" draggable="false">`;
const R = (src, mw = 44, mh = 92) => stk(src, `right:0;bottom:0;max-width:${mw}%;max-height:${mh}%;height:auto;width:auto`);
const Lf = (src, mw = 44, mh = 92) => stk(src, `left:0;bottom:0;max-width:${mw}%;max-height:${mh}%;height:auto;width:auto`);

/* words in the pictures (the reminder card's buttons are the app's own: Done / In 10 min) */
const W = {
  task: ["Chapter 3 draft", "第三章草稿", "ร่างบทที่ 3"],
  today: ["today 3 h 20 min", "今天 3 小時 20 分", "วันนี้ 3 ชม. 20 นาที"],
  call: ["14:30 Call the bank", "14:30 打給銀行", "14:30 โทรหาธนาคาร"],
  callT: ["Call the bank", "打給銀行", "โทรหาธนาคาร"],
  work: ["Work clock", "工作時鐘", "นาฬิกาทำงาน"], pomo: ["Pomodoro", "番茄鐘", "โพโมโดโร่"],
  round2: ["round 2 of 4", "第 2 / 4 輪", "รอบที่ 2 จาก 4"],
  reminder: ["Reminder", "提醒", "แจ้งเตือน"], done: ["Done", "完成", "เสร็จแล้ว"], in10: ["In 10 min", "10 分鐘後", "อีก 10 นาที"],
  word: ["sometimes; maybe", "有時候；也許", "sometimes; maybe"],
  rings: ["Milk & Love ringtones", "Milk 和 Love 的鈴聲", "เสียงเรียกเข้า Milk กับ Love"],
  photoBy: ["Photo: alitasdepollos", "照片：alitasdepollos", "รูป: alitasdepollos"],
};
const SC = {
  desk: () => `<div class="scene desk">
    <div class="mb"><b>Finder</b><span>File</span><span>Edit</span><span>View</span><span class="sp"></span>${ic("heart")}<span>Sun 14:05</span></div>
    <div class="win" style="left:6%;top:16%;width:44%;height:44%"></div><div class="win" style="left:54%;top:24%;width:38%;height:36%"></div>
    ${stk(IMG.milk, "left:31%;bottom:16%;height:56%")}${stk(IMG.love, "left:49%;bottom:16%;height:56%")}
    <div class="lbl2" style="position:absolute;left:50%;bottom:3%;transform:translateX(-50%)">${L(W.task)} ${T("25 min", "25 分", "25 นาที")} · ${L(W.today)}<span>⏰ ${L(W.call)}</span></div>
    <div class="bubble" style="right:5%;top:14%"><b>บางที</b>bang thi<span class="hide-sm"> · ${L(W.word)}</span></div></div>`,
  clock: () => `<div class="scene">
    <div class="seg2" style="position:absolute;left:5%;top:9%;z-index:2"><span class="on">${L(W.work)}</span><span>${L(W.pomo)}</span></div>
    <div class="ring" style="position:absolute;left:6%;top:34%"><b>18:42</b></div>
    <span class="mini hide-sm" style="left:calc(6% + 104px);top:52%">${ic("timer")}<span>${L(W.round2)}</span></span>
    ${R(IMG.pomo, 38)}</div>`,
  fan: () => `<div class="scene mk-scene">
    <img loading="lazy" class="mk-ph" src="assets/stickers/photo-1.jpg" alt="" draggable="false">
    <span class="mk-arrow">${ic("arrow-right")}</span>
    ${stk(IMG.own, "right:6%;bottom:0;height:92%;width:auto")}
    <span class="mini" style="left:5%;bottom:9%">${ic("camera")}<span>${L(W.photoBy)}</span></span></div>`,
};

const F = {
  buddy: { t: ["Milk & Love on your desktop", "Milk 和 Love 就在你的桌面上", "Milk กับ Love อยู่บนเดสก์ท็อปของคุณ"],
    l: ["They keep you company by your windows. Click them for a Thai word; right-click for the buttons you use most.",
      "她們在視窗旁陪著你。點一下學一個泰文單字，按右鍵就有最常用的按鈕。",
      "อยู่เป็นเพื่อนข้างหน้าต่างของคุณ คลิกเพื่อดูคำไทย คลิกขวาเพื่อเปิดปุ่มที่ใช้บ่อย"] },
  time: { t: ["Work clock or Pomodoro", "工作時鐘或番茄鐘", "นาฬิกาทำงานหรือโพโมโดโร่"],
    l: ["Count your time task by task, or work in rounds with breaks in between. Switch with one tap.",
      "一件一件記下工作時間，或一輪一輪專注、中間休息，一鍵就能切換。",
      "นับเวลาทีละงาน หรือทำเป็นรอบมีพักคั่น สลับได้ในแตะเดียว"] },
};
/* also in the app: icon, title, one line (a scannable grid, no fold); only what isn't shown anywhere else on the page */
const ALL = [
  ["layers", ["Categories & a daily goal", "分類和每日目標", "หมวดงานและเป้าหมายรายวัน"], ["See your time by kind of work, and how close you are to today's goal.", "看看時間花在哪一類工作，離今天的目標還差多少。", "ดูว่าใช้เวลากับงานแต่ละแบบเท่าไร และใกล้เป้าหมายของวันนี้แค่ไหน"]],
  ["calendar-days", ["A calendar you can edit", "可以修改的日曆", "ปฏิทินที่แก้ไขได้"], ["Forgot to start the clock? Fix the day afterwards.", "忘了開始計時？之後再補上就好。", "ลืมกดจับเวลา? แก้ย้อนหลังได้"]],
  ["refresh-cw", ["Apple sync", "同步 Apple", "ซิงก์กับ Apple"], ["Reminders and events can sync with Apple's apps if you like.", "提醒和活動可以同步到 Apple 的 App。", "แจ้งเตือนและกิจกรรมซิงก์กับแอปของ Apple ได้ ถ้าต้องการ"]],
  ["party-popper", ["Done for today", "收工", "เลิกงาน"], ["Call it a day and your stickers celebrate with you.", "按下收工，你的貼圖會陪你一起慶祝。", "กดเลิกงาน แล้วสติกเกอร์ของคุณจะฉลองไปด้วยกัน"]],
  ["layout-panel-left", ["Work corner & Fan corner", "工作角落和粉絲角落", "มุมทำงานกับมุมแฟนคลับ"], ["The menu keeps your work and your fan things apart.", "選單把工作和追星的東西分開放。", "เมนูแยกเรื่องงานกับเรื่องแฟนคลับไว้คนละมุม"]],
  ["cloud-download", ["New photos and words by themselves", "新照片和單字自己來", "รูปกับคำใหม่มาเอง"], ["More photos, pins and words arrive with no reinstall.", "更多照片、徽章和單字會自己送到，不用重新安裝。", "รูป เข็มกลัด และคำใหม่ ๆ มาเองโดยไม่ต้องติดตั้งใหม่"]],
  ["languages", ["Three languages", "三種語言", "สามภาษา"], ["English, Traditional Chinese and Thai (beta).", "英文、繁體中文和泰文（測試版）。", "อังกฤษ จีนตัวเต็ม และไทย (beta)"]],
  ["map", ["A tour to start", "一開始的導覽", "ทัวร์แนะนำตอนเริ่ม"], ["The first time you open it, Muv shows you around.", "第一次打開時，Muv 會帶你逛一圈。", "เปิดแอปครั้งแรก Muv จะพาคุณทัวร์"]],
];
/* a few more at the heart of it: one line and a small picture each (the pictures follow the language / light-dark via next.js data-nxpic) */
const MORE3 = [
  ["pins", "#ml-fan", ["Your fan pin collection", "你的粉絲徽章收藏", "คอลเลกชันเข็มกลัดของแฟน"], ["Pins from their shows, earned as you work; turn them over to read the back.", "來自她們作品的徽章，工作時慢慢收到；翻過來看背面。", "เข็มกลัดจากซีรีส์ของพวกเธอ ได้มาระหว่างทำงาน พลิกดูด้านหลังได้"]],
  ["looks", "#ml-looks", ["Ten looks", "10 種風格", "10 สไตล์"], ["From Purikura to Y2K emo and Whimsical, light or dark.", "從拍貼機到 Y2K emo 和 Whimsical，淺色或深色。", "ตั้งแต่ตู้สติกเกอร์ถึง Y2K และ Whimsical สว่างหรือมืด"]],
  ["words", "#ml-words", ["Thai from songs and daily life", "歌裡和生活裡的泰文", "ภาษาไทยจากเพลงและชีวิตประจำวัน"], ["A word on your Today page, from the songs or everyday life, easy to advanced.", "「今天」頁面上的單字，來自歌裡或生活裡，從簡單到進階。", "คำบนหน้าวันนี้ จากเพลงหรือชีวิตประจำวัน ตั้งแต่ง่ายถึงยาก"]],
];
const TK = {
  drag: ["Drag them to any screen", "想放哪個螢幕，拖過去就好", "ลากไปไว้จอไหนก็ได้"],
  calls: ["They step aside during calls", "通話時會先躲起來", "ตอนคุยสายหรือประชุมจะหลบไปก่อน"],
  lively: ["As lively or as calm as you like", "活潑或安靜，你決定", "จะให้ซนหรือนิ่งก็เลือกได้"],
  focusT: ["A focus screen for reading and paper work", "看書、寫紙本時用專注全螢幕", "หน้าจอโฟกัส ตอนอ่านหนังสือหรือทำงานบนกระดาษ"],
  remT: ["Reminders pop up on the screen you're using", "提醒會在你正在用的螢幕跳出來", "การแจ้งเตือนเด้งบนจอที่คุณใช้อยู่"],
  dataT: ["Your week, month and year in numbers", "每週、每月、每年的工作數據", "สถิติรายสัปดาห์ เดือน และปี"],
  credT: ["Every sticker shows whose photo it is", "每張貼圖都標明是誰拍的", "ทุกสติกเกอร์บอกว่าเป็นรูปของใคร"],
};
const ticks = (arr) => `<ul class="ticks">${arr.map((x) => `<li>${ic("check")}<span>${L(x)}</span></li>`).join("")}</ul>`;
const more = (href, a) => `<a class="more" href="${href}">${L(a)}${ic("arrow-down")}</a>`;
const head = (kick, h2, p) => `<div class="sec-h"><span class="kick">${L(kick)}</span><h2 class="sparkle">${L(h2)}</h2>${p ? `<p>${L(p)}</p>` : ""}</div>`;

function does() {
  return `${head(["What it does", "能做什麼", "ทำอะไรได้บ้าง"], ["Your work day, with Milk & Love", "Milk 和 Love 陪你過完工作的一天", "วันทำงานของคุณ มี Milk กับ Love อยู่ด้วย"],
    ["What's at the heart of it, and what else is in the app.", "最重要的幾件事，還有 App 裡的其他功能。", "หัวใจของแอป และอย่างอื่นที่มีในแอป"])}
  <div class="fa-grid">
    <article class="print fa-card big">${SC.desk()}<span class="ftag">${ic("smile")}${T("Desktop buddy", "桌面夥伴", "เพื่อนบนเดสก์ท็อป")}</span>
      <h3>${L(F.buddy.t)}</h3><p>${L(F.buddy.l)}</p>${ticks([TK.drag, TK.calls, TK.lively])}${more("#ml-buddy", ["Meet the buddy", "認識桌面夥伴", "รู้จักเพื่อนบนเดสก์ท็อป"])}</article>
    <article class="print fa-card">${SC.clock()}<span class="ftag">${ic("timer")}${T("Keeping time", "計時", "การจับเวลา")}</span>
      <h3>${L(F.time.t)}</h3><p>${L(F.time.l)}</p>${ticks([TK.focusT, TK.remT, TK.dataT])}${more("#ml-focus", ["Try the focus screen", "試試專注全螢幕", "ลองหน้าจอโฟกัส"])}</article>
    <article class="print fa-card">${SC.fan()}<span class="ftag">${ic("sticker")}${T("Stickers", "貼圖", "สติกเกอร์")}</span>
      <h3>${T("Stickers from your photos", "用你的照片做貼圖", "สติกเกอร์จากรูปของคุณ")}</h3>
      <p>${T("Add a photo and the people are cut out for you. Sort them into Milk, Love and Together; they walk on your desktop and the focus screen.",
        "加一張照片，人物會自動剪下來。分成 Milk、Love 和同框，貼圖還會在桌面和專注全螢幕上走來走去。",
        "เพิ่มรูป แล้วคนในรูปจะถูกไดคัตให้เอง แยกเป็น Milk, Love และคู่กัน แล้วสติกเกอร์ก็เดินเล่นบนเดสก์ท็อปและหน้าจอโฟกัสได้ด้วย")}</p>
      ${ticks([TK.credT])}${more("#ml-stickers", ["Make your own stickers", "動手做貼圖", "ลองทำสติกเกอร์"])}</article>
  </div>
  <div class="fa-more">${MORE3.map(([k, href, t, l]) => `<a class="print fa-mini" href="${href}"><span class="fa-mpic" data-nxpic="${k}"></span><b>${L(t)}</b><span>${G(L(l))}</span></a>`).join("")}</div>
  <h3 class="fa-allh">${T("Also in the app", "App 裡還有", "ในแอปยังมี")}</h3>
  <ul class="fa-all">${ALL.map(([i, t, l]) => `<li>${ic(i)}<b>${L(t)}</b><span>${G(L(l))}</span></li>`).join("")}</ul>`;
}

/* ---------- the Desktop buddy block ---------- */
const B = {
  kick: ["Desktop buddy", "桌面夥伴", "เพื่อนบนเดสก์ท็อป"],
  h2: ["Milk & Love, right on your desktop", "Milk 和 Love，就在你的桌面上", "Milk กับ Love อยู่บนเดสก์ท็อปของคุณ"],
  lead: ["They stand by your windows while you work, with your clock underneath. Click them for a Thai word; right-click for a small card with the buttons you use most. Drag them to any screen.",
    "你工作時，她們就站在視窗旁邊，下面顯示你的時間。點一下看泰文單字；按右鍵會打開小卡片，常用的按鈕都在上面。想放哪個螢幕，拖過去就好。",
    "ระหว่างทำงาน ทั้งคู่จะยืนข้างหน้าต่าง มีเวลาของคุณอยู่ด้านล่าง คลิกเพื่อดูคำไทย คลิกขวาเพื่อเปิดการ์ดเล็กที่มีปุ่มที่ใช้บ่อย อยากให้อยู่จอไหนก็ลากไปได้เลย"],
  desk: ["Your desktop (pretend)", "你的桌面（示意）", "เดสก์ท็อปของคุณ (จำลอง)"], second: ["Second screen", "第二個螢幕", "จอที่สอง"],
  tryL: ["Try it:", "試試看：", "ลองดู:"], click: ["Click them", "點她們一下", "คลิกที่เพื่อน"], rclick: ["Right-click them", "按右鍵", "คลิกขวา"],
  move: ["Move to the other screen", "移到另一個螢幕", "ย้ายไปอีกจอ"],
  g1: ["Who & look", "是誰與樣子", "ใครและหน้าตา"], g2: ["How it behaves", "怎麼活動", "ท่าทางของเพื่อน"], g3: ["Thai words", "泰文單字", "การ์ดคำศัพท์"], g4: ["When to hide", "什麼時候躲起來", "ซ่อนเมื่อไร"],
  p1: ["Both side by side, together in one sticker, just Milk, just Love, or your own stickers. Four sizes.", "兩人並排、同框、只有 Milk、只有 Love，或用你自己的貼圖。大小有四種。", "เดินคู่กัน อยู่ในสติกเกอร์เดียวกัน เฉพาะ Milk เฉพาะ Love หรือใช้สติกเกอร์ของคุณเอง มีให้เลือก 4 ขนาด"],
  p2: ["Lively, calm, calmer or still: the calmer, the less battery it uses. Under them, two lines: what you're on and what's next.", "活潑、悠閒、更悠閒或安靜：越悠閒越省電。下面兩行顯示你正在做的事和接下來的事。", "ซน ชิล ชิลกว่า หรือนิ่ง ๆ ยิ่งชิลยิ่งประหยัดแบต ใต้ตัวมีสองบรรทัด บอกงานที่ทำอยู่และเรื่องถัดไป"],
  p3: ["Click them for a Thai word card, from MilkLove's songs or everyday Thai, with how to say it; reminders and breaks bring one too. Switch it off if you'd rather not.",
    "點她們會跳出泰文單字卡，來自 MilkLove 的歌或日常泰文，附上念法；提醒和休息也會附一個。不想要也可以關掉。",
    "คลิกเพื่อดูการ์ดคำศัพท์ไทย จากเพลงของ MilkLove หรือคำไทยในชีวิตประจำวัน พร้อมคำอ่าน การแจ้งเตือนและการพักก็มีให้ด้วย ไม่อยากได้ก็ปิดได้"],
  p4: ["They step aside during calls, or for 30 minutes, 1 hour or 2 hours. Meanwhile, reminders and breaks pop up as a small card on the screen you're using.", "通話時會先躲起來，也可以收起 30 分鐘、1 小時或 2 小時。這段時間，提醒和休息會在你正在用的螢幕跳出小卡片。", "ตอนคุยสายหรือประชุมจะหลบไปก่อน หรือซ่อนไว้ 30 นาที 1 ชั่วโมง 2 ชั่วโมงก็ได้ ระหว่างนั้น การแจ้งเตือนและการพักจะเด้งเป็นการ์ดเล็กบนจอที่คุณใช้อยู่"],
  who: { pair: ["Side by side", "兩人並排", "เดินคู่กัน"], tog: ["Together", "同框", "คู่กัน"], milk: ["Milk", "Milk", "Milk"], love: ["Love", "Love", "Love"], others: ["Others", "其他", "อื่น ๆ"] },
  sizes: [["Small", "小", "เล็ก"], ["Medium", "中", "กลาง"], ["Large", "大", "ใหญ่"], ["Extra large", "特大", "ใหญ่พิเศษ"]],
  paces: { lively: ["Lively", "活潑", "ซน"], calm: ["Calm", "悠閒", "ชิล"], calmer: ["Calmer", "更悠閒", "ชิลกว่า"], still: ["Still", "安靜", "นิ่ง ๆ"] },
  on: ["On", "開", "เปิด"], off: ["Off", "關", "ปิด"],
  out: ["Out", "在桌面上", "อยู่บนจอ"], onCall: ["On a call", "通話中", "กำลังคุยสาย"], h30: ["Hide 30 min", "收起 30 分鐘", "ซ่อน 30 นาที"],
  nCall: ["On a call: they're out of sight, and the reminder comes as a card at the top right.", "通話中：她們先躲起來，提醒改成在右上角跳出小卡片。", "กำลังคุยสาย: ทั้งคู่หลบไปก่อน การแจ้งเตือนจะเด้งเป็นการ์ดที่มุมขวาบน"],
  n30: ["Hidden until 14:35, then they come back by themselves. Reminders come as a card meanwhile.", "收起來到 14:35，時間到會自己回來；這段時間提醒會改成小卡片。", "ซ่อนถึง 14:35 แล้วจะกลับมาเอง ระหว่างนั้นการแจ้งเตือนจะเป็นการ์ด"],
  hi: ["Hi!", "嗨！", "หวัดดี!"],
};
const WORDS = [["บางที", "bang thi", ["sometimes; maybe", "有時候；也許", "sometimes; maybe"]], ["ใกล้", "klai", ["near", "靠近", "near"]], ["ทำงาน", "tham-ngaan", ["to work", "工作", "to work"]]];
const WHOIMG = { pair: [[IMG.milk, IMG.love], [IMG.milk2, IMG.love2], [IMG.milk3, IMG.love3]], tog: [[IMG.tog], [IMG.tog2]], milk: [[IMG.milk2], [IMG.milk], [IMG.milk3]], love: [[IMG.love2], [IMG.love], [IMG.love3]], others: [[IMG.muv], [IMG.muv2]] };
const SIZES = [96, 124, 152, 180];
const bs = { who: "pair", alt: 0, size: 1, pace: REDUCED ? "still" : "calm", thai: true, hide: null, scr: "main", fx: 0.62, fy: 0.985, dir: 1, card: false, bubble: -1, word: 2 };

function buddyBlock() {
  const imgs = WHOIMG[bs.who][bs.alt % WHOIMG[bs.who].length];
  const W2 = WORDS[bs.word % WORDS.length];
  const face = (k) => WHOIMG[k][0][0];
  return `${head(B.kick, B.h2, B.lead)}
  <div class="bd">
    <div class="bd-stage" id="bdStage">
      <div class="bd-screens">
        <div class="bd-scr bd-main desk scene" data-scr="main">
          <div class="mb"><b>Finder</b><span>File</span><span>Edit</span><span>View</span><span class="sp"></span>${ic("heart")}<span>Sun 14:05</span></div>
          <span class="tagx">${L(B.desk)}</span>
          <div class="win" style="left:5%;top:20%;width:48%;height:46%"></div><div class="win" style="left:57%;top:28%;width:36%;height:34%"></div>
          <div class="rcard bd-pop" ${bs.hide ? "" : "hidden"}><div class="h">${ic("bell-ring")}${L(W.reminder)} · 14:30</div><b>${L(W.callT)}</b><div class="acts"><span class="mbtn p">${L(W.done)}</span><span class="mbtn">${L(W.in10)}</span></div></div>
        </div>
        <div class="bd-scr bd-second desk scene" data-scr="second"><div class="mb"><span class="sp"></span><span>14:05</span></div><span class="tagx">${L(B.second)}</span><div class="win" style="left:10%;top:26%;width:70%;height:44%"></div></div>
      </div>
      <div class="bd-buddy${bs.hide ? " gone" : ""}" id="bdBuddy" tabindex="0" role="button" aria-haspopup="menu" aria-label="${T("Milk and Love. Click for a Thai word, right-click for their card, drag to move.", "Milk 和 Love。點一下看泰文單字，按右鍵打開小卡片，拖曳可以移動。", "Milk กับ Love คลิกเพื่อดูคำไทย คลิกขวาเพื่อเปิดการ์ด ลากเพื่อย้าย")}">
        ${bs.bubble >= 0 ? `<div class="bubble">${bs.thai ? `<b>${W2[0]}</b>${W2[1]} · ${L(W2[2])}` : `<b style="font-family:var(--font-h)">${L(B.hi)}</b>`}</div>` : ""}
        <div class="bd-imgs" style="--bh:${SIZES[bs.size]}px">${imgs.map((s) => `<img loading="lazy" src="${s}" alt="" draggable="false">`).join("")}</div>
        <div class="lbl2">${L(W.task)} ${T("25 min", "25 分", "25 นาที")} · ${L(W.today)}<span>⏰ ${L(W.call)}</span></div>
      </div>
      <div class="bd-qc" id="bdCard" role="menu" ${bs.card ? "" : "hidden"} aria-label="${T("The buddy's card", "夥伴的小卡片", "การ์ดของเพื่อน")}">
        <div class="row1"><b>3:20</b><span>${T("worked today", "今天工作", "วันนี้ทำงานไปแล้ว")}</span></div>
        <div class="task"><span>${L(W.task)}</span><em>${T("Switch ▾", "切換 ▾", "สลับ ▾")}</em></div>
        <div class="big4"><span>${ic("coffee")}${T("Take a break ›", "休息一下 ›", "พักสักครู่ ›")}</span><span>${ic("scan")}${T("Focus screen", "專注全螢幕", "หน้าจอโฟกัส")}</span><span>${ic("bell")}${T("Remind me ›", "提醒我 ›", "เตือนฉัน ›")}</span><span>${ic("moon")}${T("Done for today", "收工", "เลิกงานวันนี้")}</span></div>
        <div class="sub">${T("On my desktop", "在桌面上", "บนเดสก์ท็อปตอนนี้")}</div>
        <div class="faces">${Object.keys(WHOIMG).map((k) => `<button type="button" data-who="${k}" aria-pressed="${bs.who === k}" aria-label="${L(B.who[k])}"><img loading="lazy" src="${face(k)}" alt=""></button>`).join("")}</div>
        <div class="bot"><span>${ic("eye-off")}${T("Hide ›", "隱藏 ›", "ซ่อน ›")}</span><span>${ic("panel-left")}${T("Open app", "打開 App", "เปิดแอป")}</span><span>${ic("sliders-horizontal")}${T("Settings", "設定", "การตั้งค่า")}</span></div>
      </div>
    </div>
    <div class="bd-try"><span>${L(B.tryL)}</span><button type="button" data-act="click">${ic("mouse-pointer-click")}${L(B.click)}</button><button type="button" data-act="card">${ic("mouse-pointer-2")}${L(B.rclick)}</button><button type="button" data-act="screen">${ic("monitor")}${L(B.move)}</button></div>
    <div class="bd-set">
      <div class="print"><h3><em>1</em>${L(B.g1)}</h3><p>${L(B.p1)}</p>
        <div class="opts">${Object.keys(WHOIMG).map((k) => `<button type="button" data-who="${k}" aria-pressed="${bs.who === k}"><img loading="lazy" src="${face(k)}" alt="">${L(B.who[k])}</button>`).join("")}</div>
        <div class="opts" style="margin-top:6px">${B.sizes.map((s, i) => `<button type="button" data-size="${i}" aria-pressed="${bs.size === i}">${L(s)}</button>`).join("")}</div></div>
      <div class="print"><h3><em>2</em>${L(B.g2)}</h3><p>${L(B.p2)}</p>
        <div class="opts">${Object.keys(B.paces).map((k) => `<button type="button" data-pace="${k}" aria-pressed="${bs.pace === k}">${L(B.paces[k])}</button>`).join("")}</div></div>
      <div class="print"><h3><em>3</em>${L(B.g3)}</h3><p>${L(B.p3)}</p>
        <div class="opts"><button type="button" data-thai="1" aria-pressed="${bs.thai}">${L(B.on)}</button><button type="button" data-thai="0" aria-pressed="${!bs.thai}">${L(B.off)}</button></div></div>
      <div class="print"><h3><em>4</em>${L(B.g4)}</h3><p>${L(B.p4)}</p>
        <div class="opts"><button type="button" data-hide="" aria-pressed="${!bs.hide}">${L(B.out)}</button><button type="button" data-hide="call" aria-pressed="${bs.hide === "call"}">${ic("phone")}${L(B.onCall)}</button><button type="button" data-hide="30" aria-pressed="${bs.hide === "30"}">${L(B.h30)}</button></div>
        ${bs.hide ? `<p class="note2">${L(bs.hide === "call" ? B.nCall : B.n30)}</p>` : ""}</div>
    </div>
  </div>`;
}

/* the buddy: place, walk, drag, click, right-click (or long-press) */
let stage, buddy, card, last = 0, walkUntil = 0, nextWalk = 0, bubbleTimer = 0, drag = null, press = 0;
const scrEl = (k) => stage.querySelector(`[data-scr="${k}"]`);
function scrBox(k) {
  const el = scrEl(k); if (!el || el.offsetParent === null) return null;
  const s = stage.getBoundingClientRect(), r = el.getBoundingClientRect();
  return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height };
}
function place() {
  if (!buddy || !stage || stage.offsetParent === null) return;
  let b = scrBox(bs.scr); if (!b) { bs.scr = "main"; b = scrBox("main"); } if (!b) return;
  const k = Math.max(0.6, Math.min(1, b.w / 760));
  buddy.querySelector(".bd-imgs").style.setProperty("--bh", Math.round(SIZES[bs.size] * k) + "px");
  const bw = buddy.offsetWidth, bh = buddy.offsetHeight, sw = stage.clientWidth, sh = stage.clientHeight;
  const lo = Math.max(2, b.x + 6), hi = Math.min(sw - bw - 2, b.x + b.w - bw - 6); // (inside its screen)
  buddy.style.left = (hi > lo ? Math.max(lo, Math.min(hi, b.x + bs.fx * b.w - bw / 2)) : Math.max(2, Math.min(sw - bw - 2, b.x + bs.fx * b.w - bw / 2))) + "px";
  buddy.style.top = Math.max(26, Math.min(sh - bh, b.y + bs.fy * b.h - bh)) + "px";
  buddy.classList.toggle("flip", bs.dir < 0);
  if (!card.hidden) placeCard();
}
function placeCard() {
  if (innerWidth < 768) return; // (phones: the card sits under the desktop, CSS)
  const sw = stage.clientWidth, sh = stage.clientHeight, cw = card.offsetWidth, ch = card.offsetHeight;
  const bl = buddy.offsetLeft, bt = buddy.offsetTop, bw = buddy.offsetWidth, bh = buddy.offsetHeight;
  let left = bl + bw + 10 + cw < sw - 6 ? bl + bw + 10 : bl - cw - 10, top = bt + bh - ch - 4;
  if (left < 6) { left = sw / 2 - cw / 2; top = bt - ch - 6; }
  if (bs.hide) { left = sw / 2 - cw / 2; top = sh / 2 - ch / 2; }
  card.style.left = Math.max(6, Math.min(sw - cw - 6, left)) + "px";
  card.style.top = Math.max(6, Math.min(sh - ch - 6, top)) + "px";
}
function loop(t) {
  requestAnimationFrame(loop);
  const dt = last ? Math.min(0.05, (t - last) / 1000) : 0; last = t;
  if (bs.hide || drag || !buddy || document.hidden) return;
  const gap = { lively: 0, calm: 6500, calmer: 15000, still: Infinity }[bs.pace];
  let walking = bs.pace === "lively" || t < walkUntil;
  if (!walking && gap !== Infinity && t > nextWalk) { walkUntil = t + 3200; nextWalk = t + 3200 + gap; walking = true; if (Math.random() < 0.4) bs.dir *= -1; }
  buddy.classList.toggle("walk", walking && !REDUCED);
  if (!walking || REDUCED) return;
  const b = scrBox(bs.scr); if (!b) return;
  bs.fx += bs.dir * 38 * dt / b.w;
  if (bs.fx > 0.86) { bs.fx = 0.86; bs.dir = -1; } if (bs.fx < 0.14) { bs.fx = 0.14; bs.dir = 1; }
  place();
}
function showBubble() {
  bs.bubble = 0; bs.word = (bs.word + 1) % WORDS.length; drawBuddy();
  clearTimeout(bubbleTimer); bubbleTimer = setTimeout(() => { bs.bubble = -1; drawBuddy(); }, 4500);
}
function openCard(on = card.hidden) { bs.card = on; card.hidden = !on; if (on) { placeCard(); card.querySelector("button")?.focus({ preventScroll: true }); } }
function wireBuddy() {
  stage = document.getElementById("bdStage"); buddy = document.getElementById("bdBuddy"); card = document.getElementById("bdCard");
  place();
  buddy.addEventListener("contextmenu", (e) => { e.preventDefault(); openCard(true); });
  buddy.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    const r = buddy.getBoundingClientRect();
    drag = { x0: e.clientX, y0: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, moved: false };
    buddy.setPointerCapture(e.pointerId);
    clearTimeout(press); if (e.pointerType !== "mouse") press = setTimeout(() => { if (drag && !drag.moved) { drag = null; openCard(true); } }, 550);
  });
  buddy.addEventListener("pointermove", (e) => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 5) return;
    drag.moved = true; clearTimeout(press); buddy.classList.add("drag"); openCard(false);
    const s = stage.getBoundingClientRect();
    buddy.style.left = Math.max(0, Math.min(stage.clientWidth - buddy.offsetWidth, e.clientX - s.left - drag.dx)) + "px";
    buddy.style.top = Math.max(0, Math.min(stage.clientHeight - buddy.offsetHeight, e.clientY - s.top - drag.dy)) + "px";
  });
  const up = () => {
    clearTimeout(press); if (!drag) return;
    const d = drag; drag = null; buddy.classList.remove("drag");
    if (!d.moved) { if (card.hidden) showBubble(); else openCard(false); return; }
    const cx = buddy.offsetLeft + buddy.offsetWidth / 2, by = buddy.offsetTop + buddy.offsetHeight;
    let best = "main", bd = Infinity;
    for (const k of ["main", "second"]) { const b = scrBox(k); if (!b) continue; const dd = Math.abs(cx - Math.max(b.x, Math.min(b.x + b.w, cx))); if (dd < bd) { bd = dd; best = k; } }
    const b = scrBox(best); bs.scr = best;
    bs.fx = Math.max(0.1, Math.min(0.9, (cx - b.x) / b.w)); bs.fy = Math.max(0.45, Math.min(0.985, (by - b.y) / b.h));
    place();
  };
  buddy.addEventListener("pointerup", up); buddy.addEventListener("pointercancel", up);
  buddy.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showBubble(); }
    if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) { e.preventDefault(); openCard(true); }
  });
}

/* credits: a line under each section (for phones, where there's no pointing) */
const join = (a) => a.length < 2 ? a.join("") : T(`${a.slice(0, -1).join(", ")} and ${a.at(-1)}`, `${a.slice(0, -1).join("、")} 和 ${a.at(-1)}`, `${a.slice(0, -1).join(", ")} และ ${a.at(-1)}`);
function fillCap(root) {
  const p = root.querySelector(".cred-cap"); if (!p) return;
  const by = new Set([...root.querySelectorAll("img")].map((i) => WHO[i.getAttribute("src")]).filter(Boolean));
  for (const k of Object.keys(WHOIMG)) for (const set of WHOIMG[k]) for (const s of set) if (root.id === "ml-buddy-in" && WHO[s]) by.add(WHO[s]); // (every look the buddy can take)
  const perm = ["Blumoon", "Lyrac", "NGMin", "otter", "KIU", "PKYU"].filter((n) => by.has(n)).map((n) => `<b>${n}</b>`);
  const own = by.has("alitasdepollos"), muv = by.has("@wanwannjeab");
  const muvTxt = T("cartoon Muv drawing by <b>หวานเจี๊ยบอุนยายม๋าไก่</b> (@wanwannjeab)", "卡通 Muv 插畫：<b>หวานเจี๊ยบอุนยายม๋าไก่</b>（@wanwannjeab）", "ภาพการ์ตูน Muv วาดโดย <b>หวานเจี๊ยบอุนยายม๋าไก่</b> (@wanwannjeab)");
  let s = "";
  if (perm.length) s = T(`Stickers and photos here are from photos by ${join(perm)} (used with permission)${own ? " and by <b>alitasdepollos</b>" : ""}`, `這裡的貼圖和照片取自 ${join(perm)} 的照片（已獲授權）${own ? "和 <b>alitasdepollos</b> 拍的照片" : ""}`, `สติกเกอร์และรูปตรงนี้มาจากรูปของ ${join(perm)} (ได้รับอนุญาตแล้ว)${own ? " และของ <b>alitasdepollos</b>" : ""}`);
  else if (own) s = T("Stickers here are from photos by <b>alitasdepollos</b>", "這裡的貼圖取自 <b>alitasdepollos</b> 拍的照片", "สติกเกอร์ตรงนี้มาจากรูปของ <b>alitasdepollos</b>");
  if (muv) s += (s ? T("; ", "；", " ") : "") + muvTxt;
  p.innerHTML = s + T(". Point at a sticker to see whose photo it is.", "。滑鼠移到貼圖上，就知道是誰拍的。", " ชี้ที่สติกเกอร์เพื่อดูว่าเป็นรูปของใคร");
}

function drawDoes() { const el = document.getElementById("ml-does-in"); if (!el) return; el.innerHTML = does() + `<p class="cap cred-cap"></p>`; fillCap(el); }
function drawBuddy() {
  const el = document.getElementById("ml-buddy-in"); if (!el) return;
  el.innerHTML = buddyBlock() + `<p class="cap cred-cap"></p>`;
  window.lucide?.createIcons(); wireBuddy(); fillCap(el);
}
document.addEventListener("pointerdown", (e) => { if (card && !card.hidden && !card.contains(e.target) && !buddy.contains(e.target) && !e.target.closest("[data-act]")) openCard(false); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && card && !card.hidden) { openCard(false); buddy.focus(); } });
document.addEventListener("click", (e) => {
  const b = e.target.closest("#ml-buddy-in button"); if (!b) return; const d = b.dataset;
  if (d.who) { if (bs.who === d.who) bs.alt++; else { bs.who = d.who; bs.alt = 0; } const keep = !card.hidden; drawBuddy(); if (keep) openCard(true); return; }
  if (d.size) { bs.size = +d.size; drawBuddy(); return; }
  if (d.pace) { bs.pace = d.pace; nextWalk = 0; drawBuddy(); return; }
  if (d.thai) { bs.thai = d.thai === "1"; bs.bubble = 0; drawBuddy(); return; }
  if (d.hide !== undefined) { bs.hide = d.hide || null; bs.card = false; drawBuddy(); return; }
  if (d.act === "click") { if (bs.hide) { bs.hide = null; drawBuddy(); } showBubble(); return; }
  if (d.act === "card") { if (bs.hide) { bs.hide = null; drawBuddy(); } openCard(true); return; }
  if (d.act === "screen") { bs.scr = bs.scr === "main" ? "second" : "main"; bs.fx = 0.5; bs.fy = 0.985; place(); }
});
addEventListener("resize", () => place());
addEventListener("hashchange", () => requestAnimationFrame(place)); // (the ML page shown: the buddy finds its feet)
if (document.fonts) document.fonts.ready.then(() => place());
let started = false;
/** Draw both (index.html's applyLang calls this, then makes the icons). */
window.drawFeatures = () => {
  drawDoes(); drawBuddy();
  requestAnimationFrame(place);
  if (!started) { started = true; requestAnimationFrame(loop); }
};
})();
