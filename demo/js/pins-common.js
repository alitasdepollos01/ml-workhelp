// The pins game in the pages: what every pins piece shares (the Pins page, the earning moment, Settings › Pins,
// the buddy card). The rules and the collection live in the desktop app (app/desktop/pins.js); a page asks for
// views through MLHost.pins (preload.js: call / code / note) and never sees a locked pin's design or lines.
//
// THE RULE for every pin picture: pinArt(). A pin you have shows its art (any of its tiers); a pin you don't have yet
// is a silhouette drawn from its outline only (pins/art/sil/), and a secret one a plain round shape with "?".
// No other code builds a pin <img> from pins/art/<tier>/, so a locked pin's design is never in the page.
import { L, lang, zh, th, thaiExact } from "./i18n.js";

export { lang };
/** Three languages: the prototype's Thai is used as it is (Thai lines for track G are listed in app/desktop/pins-page.md). */
// Thai: th.json first (where the Thai is checked and changed): "pins›<English>" for short words that mean something else
// elsewhere in the app ("Next up", "Not yet", "Board"), else the English itself; exact entries only (th.json's patterns
// are the app's, and "{0} of {1}" would take "5 of 61 pins"). Sentences with numbers or names in them keep the Thai
// written here.
const thx = (en) => thaiExact("pins›" + en) ?? thaiExact(en);
export const T = (en, z, t) => (zh ? z : th ? (thx(en) ?? t ?? en) : en);
/** A catalogue text { en, zh, th } in this language. */
export const tx = (o) => (!o ? "" : typeof o === "string" ? o : o[lang] || o.en || "");
export const LOC = zh ? "zh-TW" : th ? "th-TH-u-ca-gregory" : "en-GB";
export const fmt = (n) => (Math.round(Number(n) * 10) / 10).toLocaleString(LOC);
export const date = (t) => new Date(t).toLocaleDateString(LOC, { day: "numeric", month: "short", year: "numeric" });
export const dayDate = (key) => { const [y, m, d] = String(key).split("-").map(Number); return new Date(y, m - 1, d).getTime(); };
export const reduced = () => document.documentElement.dataset.prm === "1" || matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The desktop app's pins (null in a browser tab or the demo: the page then says pins live in the desktop app). */
export const api = () => window.MLHost?.pins || null;
export const call = async (action, ...args) => { const a = api(); if (!a) return null; try { return await a.call(action, ...args); } catch (e) { console.warn("pins:", action, e?.message); return null; } };

// ---- the data: the catalogue's static parts, every pin's view, the summary ----
let CAT = null;
export const cat = () => CAT;
/** Everything a page draws from: { cat, list, byId, sum, nextUp }. */
export async function load() {
  if (!api()) return null;
  const [c, list, sum, nu] = await Promise.all([CAT ? CAT : call("catalogue"), call("list"), call("summary"), call("nextUp", 3)]);
  if (!c || !Array.isArray(list)) return null;
  CAT = { ...c, total: list.length };
  return { cat: c, list, byId: new Map(list.map((v) => [v.id, v])), sum: sum || {}, nextUp: nu || [] };
}

/** The catalogue's static parts, loaded once (the moments can come before the Pins page was ever opened). */
export async function ensureCat() {
  if (!CAT && api()) { const [c, l] = await Promise.all([call("catalogue"), call("list")]); if (c) CAT = { ...c, total: Array.isArray(l) ? l.length : 61 }; }
  return CAT;
}

// ---- names, tiers, units ----
export const SERIES = () => CAT?.SERIES || [];
export const seriesOf = (id) => SERIES().find((s) => s.id === id);
export const nameOf = (v) => (v.locked === "secret" ? "???" : tx(v.name));
/** The tier's name ("Gold rim"), or what a one-tier pin is ("Set reward"). */
export function tierLabel(v, k = v.tier) {
  if ((v.tiers || []).length === 1) return v.kind === "entry" ? T("Series pin", "系列徽章", "เข็มกลัดประจำซีรีส์") : v.kind === "set" ? T("Set reward", "收集獎勵", "รางวัลสะสม")
    : v.kind === "gift" ? T("A gift", "見面禮", "ของขวัญ") : T("One of a kind", "獨一無二", "มีชิ้นเดียว");
  return tx(CAT?.TIERN?.[v.tiers[Math.max(0, k)]]) || v.tiers[Math.max(0, k)];
}
export const tierName = (tierId) => tx(CAT?.TIERN?.[tierId]) || tierId;
/** "12 rounds" / "12 輪" / "12 รอบ"; a pin counted in pins (a set reward, a series pin): "3 pins". */
export function unit(counter, n) {
  const u = CAT?.COUNTERS?.[counter]?.unit;
  if (!u) return T(`${fmt(n)} ${Number(n) === 1 ? "pin" : "pins"}`, `${fmt(n)} 個徽章`, `${fmt(n)} อัน`);
  return zh ? `${fmt(n)} ${u[2]}` : th ? `${fmt(n)} ${u[3]}` : `${fmt(n)} ${Number(n) === 1 ? u[0] : u[1]}`;
}
/** How far a pin is: { frac, line, done }. */
export function progress(v) {
  if (v.locked === "secret") return { frac: 0, line: "", done: false };
  if (!v.next) return { frac: 1, line: T("All collected", "全部收齊了", "สะสมครบแล้ว"), done: true };
  const need = unit(v.counter, v.next.need), tn = v.tiers.length > 1 ? tierName(v.next.tierId) : "";
  const line = v.earned && tn ? T(`${need} to ${tn}`, `再 ${need}就升到${tn}`, `อีก ${need} → ${tn}`) : T(`${need} to go`, `還差 ${need}`, `อีก ${need}`);
  return { frac: Math.max(0, Math.min(1, Number(v.frac) || 0)), line, done: false };
}
/** who said it, and where (the episode), for fans: "Wan, EP2". Nothing else (no source marks). */
export const whereOf = (x) => { const m = String(x?.where || "").match(/EP\s?\d+/); return m ? m[0].replace(/\s/, "") : ""; };
export const whoWhere = (x) => [x?.who && x.who !== "—" ? x.who : "", whereOf(x)].filter(Boolean).join(", ");
export const quoted = (t) => (!t ? "" : /^[“«「"]/.test(t) ? t : `“${t}”`);
/** What a pin says at tier k (an earned pin's view carries its lines up to its tier). */
export const saysAt = (v, k = v.tier) => { const s = (v.says || []).find((x) => x.tier === v.tiers[Math.max(0, k)]); return s || (v.says || [])[v.says?.length - 1] || v.earn || null; };

// ---- pictures ----
const BASE = new URL("../pins/art/", import.meta.url).href;
const tierIdOf = (v, k) => v.tiers[Math.max(0, Math.min(v.tiers.length - 1, k))];
/**
 * Every pin picture goes through here. k: the tier index to draw (default the pin's own, or its first).
 * An earned pin: its art at that tier. Not earned: the silhouette (pins/art/sil/<tier>/<id>.svg), or for a secret the round one.
 */
export function pinArt(v, k = Math.max(0, v.tier), cls = "") {
  const img = new Image(); img.alt = ""; img.draggable = false; img.decoding = "async";
  if (v.earned) img.src = `${BASE}${tierIdOf(v, k)}/${encodeURIComponent(v.id)}.svg`;
  else { img.src = `${BASE}sil/locked.svg`; /* (the website's demo: one plain pin for every pin not earned) */ img.classList.add("sil"); }
  if (cls) img.classList.add(...cls.split(/\s+/).filter(Boolean));
  img.dataset.pinArt = v.id;
  return img;
}
/** The back's picture: only for an earned pin (null otherwise). */
export const backSrc = (v, k = v.tier) => (v.earned ? `${BASE}back/${tierIdOf(v, k)}/${encodeURIComponent(v.id)}.svg` : null);
/** The engraving's three lines: name, tier (and its count), the day it came / its number. */
export function backLines(v, k = v.tier, when = null) {
  const tid = tierIdOf(v, k), at = (v.ladder || []).find((x) => x.tier === tid)?.at ?? v.t?.[Math.max(0, k)];
  const tl = v.tiers.length === 1 ? tierLabel(v, k) : `${tierLabel(v, k)} · ${unit(v.counter, at)}`;
  return [nameOf(v), tl, v.backDate || when || `No. ${String(v.no).padStart(2, "0")} / ${CAT?.total || 61}`];
}

// ---- small DOM helpers (no style attributes: classes, and CSSOM for the few numbers) ----
export function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === "style") throw new Error("pins: no style attributes");   // (CSP: style-src 'self'; set properties with css())
    if (k === "className" || k === "textContent" || k === "hidden" || k === "type" || k === "value" || k === "checked" || k === "disabled" || k === "id" || k === "tabIndex") e[k] = v;
    else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) e.append(c);
  return e;
}
export const css = (e, o) => { for (const k in o) e.style.setProperty(k, String(o[k])); return e; };
const NS = "http://www.w3.org/2000/svg";
export const ICON = {
  board: ["M3 4h18v16H3z", "M8 7.4a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 1 0 0-3.2", "M15 8.4a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 1 0 0-3.2", "M10 13.4a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 1 0 0-3.2"],
  box: ["M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z", "M3 7.5 12 12l9-4.5M12 12v9"],
  flip: ["M4 12a8 8 0 0 1 13.7-5.6L20 9", "M20 4v5h-5", "M20 12a8 8 0 0 1-13.7 5.6L4 15", "M4 20v-5h5"],
  lock: ["M5 11h14v9H5z", "M8 11V8a4 4 0 0 1 8 0v3"],
  shield: ["M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6z", "m9 12 2 2 4-4"],
  x: ["M6 6l12 12M18 6 6 18"], check: ["m5 12.5 4.5 4.5L19 7.5"],
  pin: ["M12 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 1 0 0-11", "M9.2 18.5 8 22l4-1.6 4 1.6-1.2-3.5", "M10 8a2.4 2.4 0 0 1 2-1.4"],
};
export function svgIcon(name, cls = "ico-s") {
  const s = document.createElementNS(NS, "svg");
  for (const [k, v] of Object.entries({ viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true", class: cls })) s.setAttribute(k, v);
  for (const d of ICON[name] || []) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); s.append(p); }
  return s;
}
/** The pins stylesheets, linked once (app.html need not list them). */
export function ensureCss(...files) {
  for (const f of files.length ? files : ["pins/pin3d.css", "pins/pins.css"]) {
    const href = new URL("../" + f, import.meta.url).href;
    if ([...document.querySelectorAll("link[rel=stylesheet]")].some((l) => l.href === href)) continue;
    const l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; document.head.append(l);
  }
}
