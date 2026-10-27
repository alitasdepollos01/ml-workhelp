// The cartoon doodles on the app's pages (plan WP2): Myra's placement (doodles/placement.json, from
// tools/styles/config/placement.myra.json) drawn into the page as it is built, in the look the settings ask for
// (look.js). Every picture goes through the spoiler guard (visible-set.js) first.
//   Quiet wallpaper (look.doodles "wall", the default): the wallpaper (skins-new.css) + each page's title mark + the empty states
//   Corner stickers ("corners"): every spot in the placement: title marks, the header and timer corners (Whimsical's 48 px
//     slots), card corners, the time-row and reminder bullets, the empty states, the menu headings (after the words)
//   Off: nothing (and the page is exactly as without this file)
// The doodles are <img class="dood" data-spot="…"> elements added to the page's own markup; doodles.css places them.
// The sticker shelves (s_heads, s_tiles) live in the sticker maker's frame: shelfConfig() is what it would need.
import "./visible-set.js";
import { applyLook, currentLook, onLook, setDoodleFiles } from "./look.js";

const R = document.documentElement, VIS = window.MLWH_VISIBLE;
let P = null;                       // doodles/placement.json
const PAGE_SPOT = { today: "t_title", reminders: "r_title", week: "d_title", stickers: "s_title", buddy: "b_title", credits: "c_title" };
const HCORNER = { today: "t_hcorner", reminders: "r_hcorner", week: "d_hcorner", stickers: "s_hcorner", buddy: "b_hcorner" };
const CORNERS = [["t_timer", ".now-card", "slot k-timer"], ["t_word", ".word-card", "corner k-word"], ["t_next", ".next-card", "corner k-next"],
  ["t_focus", ".focus-box", "corner k-focus"], ["d_tile", ".dtiles .dtile", "corner k-tile"], ["n_word", "nav.side .wordmini", "wm k-wm"]];
const NAMES = { whale: "Whale", seal: "Seal (Maewnam)", "ws-bike": "Maewnam's yellow bicycle", vespa: "Yellow Vespa", sunearth: "Sun and Earth", "s235-alien": "Aylin's alien",
  headphones: "Headphones", ballet: "Ballet shoes", "mz-film": "Film camera", "wh-gem": "Rhinestone", milk: "Milk carton", "ml-logo": "MilkLove heart", camera: "Camera", "ws-ajarn": "Ajarn Maewnam" };
const dark = () => matchMedia("(prefers-color-scheme: dark)").matches || R.dataset.mode === "dark";
const isPinMotif = (id) => !!P && P.badges.includes(id); // (placement.json's "badges": the motifs that have a pin, for the spoiler rule)

/** The file for an item in a spot, or null: a motif is drawn in the doodle style that applies. */
export function fileFor(item, spotId, look = currentLook(), style = R.dataset.style || "f", isDark = dark()) {
  if (!P || !item || item === "none" || look.doodles === "off") return null;
  const sp = P.spots[spotId] || { size: "corner" }, cfg = P.appStyles[style] || P.appStyles.f;
  let it = VIS.guard(item, spotId, null, isPinMotif);
  if (it === "none") return null;
  if (String(it).startsWith("badge:")) {
    // (an old "badge:<id>" placement: badges were removed on 28 Oct, so the doodle itself; a drama / classic pin keeps its picture)
    const id = it.slice(6);
    if (P.motifs.includes(id)) it = id;
    else return P.pins.includes(id) ? { file: `pins/${id}.svg`, pin: true, id } : null;
  }
  if (!P.motifs.includes(it)) return P.pins.includes(it) ? { file: `pins/${it}.svg`, id: it } : null;
  const own = (cfg.spots[spotId] || {}).style;
  const st = look.doodleStyle !== "auto" ? look.doodleStyle : own && own !== "default" ? own : cfg.doodleStyle;
  const folder = (st === "marker" || st === "riso") && isDark ? st + "-dark" : st;
  const small = P.cut.includes(st) && P.small.includes(sp.size);
  return { file: `${folder}/${it}${small ? "-s" : ""}.svg`, style: st, pixel: st === "pixel", id: it };
}

/** The spots this look draws for this style: { spotId: item }. */
export function spotsFor(look = currentLook(), style = R.dataset.style || "f") {
  if (!P || look.doodles === "off") return {};
  const cfg = P.appStyles[style] || P.appStyles.f, out = {};
  for (const [id, s] of Object.entries(cfg.spots)) if (look.doodles === "corners" || /_(title|empty)$/.test(id)) out[id] = s.item;
  return out;
}

function img(spot, f, cls) {
  const i = document.createElement("img");
  i.className = `dood dood-${cls}`; i.alt = ""; i.draggable = false;
  i.dataset.spot = spot; i.dataset.m = f.id;
  i.setAttribute("aria-hidden", "true");
  i.src = "doodles/" + f.file;
  if (f.pixel) i.classList.add("px");
  if (f.pin) i.classList.add("pin");
  if (NAMES[f.id]) i.title = NAMES[f.id];
  return i;
}
/** One doodle for a spot in a host element (kept if it's already right). */
function put(host, spot, f, cls, how = "append") {
  if (!host) return null;
  let i = host.querySelector(`:scope > img.dood[data-spot="${CSS.escape(spot)}"]`);
  if (!f) { i?.remove(); return null; }
  if (i && i.getAttribute("src") === "doodles/" + f.file && i.classList.contains("dood-" + cls.split(" ")[0])) { keep.add(i); return i; }
  i?.remove();
  i = img(spot, f, cls);
  if (how === "prepend") host.prepend(i); else host.append(i);
  keep.add(i);
  return i;
}
let keep = new Set();

/** The title mark, glued to the title's last word so it never sits alone on a line. */
function titleMark(spot, f) {
  const h2 = document.querySelector("main .page .page-top h2");
  if (!h2) return;
  let glue = h2.querySelector(":scope > .dood-glue");
  if (!f) { if (glue) unglue(glue); return; }
  if (!glue) {
    const tn = [...h2.childNodes].reverse().find((n) => n.nodeType === 3 && n.textContent.trim());
    glue = document.createElement("span"); glue.className = "dood-glue";
    if (tn) { const m = tn.textContent.match(/^([\s\S]*?)(\S+\s*)$/); tn.textContent = m[1]; glue.append(m[2].trimEnd()); tn.after(glue); } else h2.append(glue);
  }
  keep.add(glue);
  put(glue, spot, f, "title");
}
function unglue(glue) {
  glue.querySelectorAll("img.dood").forEach((i) => i.remove());
  const t = document.createTextNode(glue.textContent);
  const h2 = glue.parentNode; glue.replaceWith(t); h2.normalize();
}
/** An empty state ("Nothing logged yet today", "That's all for today"): the doodle takes the sticker's place. */
function emptyState(box, spot, f) {
  if (!box) return;
  box.classList.toggle("dood-empty", !!f);
  put(box, spot, f, "emptyimg", "prepend");
  if (f) keep.add(box);
}

function apply() {
  timer = 0;
  if (!P) return;
  mo.disconnect();
  try {
    const look = applyLook(), style = R.dataset.style || "f", want = spotsFor(look, style);
    keep = new Set();
    const tab = document.querySelector("nav.side button.on[data-tab]")?.dataset.tab || document.querySelector("main")?.dataset.tab || "";
    const F = (spot, item = want[spot]) => (item ? fileFor(Array.isArray(item) ? item[0] : item, spot, look, style) : null);
    // the page's title mark: its spot, or (Help, Settings) the page's own mark, in both layouts
    const tspot = PAGE_SPOT[tab];
    if (tspot) titleMark(tspot, F(tspot));
    else if (P.titleMarks[tab] && look.doodles !== "off") titleMark(tab + "_title", fileFor(P.titleMarks[tab], tab + "_title", look, style));
    // the header corner (every page) and the card corners
    const top = document.querySelector("main .page .page-top");
    if (top && HCORNER[tab]) put(top, HCORNER[tab], F(HCORNER[tab]), "slot k-head");
    for (const [spot, sel, cls] of CORNERS) { const host = document.querySelector(sel); if (host) put(host, spot, (spot[0] === "t" && tab !== "today") || (spot[0] === "d" && tab !== "week") ? null : F(spot), cls); }
    // the time rows on Today and the reminders: a bullet each
    let rows = false;
    document.querySelectorAll("main .dl-rows .dl-row").forEach((r) => {
      const spot = r.classList.contains("brk") ? "t_rows.break" : r.classList.contains("cur") ? "t_rows.now" : "t_rows.work";
      r.querySelectorAll(":scope > img.dood").forEach((x) => { if (x.dataset.spot !== spot) x.remove(); });
      if (put(r, spot, tab === "today" ? F(spot) : null, "bul", "prepend")) rows = true;
    });
    let rrows = false;
    const rr = want.r_rows, list = Array.isArray(rr) ? rr : rr ? [rr] : [];
    document.querySelectorAll("main .rem-list .rem").forEach((r, i) => { if (put(r, "r_rows", list.length ? F("r_rows", list[i % list.length]) : null, "bul", "prepend")) rrows = true; });
    if (rows) R.dataset.trows = "1"; else delete R.dataset.trows;
    if (rrows) R.dataset.rrows = "1"; else delete R.dataset.rrows;
    // the empty states
    if (tab === "today") emptyState(document.querySelector("main .entries > .empty"), "t_empty", F("t_empty"));
    if (tab === "reminders") emptyState(document.querySelector("main .rem-list > .rem-day + .empty"), "r_empty", F("r_empty"));
    // the menu headings: Ajarn Maewnam after "Work corner", the milk carton after "Fan corner"
    put(document.querySelector("nav.side .nav-h-work"), "n_work", F("n_work"), "nav after-text");
    put(document.querySelector("nav.side .nav-h:not(.nav-h-work)"), "n_fan", F("n_fan"), "nav after-text");
    // anything drawn before that isn't wanted now (another page, another layout, doodles off)
    document.querySelectorAll("img.dood[data-spot]").forEach((i) => { if (!keep.has(i)) i.remove(); });
    document.querySelectorAll(".dood-glue").forEach((g) => { if (!keep.has(g)) unglue(g); });
    document.querySelectorAll(".dood-empty").forEach((b) => { if (!keep.has(b)) b.classList.remove("dood-empty"); });
  } finally {
    observe();
  }
}
// Redrawn when the page changes (each tab builds its page anew), when the look or the style changes, and in dark mode
// (riso and marker have dark drawings). Not with requestAnimationFrame: a window that isn't on screen still gets its doodles.
let timer = 0;
const later = () => { if (!timer) timer = setTimeout(apply, 0); };
const mo = new MutationObserver(later);
function observe() { for (const el of [document.getElementById("main"), document.getElementById("nav")]) if (el) mo.observe(el, { childList: true, subtree: true }); }
onLook(later);
VIS.onChange(later);
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", later);
new MutationObserver(later).observe(R, { attributes: true, attributeFilter: ["data-style", "data-mode"] });

/** Start: load the placement, then draw (app.js, once the page is up). */
export async function startDoodles() {
  try {
    const r = await fetch("doodles/placement.json");
    P = await r.json();
  } catch (e) { console.error("doodles: no placement", e); return; }
  setDoodleFiles(P);
  observe();
  later();
}

/** What the sticker shelves (in the maker's frame) need: { "s_heads.milk": { file, pixel }, … } for this look. */
export function shelfConfig(look = currentLook(), style = R.dataset.style || "f") {
  const want = spotsFor(look, style), out = {};
  for (const id of Object.keys(P?.spots || {})) if (/^s_(heads|tiles)\./.test(id)) { const f = want[id] ? fileFor(want[id], id, look, style) : null; out[id] = f ? { file: "doodles/" + f.file, pixel: !!f.pixel } : null; }
  return out;
}

window.__mlwhDoodles = { fileFor, spotsFor, shelfConfig, placement: () => P, redraw: () => apply() };
