// Shared by the app window's tabs (app.html): building elements, times in
// both languages, categories, the decorations, small messages.

import { L, zh, th } from "./i18n.js";

export { L, zh, th };
export const host = window.MLHost;
export const work = host?.work;
export const $ = (id) => document.getElementById(id);

/** el("div", { className: "card" }, child, "text", ...) */
export function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null) continue;
    if (k === "style" && typeof v === "string") e.style.cssText = v;
    else if (k.startsWith("data-") || k.startsWith("aria-") || k === "role" || k === "for" || k === "list") e.setAttribute(k, v);
    else e[k] = v;
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k);
  return e;
}

export const LOC = zh ? "zh-TW" : th ? "th-TH-u-ca-gregory" : []; // (Thai dates in the Western years)
export const pad = (n) => String(n).padStart(2, "0");
export const clock = (t) => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
/** "1 h 20 min" / "1 小時 20 分鐘", from ms. */
export function hm(ms) {
  const m = Math.round(Math.max(0, ms) / 60e3);
  if (m < 60) return L(`${m} min`, `${m} 分鐘`);
  return L(`${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`, `${Math.floor(m / 60)} 小時${m % 60 ? ` ${m % 60} 分鐘` : ""}`);
}
export const hours = (ms) => (ms / 3600e3).toFixed(ms >= 10 * 3600e3 ? 0 : 1).replace(/\.0$/, "") + L(" h", " 小時");
export const dayKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const dayStart = (t) => new Date(t).setHours(0, 0, 0, 0);
export const addDays = (t, n) => { const d = new Date(t); d.setDate(d.getDate() + n); return d.getTime(); };
export const weekStart = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
export const dayName = (t, style = "short") => new Date(t).toLocaleDateString(LOC, { weekday: style });
export const dateShort = (t) => new Date(t).toLocaleDateString(LOC, { day: "numeric", month: "short" });
/** "09:30" → minutes after midnight, or null. */
export const parseClock = (s) => { const m = /^\s*(\d{1,2}):?(\d{2})\s*$/.exec(s || ""); if (!m || +m[1] > 23 || +m[2] > 59) return null; return +m[1] * 60 + +m[2]; };

// ---- categories ----------------------------------------------------------------

export const state = { st: null }; // the latest work status from the app
export const workCats = () => state.st?.workTypes || [];
export const breakCats = () => state.st?.breakTypes || [];
export const catOf = (kind, id) => (kind === "work" ? workCats() : breakCats()).find((c) => c.id === id);
export const catName = (c, short = false) => {
  if (!c) return "";
  const n = L(c.label, c.zh || c.label);
  return `${c.emoji} ${short ? n.replace(/ ?[(（].*[)）]$/, "") : n}`;
};
export const catColor = (kind, id) => catOf(kind, id)?.color || (kind === "away" ? "var(--away)" : "#cfd8cf");

/** A category menu; "＋ New category…" asks for one and adds it. */
export function catSelect(kind, value, onChange, { blank = null } = {}) {
  const s = el("select", { className: "cat-select" });
  if (blank) s.append(new Option(blank, ""));
  for (const c of kind === "work" ? workCats() : breakCats()) s.append(new Option(catName(c), c.id));
  s.append(new Option(L("＋ New category…", "＋ 新增分類⋯"), "__new"));
  s.value = value ?? (blank ? "" : s.options[0]?.value);
  s.addEventListener("change", async () => {
    if (s.value !== "__new") return onChange(s.value);
    const text = prompt(L("New category (you can start it with an emoji):", "新分類名稱（開頭可以加個表情符號）："));
    if (!text) { s.value = value ?? ""; return; }
    const c = await saveCategoryFromText(kind, text);
    if (c) onChange(c.id);
  });
  return s;
}

export async function saveCategoryFromText(kind, text) {
  const m = text.trim().match(/^(\p{Extended_Pictographic}️?)\s*(.*)$/u);
  const label = (m ? m[2] : text).trim();
  if (!label) return null;
  const c = await work.call("saveCategory", kind, { emoji: m ? m[1] : undefined, label, zh: label });
  toast(L(`Added “${label}”`, `已新增「${label}」`));
  return c;
}

// ---- decorations (app/web/deco: the pictures picked for each spot) -------------

let decoMap = {};
export async function loadDeco() { try { decoMap = await (await fetch("deco/deco.json")).json(); } catch { decoMap = {}; } }
/** <img> for a decoration spot, or null when the spot has none. */
export function deco(spot, className, style = "") {
  const f = decoMap[spot]?.cartoon, size = Number(decoMap[spot]?.size) || 100;
  if (!f) return null;
  const img = el("img", { className: `deco ${className || ""}`, src: "deco/" + f, alt: "", style });
  img.dataset.spot = spot; // (which spot it is: the sticker picker finds them by it)
  const by = creditFor(decoMap[spot]?.by);
  if (by) img.dataset.credit = by; // (point at it: whose photo it is, app.js)
  if (size !== 100) {
    const z = Math.min(2, Math.max(0.5, size / 100));
    img.style.zoom = String(z); // (its size, picked with the sticker)
    // (and the card it sits in keeps that much more room for it: --deco-z in app.css)
    requestAnimationFrame(() => img.parentElement?.style.setProperty("--deco-z", String(Math.max(1, z))));
  }
  return img;
}

/** "Photo: Blumoon", "Photo: GMMTV · Milk", "Cartoon: …" for a sticker's credit tags (deco.json "by"). */
export function creditFor(tags) {
  const t = [].concat(tags || []).filter(Boolean);
  if (!t.length) return "";
  if (t.includes("wanwannjeab")) return L("Cartoon: หวานเจี๊ยบอุนยายม๋าไก่ (@wanwannjeab)", "插畫：หวานเจี๊ยบอุนยายม๋าไก่（@wanwannjeab）");
  const name = { other: L("not sure who", "不確定是誰"),
    commercial: L("official / commercial", "官方／商業宣傳"), alitasdepollo: "alitasdepollos" };
  return L("Photo: ", "照片：") + t.map((x) => name[x] || x).join(" · ");
}

/**
 * A main page's top: a soft band with its title, a line on what the page is for (and any tools),
 * and the page's sticker standing inside it. crumb: a small line above the title.
 */
export function pageTop({ title, sub = "", spot = "", tools = null, crumb = "", className = "", side = null }) {
  return el("header", { className: `page-top st-left ${className}` }, // (the sticker in front of the title)
    el("div", { className: "pt-text" }, crumb ? el("div", { className: "pt-crumb", textContent: crumb }) : null,
      typeof title === "string" ? el("h2", { textContent: title }) : title,
      sub ? el("p", { className: "pt-sub", textContent: sub }) : null,
      tools ? el("div", { className: "pt-tools" }, tools) : null),
    side ? el("div", { className: "pt-side" }, side) : null,
    spot ? topDeco(spot, "pt-deco") : null);
}
/** A page top's sticker: its height comes from the page top (not the spot's own size). */
function topDeco(spot, cls) { const d = deco(spot, cls); if (d) d.style.zoom = ""; return d; }

/** A sub-page's top (Settings › a group): "Settings › name", a line, one sticker. */
export function pageSub({ parent, onParent, title, sub = "", spot = "" }) {
  const back = el("button", { type: "button", className: "ps-parent", textContent: parent });
  back.addEventListener("click", onParent);
  return el("header", { className: "page-sub" },
    el("div", { className: "ps-text" }, el("div", { className: "ps-path" }, back, el("span", { className: "ps-sep", textContent: "›", "aria-hidden": "true" }), el("h2", { textContent: title })),
      sub ? el("p", { className: "pt-sub", textContent: sub }) : null),
    spot ? topDeco(spot, "ps-deco") : null);
}

// ---- small messages ------------------------------------------------------------

/** Enter, but not the Enter that picks a word in a Chinese (or any) input method. */
export const enterKey = (e) => e.key === "Enter" && !e.isComposing && e.keyCode !== 229;

export function toast(text) {
  let t = $("toast");
  if (!t) { t = el("div", { id: "toast", className: "toast", role: "status" }); document.body.append(t); }
  t.textContent = text;
  t.classList.add("on");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove("on"), 1800);
}

/** Two pages in one tab: "1 · Summary" "2 · …" */
export function pager(names, at, go) {
  return el("div", { className: "pager" }, names.map((n, i) => {
    const b = el("button", { type: "button", className: "chip" + (i === at ? " on" : ""), textContent: `${i + 1} · ${n}` });
    b.addEventListener("click", () => go(i));
    return b;
  }));
}

/** A modal box; returns { box, close }. */
export function modal(title) {
  const v = el("div", { className: "viewer", role: "dialog", "aria-modal": "true" });
  const close = () => { v.remove(); document.removeEventListener("keydown", esc); };
  v.close = close;
  const esc = (e) => { if (e.key === "Escape") close(); };
  const x = el("button", { type: "button", className: "btn small", textContent: L("Close", "關閉") });
  x.addEventListener("click", close);
  v.addEventListener("click", (e) => { if (e.target === v) close(); });
  document.addEventListener("keydown", esc);
  const box = el("div", { className: "box" }, el("div", { className: "box-head" }, el("b", { textContent: title }), x));
  v.append(box);
  document.body.append(v);
  return { box, close };
}

/** The Thai version's note: the translation may not be right everywhere, and how to help (shown in Thai only). */
export function thaiNote() {
  if (!th) return null;
  const n = el("div", { className: "th-note" });
  n.innerHTML = "🇹🇭 <b>ภาษาไทยยังอยู่ในช่วงทดลอง</b><br>คำแปลภาษาไทยอาจยังไม่ถูกต้องทั้งหมด หากคุณอยากช่วยปรับปรุงคำแปล ติดต่อเราได้ที่ " +
    "<a href=\"mailto:alitasdepollos01@gmail.com\">alitasdepollos01@gmail.com</a> หรือ X <a href=\"https://x.com/alitasdepollos0\" target=\"_blank\" rel=\"noopener\">@alitasdepollos0</a> ขอบคุณมากค่ะ" +
    "<br><span class=\"muted\">(The Thai translation may not be fully correct. If you'd like to help improve it, please contact us.)</span>";
  return n;
}
