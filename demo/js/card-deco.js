// Decorate your card (plan WP3; the approved prototype is proto/card-deco/): Data › Make a picture in three steps,
// 1 · Card (the six kinds and the ten stickers, as before), 2 · Decorate (a tray of doodles and earned pins to drag onto the
// card: move, size, turn, flip, layer, delete, snap, undo, shuffle; up to 6), 3 · Download (a PNG in Downloads).
//   - The card is drawn on a canvas (card-draw.js), so the picture is the same as the stage in every host.
//   - Free: nothing to unlock. But only what may be seen (the spoiler rule, visible-set.js): Myra's 12 wall motifs, the
//     camera and Ajarn Maewnam, and the doodle of every pin earned (the pins engine calls MLWH_VISIBLE.setEarned).
//   - Pins: only the drama and classic pins earned (never a pin before it's earned; the badge-styled motifs were
//     removed on 28 Oct). A pin on the card is saved with style "badge" (card-deco-rules.js), drawn from doodles/pins/.
//   - The credit line "Doodles & pins by alitasdepollos" joins the photographer's line only when the card has a
//     decoration; it is drawn last, so nothing covers it.
//   - Each kind keeps its own layout (settings key cardDeco, card-deco-rules.js), so Make a picture reopens with it.
//   - Shipped photos stay view-only: the sticker is drawn as it is, under the decorations; nothing is saved back to it.
// Plain JS, Pointer Events; no inline handlers or styles in markup (positions go through the CSSOM): CSP-safe.

import "./visible-set.js";
import "./look-rules.js";
import "./card-deco-rules.js";
import { L, zh, th, el, state, toast, modal } from "./app-common.js";
import { thaiExact } from "./i18n.js";
import { currentLook } from "./look.js";
import { W, H, cardLook, cssLook, fontList, drawBase, drawCredits, clipCard } from "./card-draw.js";

const RULES = window.MLWH_CARD_RULES, VIS = window.MLWH_VISIBLE, LOOK = window.MLWH_LOOK_RULES;
const HOST = window.MLHost || null;
const R = document.documentElement;
const CAP = RULES.CAP, BASE = 64, SNAP = 6, INSET = 10;

// ---- words: English, 中文, ไทย. Thai: th.json's own "card›<English>" entry first (exact, no patterns: th.json's
// "Back to {0}" / "Download {0}" would half-translate these lines), else the draft written here; all beta ----
const T = (en, zhT, thT, ...a) => {
  let s = zh ? zhT : th ? thaiExact("card›" + en) ?? thT ?? en : en;
  a.forEach((v, i) => { s = s.split(`{${i}}`).join(v); });
  return s;
};
const W3 = {
  card: () => T("Card", "卡片", "การ์ด"), deco: () => T("Decorate", "裝飾", "ตกแต่ง"), down: () => T("Download", "下載", "ดาวน์โหลด"),
  which: () => T("Which card", "哪一種卡片", "การ์ดแบบไหน"), sticker: () => T("Sticker", "貼圖", "สติกเกอร์"),
  shuffle10: () => T("Shuffle: 10 new ones", "換一批：10 張", "สุ่มใหม่ 10 รูป"),
  stickersNote: () => T("Ten at random, from photos by Blumoon, Lyrac, NGMin, otter and alitasdepollos.", "隨機 10 張，來自 Blumoon、Lyrac、NGMin、otter 和 alitasdepollos 的照片。", "สุ่มมา 10 รูป จากรูปของ Blumoon, Lyrac, NGMin, otter และ alitasdepollos"),
  next: () => T("Next: decorate it", "下一步：裝飾", "ต่อไป: ตกแต่ง"), back: () => T("Back to the card", "回到卡片", "กลับไปที่การ์ด"),
  download: () => T("Download picture", "下載圖片", "ดาวน์โหลดรูปภาพ"), keep: () => T("Keep decorating", "繼續裝飾", "ตกแต่งต่อ"),
  savedNote: () => T("Saved as an image in your Downloads folder; nothing is sent anywhere.", "存成圖片放在「下載」資料夾，不會傳到任何地方。", "บันทึกเป็นรูปภาพในโฟลเดอร์ดาวน์โหลด ไม่มีการส่งไปที่ไหน"),
  has: (n) => T("{0} decorations on this card", "這張卡片上有 {0} 個裝飾", "การ์ดนี้มีของตกแต่ง {0} ชิ้น", n),
  doodles: () => T("Doodles", "小塗鴉", "ลายวาด"), pins: () => T("Pins", "徽章", "เข็มกลัด"),
  noPins: () => T("Pins you earn show up here.", "拿到的徽章會出現在這裡。", "เข็มกลัดที่ได้มาจะมาอยู่ตรงนี้"),
  dstyle: () => T("Doodle style", "塗鴉風格", "สไตล์ลายวาด"), match: (n) => T("Match the style · {0}", "跟著風格・{0}", "ตามสไตล์แอป · {0}", n),
  trayHint: () => T("Drag one onto the card, or click it to add it.", "拖到卡片上，或點一下加上去。", "ลากไปวางบนการ์ด หรือคลิกเพื่อเพิ่ม"),
  allStyle: () => T("Make every doodle on the card this style", "卡片上的塗鴉都換成這種", "เปลี่ยนลายวาดทุกชิ้นบนการ์ดเป็นสไตล์นี้"),
  pinsDrama: () => T("Series", "劇集", "ซีรีส์"), pinsClassic: () => T("Classic", "經典款", "แบบคลาสสิก"),
  moreNote: () => T("Each pin you earn adds its doodle here.", "每得到一個徽章，它的塗鴉就會出現在這裡。", "ได้เข็มกลัดชิ้นไหน ลายวาดของชิ้นนั้นจะมาอยู่ตรงนี้"),
  shuffle: () => T("Shuffle a cute layout", "隨機排一個可愛的", "สุ่มจัดให้น่ารัก"), undo: () => T("Undo", "復原", "ย้อนกลับ"), redo: () => T("Redo", "重做", "ทำซ้ำ"),
  clear: () => T("Take all off", "全部拿掉", "เอาออกทั้งหมด"),
  cap: (n) => T("{0} of {1} · up to {1}, so the card stays easy to read", "{0} / {1}・最多 {1} 個，卡片才看得清楚", "{0} จาก {1} · ใส่ได้ไม่เกิน {1} ชิ้น การ์ดจะได้อ่านง่าย", n, CAP),
  full: () => T("That's {0}. Take one off to add another.", "已經 {0} 個了，拿掉一個才能再加。", "ครบ {0} ชิ้นแล้ว เอาออกหนึ่งชิ้นก่อนจึงจะเพิ่มได้", CAP),
  snap: () => T("Snap to edges", "貼齊邊緣", "จัดชิดขอบ"), snapHint: () => T("Hold ⌥ while dragging to place freely.", "拖的時候按住 ⌥ 就不會貼齊。", "กด ⌥ ค้างไว้ตอนลาก เพื่อวางได้อิสระ"),
  selNone: () => T("Click something on the card to move, size or turn it. Arrow keys move it, Delete takes it off.", "點卡片上的裝飾就能移動、縮放或旋轉。方向鍵移動，Delete 拿掉。", "คลิกของบนการ์ดเพื่อย้าย ปรับขนาด หรือหมุน ใช้ปุ่มลูกศรเพื่อย้าย กด Delete เพื่อเอาออก"),
  flip: () => T("Flip", "翻面", "พลิก"), fwd: () => T("Bring forward", "往前", "ไว้ด้านหน้า"), bwd: () => T("Send back", "往後", "ไว้ด้านหลัง"), del: () => T("Delete", "刪除", "ลบ"),
  resize: () => T("Drag to resize", "拖曳來縮放", "ลากเพื่อปรับขนาด"), rotate: () => T("Drag to turn", "拖曳來旋轉", "ลากเพื่อหมุน"),
  itemLabel: (n) => T("{0}. Arrow keys move it, [ and ] turn it, + and − size it, F flips it, Delete takes it off.", "{0}。方向鍵移動，[ ] 旋轉，+ − 縮放，F 翻面，Delete 拿掉。", "{0} ใช้ลูกศรเพื่อย้าย [ และ ] เพื่อหมุน + และ − เพื่อปรับขนาด F เพื่อพลิก Delete เพื่อเอาออก", n),
  kept: () => T("Kept for next time: open Make a picture again to carry on.", "已經記下來了：下次打開「存成圖片」可以接著裝飾。", "จำการจัดวางไว้แล้ว เปิด “ทำเป็นรูปภาพ” อีกครั้งเพื่อตกแต่งต่อได้"),
  creditNote: () => T("With the first doodle or pin, a design credit joins the photo credit. It stays on top and always goes with the picture.", "放上第一個塗鴉或徽章，照片署名下就會多一行設計署名；它一直在最上層，下載的圖片一定會有。", "พอวางลายวาดหรือเข็มกลัดชิ้นแรก จะมีเครดิตผู้ออกแบบต่อจากเครดิตรูปภาพ อยู่บนสุดเสมอและติดไปกับรูปทุกครั้ง"),
  picture: () => T("Your picture", "你的圖片", "รูปของคุณ"),
  saved: (f) => T("Saved to Downloads: {0}", "已存到下載：{0}", "บันทึกไว้ในดาวน์โหลดแล้ว: {0}", f), savedToast: () => T("Saved to Downloads", "已存到下載", "บันทึกไว้ในดาวน์โหลดแล้ว"),
  failed: () => T("Couldn't save it", "沒辦法存", "บันทึกไม่ได้"), again: () => T("Download again", "再下載一次", "ดาวน์โหลดอีกครั้ง"),
  added: (n) => T("Added {0}", "加上了{0}", "เพิ่ม{0}แล้ว", n), removed: (n) => T("Took off {0}", "拿掉了{0}", "เอา{0}ออกแล้ว", n),
  photoCredit: (n) => T("Sticker from a photo by {0}", "貼圖取自 {0} 的照片", "สติกเกอร์จากรูปของ {0}", n),
  // Myra's design credit (approved wording, 27 Oct; the Thai waits for a native check: beta)
  decoCredit: (n) => T("Doodles & pins by {0}", "塗鴉與徽章設計：{0}", "ลายวาดและเข็มกลัดออกแบบโดย {0}", n),
  pinLbl: (n) => T("{0} (pin)", "{0}（徽章）", "{0} (เข็มกลัด)", n),
};
const CREDIT_NAME = "alitasdepollos"; // credits.json people.alitasdepollo.name (read when the app has it, below)

// the doodle styles, and the names of what's in the tray
const DS_NAMES = { kawaii: ["Kawaii flat", "可愛扁平", "คาวาอิแบน"], "kawaii-soft": ["Kawaii soft", "柔和可愛", "คาวาอิละมุน"], "kawaii-pop": ["Kawaii pop", "普普可愛", "คาวาอิป๊อป"],
  sticker: ["Die-cut sticker", "割線貼紙", "สติกเกอร์ไดคัท"], plush: ["Chibi plush", "Q版絨毛", "ตุ๊กตาจิบิ"], neon: ["Neon", "霓虹", "นีออน"], pixel: ["Pixel", "像素", "พิกเซล"],
  riso: ["Riso print", "孔版印刷", "ริโซพริ้นท์"], marker: ["Marker & crayon", "麥克筆蠟筆", "ปากกาเมจิกและสีเทียน"] };
const NAMES = { whale: ["Whale", "鯨魚", "วาฬ"], seal: ["Seal (Maewnam)", "小海豹（Maewnam）", "แมวน้ำ (Maewnam)"], "ws-bike": ["Maewnam's yellow bicycle", "Maewnam 的黃色腳踏車", "จักรยานสีเหลืองของแมวน้ำ"],
  vespa: ["Yellow Vespa", "黃色偉士牌", "เวสป้าสีเหลือง"], sunearth: ["Sun & Earth", "太陽和地球", "ดวงอาทิตย์กับโลก"], "s235-alien": ["Aylin's alien", "Aylin 的外星人", "มนุษย์ต่างดาวของ Aylin"],
  headphones: ["Headphones", "耳機", "หูฟัง"], ballet: ["Ballet shoes", "芭蕾舞鞋", "รองเท้าบัลเลต์"], "mz-film": ["Film camera", "底片相機", "กล้องฟิล์ม"], "wh-gem": ["Rhinestone", "水鑽", "เพชรเทียม"],
  milk: ["Milk carton", "牛奶盒", "กล่องนม"], "ml-logo": ["MilkLove heart", "MilkLove 愛心", "หัวใจ MilkLove"], camera: ["Camera", "相機", "กล้องถ่ายรูป"], "ws-ajarn": ["Ajarn Maewnam", "Maewnam 教授", "อาจารย์แมวน้ำ"],
  basket: ["Grocery basket", "購物籃", "ตะกร้าจ่ายตลาด"], calculator: ["Calculator", "計算機", "เครื่องคิดเลข"], dress: ["Dress on a hanger", "衣架上的洋裝", "ชุดเดรสบนไม้แขวน"],
  "d-whale": ["Whale Store xoxo · whale", "Whale Store xoxo・鯨魚", "คุณวาฬร้านชำ · วาฬ"], "d-store": ["Whale Store xoxo · store sign", "Whale Store xoxo・店招", "คุณวาฬร้านชำ · ป้ายร้าน"],
  "d-235": ["23.5 · Sun & Earth", "23.5・太陽和地球", "23.5 · ดวงอาทิตย์กับโลก"], "d-vespa": ["23.5 · yellow Vespa", "23.5・黃色偉士牌", "23.5 · เวสป้าสีเหลือง"],
  "d-girl": ["Girl Rules · dress", "Girl Rules・洋裝", "Girl Rules · ชุดเดรส"], "d-girlhp": ["Girl Rules · headphones", "Girl Rules・耳機", "Girl Rules · หูฟัง"],
  "d-ditto": ["DITTO · ballet shoes", "DITTO・芭蕾舞鞋", "DITTO · รองเท้าบัลเลต์"], "d-zero": ["Magic of Zero · camera", "Magic of Zero・相機", "Magic of Zero · กล้องถ่ายรูป"],
  "d-whimsical": ["Whimsical House", "Whimsical House 見面會", "Whimsical House แฟนคอน"], "d-muv": ["MUVMUV", "MUVMUV", "MUVMUV"],
  milklove: ["MILKLOVE", "MILKLOVE 字樣", "MILKLOVE"], heart: ["Heart", "愛心", "หัวใจ"], star: ["Star", "星星", "ดาว"], smile: ["Smiley", "笑臉", "หน้ายิ้ม"], bolt: ["Lightning bolt", "閃電", "สายฟ้า"], check: ["Checkerboard", "棋盤格", "ลายตารางหมากรุก"] };
const nm3 = (row) => T(row[0], row[1], row[2]);
const nameOf = (id) => (NAMES[id] ? nm3(NAMES[id]) : id.replace(/^[a-z0-9]+-/, "").replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase()));
const dsName = (id) => (DS_NAMES[id] ? nm3(DS_NAMES[id]) : id);

// ---- what may be on a card (the spoiler rule) ----
let P = null; // doodles/placement.json
async function placement() {
  if (P) return P;
  P = window.__mlwhDoodles?.placement?.() || null;
  if (!P) { try { P = await (await fetch("doodles/placement.json")).json(); } catch { P = { motifs: [], badges: [], pins: [], cut: [] }; } }
  return P;
}
const isPinMotif = (id) => !!P && P.badges.includes(id);
const EXTRA = () => Object.entries(VIS.SPOT_EXTRA || {}).filter(([spot]) => spot !== "s_title").flatMap(([, ids]) => ids); // (camera + Ajarn Maewnam; the Stickers title's dress stays there)
/** May this motif be shown on a card now? (the visible set, the two chosen extras, and each pin earned) */
const motifOk = (id) => VIS.ok(id, null, isPinMotif) || EXTRA().includes(id);
/** The tray's doodles: Myra's 12 wall motifs first (her order), then the extras, then the doodles of the pins earned. */
export function trayDoodles(p = P) {
  if (!p) return [];
  const first = [...VIS.MOTIFS, ...EXTRA()].filter((id) => p.motifs.includes(id));
  return [...new Set([...first, ...p.motifs.filter((id) => motifOk(id))])];
}
/** May this pin (doodles/pins/<id>.svg) be on a card now? Only once it's earned (the pins engine's setEarned). */
const pinOk = (id) => !!P && P.pins.includes(id) && (VIS.showAll || VIS.earned().includes(id));
/** The tray's pins: { drama: the series pins earned, classic: the classic pins earned }. */
export function trayPins(p = P) {
  if (!p) return { drama: [], classic: [] };
  const got = p.pins.filter((id) => VIS.showAll || VIS.earned().includes(id));
  return { drama: got.filter((id) => id.startsWith("d-")), classic: got.filter((id) => !id.startsWith("d-")) };
}
/** Is a saved decoration drawable now? */
export function allowed(it, p = P) {
  if (!p || !it) return false;
  if (it.style === "badge") return pinOk(it.motif); // (a pin; an old badge-styled motif isn't drawn any more, but stays saved)
  return p.motifs.includes(it.motif) && motifOk(it.motif);
}

// ---- which drawing: "auto" follows the doodle style in use (Settings › Look, else the app style's own) ----
const isDark = () => matchMedia("(prefers-color-scheme: dark)").matches || R.dataset.mode === "dark";
const appStyle = () => R.dataset.style || "f";
function autoStyle() { const lk = currentLook(); return lk.doodleStyle && lk.doodleStyle !== "auto" ? lk.doodleStyle : LOOK.OWN_DOODLES[appStyle()] || "kawaii-soft"; }
const resolveStyle = (st) => { const s = st === "auto" || !st ? autoStyle() : st; return (s === "marker" || s === "riso") && isDark() ? s + "-dark" : s; };
export function fileOf(it) {
  if (it.style === "badge") return `doodles/pins/${it.motif}.svg`;
  return `doodles/${resolveStyle(it.style)}/${it.motif}.svg`;
}

// ---- the saved layouts (settings key cardDeco; the page keeps a copy too, for a desktop app that doesn't keep it yet) ----
let mine = null; // this session's changes win until the app's status has them
const LS = "mlwh:cardDeco";
export function layouts() {
  if (mine) return mine;
  const st = state.st;
  if (st && "cardDeco" in st) return RULES.normalize(st.cardDeco);
  try { return RULES.normalize(JSON.parse(localStorage.getItem(LS) || "null")); } catch { return {}; }
}
function persist(kind, list) {
  mine = RULES.merge(layouts(), { [kind]: list });
  try { localStorage.setItem(LS, JSON.stringify(mine)); } catch { /* a private window: just for now */ }
  HOST?.settingText?.("cardDeco", JSON.stringify({ [kind]: RULES.list(list) }));
}

// ---- pictures ----
const imgCache = new Map();
function loadImg(src, cors) {
  const key = (cors ? "c:" : "") + src;
  if (imgCache.has(key)) return imgCache.get(key);
  const p = new Promise((res, rej) => { const i = new Image(); if (cors) i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = rej; i.src = src; });
  imgCache.set(key, p); p.catch(() => imgCache.delete(key));
  return p;
}
// The sticker comes from the photo library (mlwh://photos, another origin): asked for with CORS, so the PNG can be
// made on the page; where the app doesn't allow that yet, plainly (the picture is then saved from the window instead).
async function stickerImg(src) {
  try { return { img: await loadImg(src, true), clean: true }; } catch { /* no CORS for it */ }
  try { return { img: await loadImg(src, false), clean: false }; } catch { return { img: null, clean: true }; }
}
const ICON = {
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13"/>',
  sparkles: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  flip: '<path d="m3 7 5 5-5 5V7"/><path d="m21 7-5 5 5 5V7"/><path d="M12 20v2"/><path d="M12 14v2"/><path d="M12 8v2"/><path d="M12 2v2"/>',
  front: '<rect x="8" y="8" width="8" height="8" rx="2"/><path d="M4 10a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2"/><path d="M14 20a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2"/>',
  back: '<rect x="14" y="14" width="8" height="8" rx="2"/><rect x="2" y="2" width="8" height="8" rx="2"/><path d="M7 14v1a2 2 0 0 0 2 2h1"/><path d="M14 7h1a2 2 0 0 1 2 2v1"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  left: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>', right: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  rotate: '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
  resize: '<path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/>',
  eraser: '<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>',
};
const NS = "http://www.w3.org/2000/svg";
function ico(name) { // (Lucide's paths, built as SVG nodes)
  const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true"); s.setAttribute("class", "deco-ico");
  const t = document.createElement("template"); t.innerHTML = `<svg xmlns="${NS}">${ICON[name]}</svg>`;
  s.append(...t.content.firstChild.childNodes);
  return s;
}
function btn(cls, icon, label, fn, { iconOnly = false, after = false } = {}) {
  const b = el("button", { type: "button", className: "btn " + cls });
  const sp = iconOnly ? null : el("span", { textContent: label });
  b.append(...(after ? [sp, ico(icon)] : [ico(icon), sp]).filter(Boolean));
  if (iconOnly) { b.setAttribute("aria-label", label); b.title = label; }
  if (fn) b.addEventListener("click", fn);
  return b;
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** The PNG's file name, as Save to Downloads always named it. */
export const fileName = (what) => `ML WorkHelp - ${String(what || "My week").replace(/[\\/:*?"<>|]/g, "").slice(0, 60)}.png`;

/**
 * Open Make a picture. o: { kinds: [[id, label]], kind (the one to start on), model(kind) → the card's words
 *   (card-draw.js drawBase), pool: the stickers to pick from, urlOf(s), creditOf(s) (the photographer's name),
 *   what(kind) (the file name's words), onKind(kind) }
 */
export async function openPicture(o) {
  await placement();
  const S = { step: 1, kind: o.kind || "week", tab: "doodles", dstyle: "auto", snap: true, sel: -1, pick: null, ten: [], saving: false, savedAs: null };
  const all = layouts();
  const lay = {}, hidden = {};
  for (const k of RULES.KINDS) { const l = all[k] || []; lay[k] = l.filter((it) => allowed(it)); hidden[k] = l.filter((it) => !allowed(it)); }
  const hist = Object.fromEntries(RULES.KINDS.map((k) => [k, { undo: [], redo: [] }]));
  const items = () => lay[S.kind];
  let zones = { text: [], sticker: null, credit: null }, sticker = { img: null, clean: true }, lastHas = null;

  const shuffle10 = () => { S.ten = o.pool.slice().sort(() => Math.random() - 0.5).slice(0, 10); S.pick = S.ten[0] || null; };
  shuffle10();

  // ---- the box ----
  const { box, close } = modal(L("Make a picture", "存成圖片"));
  box.classList.add("deco-box");
  const head = box.querySelector(".box-head");
  const steps = el("ol", { className: "deco-steps" });
  head.firstChild.after(steps);
  const live = el("div", { className: "deco-sr", "aria-live": "polite" });
  const announce = (s) => { live.textContent = ""; setTimeout(() => { live.textContent = s; }, 30); };

  const cvBase = el("canvas", { className: "deco-cv", "aria-hidden": "true" }), cvTop = el("canvas", { className: "deco-cv", "aria-hidden": "true" });
  const itemsBox = el("div", { className: "deco-items" }), guides = el("div", { className: "deco-guides", "aria-hidden": "true" }), ui = el("div", { className: "deco-ui" });
  const stageIn = el("div", { className: "deco-stage-in" }, cvBase, itemsBox, cvTop, guides, ui);
  const stage = el("div", { className: "deco-stage", role: "img" }, stageIn);
  const bUndo = btn("small icon", "undo", W3.undo(), () => undo(), { iconOnly: true }), bRedo = btn("small icon", "redo", W3.redo(), () => redo(), { iconOnly: true });
  const bShuffle = btn("small deco-shuf", "sparkles", W3.shuffle(), () => shuffleLayout()), bClear = btn("small ghost", "eraser", W3.clear(), () => change(() => { lay[S.kind] = []; S.sel = -1; }, true));
  const tools = el("div", { className: "deco-tools" }, bUndo, bRedo, bShuffle, bClear);
  const cap = el("p", { className: "deco-cap", "aria-live": "polite" }), selbar = el("div", { className: "deco-selbar" });
  const stageCol = el("div", { className: "deco-stagecol" }, tools, stage, cap, selbar);

  // step 1: the card
  const kinds = el("div", { className: "deco-chips", role: "radiogroup", "aria-label": W3.which() });
  const strip = el("div", { className: "share-strip", role: "radiogroup", "aria-label": W3.sticker() });
  const again = el("button", { type: "button", className: "btn small", textContent: W3.shuffle10() });
  again.addEventListener("click", () => { shuffle10(); drawStep1(); redrawCard(); });
  const hasDeco = el("p", { className: "muted small" });
  const s1 = el("div", { className: "deco-pane" }, el("b", { textContent: W3.which() }), kinds,
    o.pool.length ? el("div", { className: "spread" }, el("b", { textContent: W3.sticker() }), again) : null, o.pool.length ? strip : null,
    o.pool.length ? el("p", { className: "muted small", textContent: W3.stickersNote() }) : null, hasDeco);
  // step 2: the tray
  const tabs = el("div", { className: "deco-tabs", role: "tablist" });
  const swatches = el("div", { className: "deco-swatches", role: "radiogroup", "aria-label": W3.dstyle() }), dsLabel = el("span", { className: "muted small" });
  const motifTiles = el("div", { className: "deco-tiles" }), allStyle = el("button", { type: "button", className: "deco-link", textContent: W3.allStyle() });
  allStyle.addEventListener("click", () => change(() => { for (const it of items()) if (it.style !== "badge") it.style = S.dstyle; }, true));
  const tDoodles = el("div", { className: "deco-tab", role: "tabpanel", id: "deco-t-doodles", "aria-labelledby": "deco-tab-doodles" },
    el("div", { className: "spread" }, el("b", { textContent: W3.dstyle() }), dsLabel), swatches, motifTiles, allStyle);
  const pinGroups = el("div", { className: "deco-pingroups" });
  const tPins = el("div", { className: "deco-tab", role: "tabpanel", id: "deco-t-pins", "aria-labelledby": "deco-tab-pins" }, pinGroups);
  const snapBox = el("input", { type: "checkbox", checked: true });
  snapBox.addEventListener("change", () => { S.snap = snapBox.checked; });
  const s2 = el("div", { className: "deco-pane" }, tabs, tDoodles, tPins, el("p", { className: "muted small", textContent: W3.trayHint() + " " + W3.moreNote() }),
    el("label", { className: "deco-snap" }, snapBox, el("span", { textContent: W3.snap() }), el("span", { className: "muted small", textContent: W3.snapHint() })),
    el("p", { className: "muted small", textContent: W3.creditNote() }));
  // step 3: download
  const fname = el("p", { className: "deco-fname" }), saveAgain = btn("primary", "download", W3.again(), () => save());
  const s3 = el("div", { className: "deco-pane" }, el("b", { textContent: W3.picture() }), fname, saveAgain, el("p", { className: "muted small", textContent: W3.savedNote() }), el("p", { className: "muted small", textContent: W3.kept() }));
  const side = el("div", { className: "deco-side" }, s1, s2, s3);
  const foot = el("div", { className: "deco-actions" });
  box.append(el("div", { className: "deco-body" }, stageCol, side), foot, live);
  // (the box's own keys: undo / redo while decorating)
  box.addEventListener("keydown", (e) => {
    if (S.step === 2 && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
  });

  // ---- the card on the stage ----
  const dark = isDark(), look = cardLook(appStyle(), dark, cssLook());
  const lang = zh ? "zh" : th ? "th" : "en";
  let creditName = CREDIT_NAME;
  try { const c = await HOST?.photoCredits?.(); const n = c?.people?.alitasdepollo?.name; if (n) creditName = n; } catch { /* the name we know */ }
  try { await Promise.all(fontList(look).map((f) => document.fonts.load(f, "ML WorkHelp 0123 สวัสดี 我的這一週").catch(() => null))); } catch { /* the system's fonts */ }
  const opts = (scale) => ({ look, dark, lang, kind: S.kind, model: o.model(S.kind), sticker: sticker.img, scale,
    photoLine: S.pick ? W3.photoCredit(o.creditOf(S.pick)) : null, decoLine: RULES.credited(items()) ? W3.decoCredit(creditName) : null });
  function setupCanvas(cv) { const d = Math.max(2, window.devicePixelRatio || 1) * 1.15; cv.width = W * d; cv.height = H * d; const c = cv.getContext("2d"); c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, W, H); return { c, d }; }
  function drawCanvases() {
    const b = setupCanvas(cvBase), op = opts(b.d);
    const z = drawBase(b.c, op);
    const t = setupCanvas(cvTop);
    zones = { text: z.text, sticker: z.sticker, credit: drawCredits(t.c, op) };
    lastHas = !!op.decoLine;
    stage.dataset.credit = lastHas ? "1" : "0";
    stage.setAttribute("aria-label", [op.model.kicker, op.model.big, ...(op.model.lines || []), op.photoLine, op.decoLine].filter(Boolean).join(" · "));
  }
  async function redrawCard() {
    sticker = S.pick ? await stickerImg(o.urlOf(S.pick)) : { img: null, clean: true };
    drawCanvases(); drawItems(); drawCount();
  }

  // ---- the decorations ----
  function itemLabel(it) { return it.style === "badge" ? W3.pinLbl(nameOf(it.motif)) : `${nameOf(it.motif)} (${dsName(resolveStyle(it.style).replace(/-dark$/, ""))})`; }
  function placeEl(e, it) { const s = BASE * it.scale; e.style.width = e.style.height = s + "px"; e.style.left = it.x * W + "px"; e.style.top = it.y * H + "px"; e.style.rotate = it.rot + "deg"; }
  function drawItems() {
    itemsBox.replaceChildren(...items().map((it, i) => {
      const img = el("img", { src: fileOf(it), alt: "", draggable: false });
      if (it.flip) img.classList.add("flip");
      if (resolveStyle(it.style) === "pixel") img.classList.add("px");
      const e = el("div", { className: "deco-it" + (it.style === "badge" ? " badge" : ""), tabIndex: S.step === 2 ? 0 : -1, role: "button", "aria-label": W3.itemLabel(itemLabel(it)), "data-i": String(i) }, img);
      placeEl(e, it);
      e.addEventListener("pointerdown", onItemDown); e.addEventListener("keydown", onItemKey);
      e.addEventListener("focus", () => { if (S.sel !== i) { S.sel = i; drawSel(); } });
      return e;
    }));
    drawSel();
  }
  function frameFor(f, it) { const s = BASE * it.scale + 10; f.style.width = f.style.height = s + "px"; f.style.left = it.x * W + "px"; f.style.top = it.y * H + "px"; f.style.rotate = it.rot + "deg"; }
  function drawSel() {
    const it = items()[S.sel];
    ui.replaceChildren();
    if (S.step === 2 && it) {
      const f = el("div", { className: "deco-frame" }); frameFor(f, it);
      const rs = el("span", { className: "h rs", role: "presentation", title: W3.resize() }, ico("resize")), ro = el("span", { className: "h ro", role: "presentation", title: W3.rotate() }, ico("rotate"));
      rs.addEventListener("pointerdown", (e) => onHandle(e, "size")); ro.addEventListener("pointerdown", (e) => onHandle(e, "rot"));
      f.append(el("span", { className: "stem" }), rs, ro); ui.append(f);
    }
    drawSelbar();
  }
  function drawSelbar() {
    const it = items()[S.sel];
    if (S.step !== 2) { selbar.replaceChildren(); return; }
    if (!it) { selbar.replaceChildren(el("p", { className: "muted small", textContent: W3.selNone() })); return; }
    const i = S.sel, n = items().length;
    const mk = (icon, label, fn, dis) => { const b = btn("small", icon, label, fn); b.disabled = !!dis; return b; };
    selbar.replaceChildren(
      mk("flip", W3.flip(), () => change(() => { it.flip = !it.flip; })),
      mk("front", W3.fwd(), () => change(() => { const l = items(); [l[i], l[i + 1]] = [l[i + 1], l[i]]; S.sel = i + 1; }), i >= n - 1),
      mk("back", W3.bwd(), () => change(() => { const l = items(); [l[i], l[i - 1]] = [l[i - 1], l[i]]; S.sel = i - 1; }), i <= 0),
      mk("trash", W3.del(), () => removeSel()));
  }

  // ---- history (each kind its own) and saving ----
  const snap = () => JSON.stringify(items());
  const keep = () => persist(S.kind, [...items(), ...hidden[S.kind]].slice(0, CAP));
  function change(fn, keepSel) {
    const before = snap(); fn();
    if (snap() !== before) { hist[S.kind].undo.push(before); if (hist[S.kind].undo.length > 60) hist[S.kind].undo.shift(); hist[S.kind].redo = []; keep(); }
    drawItems(); drawCount(); if (!keepSel) focusSel();
  }
  function commitFrom(before) { if (snap() !== before) { hist[S.kind].undo.push(before); hist[S.kind].redo = []; keep(); } drawCount(); }
  function undo() { const h = hist[S.kind]; if (!h.undo.length) return; h.redo.push(snap()); lay[S.kind] = JSON.parse(h.undo.pop()); S.sel = -1; keep(); drawItems(); drawCount(); }
  function redo() { const h = hist[S.kind]; if (!h.redo.length) return; h.undo.push(snap()); lay[S.kind] = JSON.parse(h.redo.pop()); S.sel = -1; keep(); drawItems(); drawCount(); }
  function focusSel() { const e = itemsBox.querySelector(`[data-i="${S.sel}"]`); if (e && document.activeElement !== e && S.step === 2) e.focus({ preventScroll: true }); }

  // ---- adding (refused past the cap) ----
  function add(spec, at) {
    if (items().length >= CAP) { announce(W3.full()); drawCount(true); return false; }
    if (!allowed({ motif: spec.motif, style: spec.style })) return false;
    const it = RULES.item({ motif: spec.motif, style: spec.style, x: 0.5, y: 0.5, scale: spec.style === "badge" ? 0.8 : 1, rot: Math.round(Math.random() * 16 - 8), flip: false });
    const p = at || freeSpot(it.scale, items()); it.x = p.x; it.y = p.y;
    change(() => { items().push(it); S.sel = items().length - 1; });
    announce(W3.added(itemLabel(it)));
    return true;
  }
  function removeSel() {
    const it = items()[S.sel]; if (!it) return;
    const label = itemLabel(it);
    change(() => { items().splice(S.sel, 1); S.sel = -1; });
    announce(W3.removed(label));
    itemsBox.querySelector(".deco-it")?.focus({ preventScroll: true });
  }
  function drawCount(flash) {
    const n = items().length;
    if ((n > 0) !== lastHas && lastHas !== null) drawCanvases(); // the design credit comes and goes with the first decoration
    cap.textContent = n >= CAP ? W3.full() : W3.cap(n);
    cap.classList.toggle("full", n >= CAP);
    if (flash) cap.animate?.([{ transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "none" }], { duration: 240 });
    for (const b of box.querySelectorAll(".deco-tile")) b.disabled = n >= CAP;
    bUndo.disabled = !hist[S.kind].undo.length; bRedo.disabled = !hist[S.kind].redo.length; bClear.disabled = !n;
    allStyle.disabled = !items().some((it) => it.style !== "badge" && it.style !== S.dstyle);
    hasDeco.textContent = n ? W3.has(n) : "";
  }

  // ---- where things fit: off the words and the credit, liking corners and edges ----
  const ov = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const boxOf = (x, y, scale) => { const s = BASE * scale * 0.86; return { x: x * W - s / 2, y: y * H - s / 2, w: s, h: s }; };
  function score(x, y, scale, others, corner) {
    const b = boxOf(x, y, scale), area = b.w * b.h;
    let bad = 0;
    for (const z of zones.text) bad += (ov(b, z) / area) * 6;
    // (the credit's place even before it shows: it comes with the first decoration)
    const cr = zones.credit || { x: 14, y: H - 50, w: 230, h: 40 };
    bad += (ov(b, { x: cr.x - 6, y: cr.y - 6, w: cr.w + 12, h: cr.h + 12 }) / area) * 8;
    if (zones.sticker) { const s = zones.sticker; bad += (ov(b, { x: s.x + s.w * 0.15, y: s.y + s.h * 0.12, w: s.w * 0.7, h: s.h * 0.88 }) / area) * 3; }
    for (const ot of others) { bad += (ov(b, boxOf(ot.x, ot.y, ot.scale)) / area) * 5; const d = Math.hypot((ot.x - x) * W, (ot.y - y) * H); if (d < 80) bad += (80 - d) / 80; }
    const hs = (BASE * scale) / 2;
    if (x * W < hs * 0.4 || x * W > W - hs * 0.4 || y * H < hs * 0.4 || y * H > H - hs * 0.4) bad += 4;
    bad += Math.min(Math.min(x * W, W - x * W, y * H, H - y * H), 90) / 300;
    if (corner) bad += Math.min(Math.hypot(x * W, y * H), Math.hypot(W - x * W, y * H), Math.hypot(x * W, H - y * H), Math.hypot(W - x * W, H - y * H)) / 400;
    return bad;
  }
  function freeSpot(scale, others, corner) {
    const c = [];
    for (let x = 0.06; x <= 0.95; x += 0.03) for (let y = 0.07; y <= 0.93; y += 0.04) c.push({ x, y, s: score(x, y, scale, others, corner) });
    c.sort((a, b) => a.s - b.s);
    const p = c[Math.floor(Math.random() * Math.min(4, c.length))];
    return { x: Math.round(p.x * 1000) / 1000, y: Math.round(p.y * 1000) / 1000 };
  }
  // "Shuffle a cute layout": 3–4 things, a bigger "hero" on a corner, the rest smaller round the edge, alternating tilts
  function shuffleLayout() {
    const n = 3 + (Math.random() < 0.5 ? 1 : 0);
    const motifs = trayDoodles().sort(() => Math.random() - 0.5);
    const B = trayPins(), pins = [...B.drama, ...B.classic].sort(() => Math.random() - 0.5);
    const nb = S.tab === "pins" ? 2 : 1, list = [];
    for (let k = 0; k < n; k++) {
      const badge = k >= n - nb && pins.length;
      const scale = k === 0 ? 1.15 + Math.random() * 0.15 : badge ? 0.7 + Math.random() * 0.12 : 0.72 + Math.random() * 0.18;
      const p = freeSpot(scale, list, k === 0), sign = k % 2 ? -1 : 1;
      list.push(RULES.item({ motif: badge ? pins[k % pins.length] : motifs[k % motifs.length], style: badge ? "badge" : S.dstyle, x: p.x, y: p.y, scale, rot: sign * Math.round(6 + Math.random() * 10), flip: !badge && Math.random() < 0.3 }));
    }
    change(() => { lay[S.kind] = list.slice(0, CAP); S.sel = -1; }, true);
  }

  // ---- snapping ----
  function snapPos(it, x, y, free) {
    guides.replaceChildren();
    if (!S.snap || free) return [x, y];
    const hs = (BASE * it.scale) / 2, px = x * W, py = y * H, others = items().filter((ot) => ot !== it);
    const xs = [[INSET + hs, INSET], [W - INSET - hs, W - INSET], [hs, 0], [W - hs, W], [W / 2, W / 2], ...others.map((ot) => [ot.x * W, ot.x * W])];
    const ys = [[INSET + hs, INSET], [H - INSET - hs, H - INSET], [hs, 0], [H - hs, H], [H / 2, H / 2], ...others.map((ot) => [ot.y * H, ot.y * H])];
    let nx = px, ny = py, gx = null, gy = null, bx = SNAP + 1, by = SNAP + 1;
    for (const [c, line] of xs) { const d = Math.abs(px - c); if (d < bx) { bx = d; nx = c; gx = line; } }
    for (const [c, line] of ys) { const d = Math.abs(py - c); if (d < by) { by = d; ny = c; gy = line; } }
    if (bx > SNAP) { nx = px; gx = null; } if (by > SNAP) { ny = py; gy = null; }
    if (gx != null) { const g = el("i", { className: "v" }); g.style.left = gx - 0.75 + "px"; guides.append(g); }
    if (gy != null) { const g = el("i", { className: "h" }); g.style.top = gy - 0.75 + "px"; guides.append(g); }
    return [nx / W, ny / H];
  }

  // ---- pointer: moving, sizing, turning ----
  const stageXY = (e) => { const r = itemsBox.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
  function onItemDown(e) {
    if (S.step !== 2 || e.button > 0) return;
    const i = +e.currentTarget.dataset.i, it = items()[i];
    S.sel = i; drawSel();
    const node = e.currentTarget; node.setPointerCapture(e.pointerId); node.classList.add("dragging");
    const before = snap(), [sx, sy] = stageXY(e), ox = it.x, oy = it.y;
    const move = (ev) => { const [x, y] = stageXY(ev); [it.x, it.y] = snapPos(it, clamp(ox + x - sx, 0, 1), clamp(oy + y - sy, 0, 1), ev.altKey); placeEl(node, it); const f = ui.querySelector(".deco-frame"); if (f) frameFor(f, it); };
    const up = () => { node.removeEventListener("pointermove", move); node.removeEventListener("pointerup", up); node.removeEventListener("pointercancel", up); node.classList.remove("dragging"); guides.replaceChildren();
      it.x = Math.round(it.x * 1000) / 1000; it.y = Math.round(it.y * 1000) / 1000; commitFrom(before); drawSel(); node.focus({ preventScroll: true }); };
    node.addEventListener("pointermove", move); node.addEventListener("pointerup", up); node.addEventListener("pointercancel", up);
    e.preventDefault();
  }
  function onHandle(e, mode) {
    const it = items()[S.sel]; if (!it) return;
    e.stopPropagation(); e.preventDefault();
    const h = e.currentTarget; h.setPointerCapture(e.pointerId);
    const before = snap(), r = itemsBox.getBoundingClientRect(), cx = r.left + it.x * r.width, cy = r.top + it.y * r.height;
    const d0 = Math.hypot(e.clientX - cx, e.clientY - cy) || 1, a0 = Math.atan2(e.clientY - cy, e.clientX - cx), s0 = it.scale, r0 = it.rot;
    const node = itemsBox.querySelector(`[data-i="${S.sel}"]`);
    const move = (ev) => {
      if (mode === "size") it.scale = clamp(Math.round(s0 * (Math.hypot(ev.clientX - cx, ev.clientY - cy) / d0) * 100) / 100, RULES.MIN_S, RULES.MAX_S);
      else {
        let a = r0 + ((Math.atan2(ev.clientY - cy, ev.clientX - cx) - a0) * 180) / Math.PI;
        a = ((a + 540) % 360) - 180;
        const near = Math.round(a / 15) * 15;
        if (!ev.altKey && (Math.abs(a - near) < 4 || ev.shiftKey)) a = near;
        it.rot = Math.round(a);
      }
      placeEl(node, it); const f = ui.querySelector(".deco-frame"); if (f) frameFor(f, it);
    };
    const up = () => { h.removeEventListener("pointermove", move); h.removeEventListener("pointerup", up); h.removeEventListener("pointercancel", up); commitFrom(before); drawSel(); node?.focus({ preventScroll: true }); };
    h.addEventListener("pointermove", move); h.addEventListener("pointerup", up); h.addEventListener("pointercancel", up);
  }
  itemsBox.addEventListener("pointerdown", (e) => { if (e.target === itemsBox && S.step === 2) { S.sel = -1; drawSel(); } });
  function onItemKey(e) {
    const it = items()[S.sel]; if (!it) return;
    const step = e.shiftKey ? 0.05 : 0.01, k = e.key;
    const map = {
      ArrowLeft: () => { it.x = clamp(it.x - step, 0, 1); }, ArrowRight: () => { it.x = clamp(it.x + step, 0, 1); },
      ArrowUp: () => { it.y = clamp(it.y - step * (W / H), 0, 1); }, ArrowDown: () => { it.y = clamp(it.y + step * (W / H), 0, 1); },
      "[": () => { it.rot = Math.max(-180, it.rot - 15); }, "]": () => { it.rot = Math.min(180, it.rot + 15); },
      "+": () => { it.scale = clamp(it.scale + 0.1, RULES.MIN_S, RULES.MAX_S); }, "=": () => { it.scale = clamp(it.scale + 0.1, RULES.MIN_S, RULES.MAX_S); },
      "-": () => { it.scale = clamp(it.scale - 0.1, RULES.MIN_S, RULES.MAX_S); }, f: () => { it.flip = !it.flip; }, F: () => { it.flip = !it.flip; },
    };
    if (map[k]) { e.preventDefault(); change(() => { map[k](); const n = RULES.item(it); Object.assign(it, n); }); return; }
    if (k === "Delete" || k === "Backspace") { e.preventDefault(); removeSel(); return; }
    if (k === "Escape") { e.stopPropagation(); S.sel = -1; drawSel(); e.currentTarget.blur(); }
  }

  // ---- the tray ----
  function trayTile(spec, label) {
    const b = el("button", { type: "button", className: "deco-tile", "aria-label": label, title: label }, el("img", { src: fileOf(spec), alt: "", draggable: false }));
    if (spec.style !== "badge" && resolveStyle(spec.style) === "pixel") b.firstChild.classList.add("px");
    b.addEventListener("pointerdown", (e) => trayDown(e, spec, b));
    b.addEventListener("click", (e) => { if (b.dataset.dragged) { delete b.dataset.dragged; return; } if (e.detail === 0) add(spec); }); // (the keyboard)
    return b;
  }
  function trayDown(e, spec, b) {
    if (e.button > 0 || b.disabled) return;
    b.setPointerCapture(e.pointerId);
    const x0 = e.clientX, y0 = e.clientY; let ghost = null;
    const over = (ev) => { const r = stage.getBoundingClientRect(); return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom; };
    const move = (ev) => {
      if (!ghost && Math.hypot(ev.clientX - x0, ev.clientY - y0) > 5) {
        ghost = el("img", { className: "deco-ghost", src: b.querySelector("img").src, alt: "" });
        const s = BASE * 1.15 * (spec.style === "badge" ? 0.8 : 1); ghost.style.width = ghost.style.height = s + "px";
        document.body.append(ghost);
      }
      if (ghost) { ghost.style.left = ev.clientX + "px"; ghost.style.top = ev.clientY + "px"; stage.classList.toggle("drop", over(ev)); }
    };
    const up = (ev) => {
      b.removeEventListener("pointermove", move); b.removeEventListener("pointerup", up); b.removeEventListener("pointercancel", up);
      stage.classList.remove("drop");
      if (ghost) { ghost.remove(); b.dataset.dragged = "1"; if (ev.type === "pointerup" && over(ev)) { const [x, y] = stageXY(ev); add(spec, { x: clamp(x, 0, 1), y: clamp(y, 0, 1) }); } }
      else if (ev.type === "pointerup") { b.dataset.dragged = "1"; add(spec); }
    };
    b.addEventListener("pointermove", move); b.addEventListener("pointerup", up); b.addEventListener("pointercancel", up);
  }
  function drawTray() {
    tabs.replaceChildren(...[["doodles", W3.doodles()], ["pins", W3.pins()]].map(([k, label]) => {
      const b = el("button", { type: "button", role: "tab", id: "deco-tab-" + k, "aria-selected": String(S.tab === k), "aria-controls": "deco-t-" + k, textContent: label });
      b.addEventListener("click", () => { S.tab = k; drawTray(); });
      return b;
    }));
    tDoodles.hidden = S.tab !== "doodles"; tPins.hidden = S.tab !== "pins";
    const auto = autoStyle();
    const sw = [{ id: "auto", label: W3.match(dsName(auto)) }, ...RULES.DOODLE_STYLES.map((d) => ({ id: d, label: dsName(d) }))];
    swatches.replaceChildren(...sw.map((s) => {
      const b = el("button", { type: "button", role: "radio", className: s.id === "auto" ? "auto" : "", "aria-checked": String(S.dstyle === s.id), "aria-label": s.label, title: s.label },
        el("img", { src: fileOf({ motif: "whale", style: s.id }), alt: "" }));
      b.addEventListener("click", () => { S.dstyle = s.id; drawTray(); });
      return b;
    }));
    dsLabel.textContent = S.dstyle === "auto" ? W3.match(dsName(auto)) : dsName(S.dstyle);
    motifTiles.replaceChildren(...trayDoodles().map((id) => trayTile({ motif: id, style: S.dstyle }, nameOf(id))));
    const B = trayPins();
    const groups = [["drama", W3.pinsDrama()], ["classic", W3.pinsClassic()]].filter(([g]) => B[g].length);
    pinGroups.replaceChildren(...(groups.length ? groups.flatMap(([g, label]) => [el("p", { className: "deco-pin-h", textContent: label }), el("div", { className: "deco-tiles pins" }, B[g].map((id) => trayTile({ motif: id, style: "badge" }, nameOf(id))))])
      : [el("p", { className: "muted small deco-nopins", textContent: W3.noPins() })]));
    drawCount();
  }
  // a pin earned while the box is open: its doodle joins the tray
  const offVis = VIS.onChange(() => { if (box.isConnected) drawTray(); });

  // ---- step 1 ----
  function drawStep1() {
    kinds.replaceChildren(...o.kinds.map(([k, label]) => {
      const b = el("button", { type: "button", className: "chip" + (k === S.kind ? " on" : ""), role: "radio", "aria-checked": String(k === S.kind), textContent: label });
      b.addEventListener("click", () => { S.kind = k; S.sel = -1; o.onKind?.(k); drawStep1(); drawCanvases(); drawItems(); drawCount(); drawTray(); });
      return b;
    }));
    strip.replaceChildren(...S.ten.map((s) => {
      const b = el("button", { type: "button", className: s === S.pick ? "on" : "", role: "radio", "aria-checked": String(s === S.pick), "aria-label": W3.photoCredit(o.creditOf(s)) }, el("img", { src: o.urlOf(s), alt: "" }));
      b.addEventListener("click", () => { S.pick = s; drawStep1(); redrawCard(); });
      return b;
    }));
  }

  // ---- steps, footer ----
  function drawSteps() {
    steps.replaceChildren(...[[1, W3.card()], [2, W3.deco()], [3, W3.down()]].map(([n, label]) => {
      const b = el("button", { type: "button", "aria-current": S.step === n ? "step" : null }, el("span", { className: "n", textContent: String(n) }), el("span", { textContent: label }));
      b.addEventListener("click", () => go(n));
      return el("li", {}, b);
    }));
    s1.hidden = S.step !== 1; s2.hidden = S.step !== 2; s3.hidden = S.step !== 3;
    tools.hidden = S.step !== 2; cap.hidden = S.step !== 2;
    stage.classList.toggle("view", S.step !== 2);
    box.dataset.step = String(S.step);
    if (S.step === 1) foot.replaceChildren(el("p", { className: "muted small left", textContent: W3.savedNote() }), btn("", "download", W3.download(), () => go(3)), btn("primary", "right", W3.next(), () => go(2), { after: true }));
    else if (S.step === 2) foot.replaceChildren(btn("ghost left", "left", W3.back(), () => go(1)), el("p", { className: "muted small", textContent: W3.savedNote() }), btn("primary", "download", W3.download(), () => go(3)));
    else foot.replaceChildren(btn("ghost left", "left", W3.keep(), () => go(2)));
  }
  async function go(n) {
    S.step = n; if (n !== 2) S.sel = -1;
    drawSteps(); drawItems(); drawCount();
    if (n === 2) itemsBox.querySelector(".deco-it")?.focus({ preventScroll: true });
    if (n === 3) await save();
  }

  // ---- the picture ----
  /** The PNG on a canvas at `scale` (2 = 880 × 620): the card, the decorations, then the credit on top. */
  async function renderPng(scale = 2) {
    const cv = document.createElement("canvas"); cv.width = W * scale; cv.height = H * scale;
    const c = cv.getContext("2d"); c.scale(scale, scale);
    const op = opts(scale);
    drawBase(c, op);
    c.save(); clipCard(c, look);
    for (const it of items()) {
      const s = BASE * it.scale, img = await loadImg(fileOf(it), false).catch(() => null);
      if (!img) continue;
      c.save(); c.translate(it.x * W, it.y * H); c.rotate((it.rot * Math.PI) / 180); if (it.flip) c.scale(-1, 1);
      if (it.style === "badge") { c.shadowColor = "rgba(0,0,0,.22)"; c.shadowOffsetY = 2 * scale; c.shadowBlur = 2 * scale; }
      if (resolveStyle(it.style) === "pixel") c.imageSmoothingEnabled = false;
      c.drawImage(img, -s / 2, -s / 2, s, s); c.restore();
    }
    c.restore();
    drawCredits(c, op);
    return cv;
  }
  const toBlob = (cv) => new Promise((res) => { try { cv.toBlob((b) => res(b), "image/png"); } catch { res(null); } });
  async function save() {
    if (S.saving) return;
    S.saving = true; saveAgain.disabled = true;
    const what = o.what(S.kind), name = fileName(what), decorated = items().length > 0;
    let file = null;
    try {
      const blob = sticker.clean ? await toBlob(await renderPng(2)) : null;
      if (blob && HOST?.savePng) file = await HOST.savePng(new Uint8Array(await blob.arrayBuffer()), what);
      else if (HOST?.savePicture) {
        // (the desktop app without savePng yet, or a sticker the page can't put in a PNG: the stage, from the window)
        stage.classList.add("capturing"); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const r = stageIn.getBoundingClientRect();
        file = await HOST.savePicture({ x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }, what);
        stage.classList.remove("capturing");
      } else if (blob) { // a browser: a download
        const u = URL.createObjectURL(blob), a = el("a", { href: u, download: name });
        document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); file = name;
      }
    } catch (e) { console.error("make a picture:", e); file = null; }
    S.saving = false; saveAgain.disabled = false; stage.classList.remove("capturing");
    S.savedAs = file;
    fname.textContent = file ? W3.saved(file) : W3.failed();
    toast(file ? W3.savedToast() : W3.failed());
    if (file) { HOST?.pins?.note?.("picture"); if (decorated) HOST?.pins?.note?.("decorated"); }
    return file;
  }

  // for the tests (and the integrator's preview)
  window.__mlwhCardDeco = {
    state: () => ({ step: S.step, kind: S.kind, n: items().length, items: JSON.parse(snap()), credit: stage.dataset.credit === "1", clean: sticker.clean, tray: trayDoodles(), pins: trayPins(), tiles: box.querySelectorAll(".deco-tile").length }),
    add: (motif, style = "auto") => add({ motif, style }), go, kind: (k) => kinds.querySelector(`button:nth-child(${o.kinds.findIndex(([x]) => x === k) + 1})`)?.click(),
    png: async () => { const cv = await renderPng(2); try { return { w: cv.width, h: cv.height, url: cv.toDataURL("image/png") }; } catch { return { w: cv.width, h: cv.height, url: null }; } },
    close,
  };
  const obs = new MutationObserver(() => { if (!box.isConnected) { offVis(); obs.disconnect(); } });
  obs.observe(document.body, { childList: true });

  drawSteps(); drawStep1(); drawTray();
  await redrawCard();
  return window.__mlwhCardDeco;
}
