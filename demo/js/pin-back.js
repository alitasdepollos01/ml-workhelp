// The engraving on a pin's back, laid over the back art in the viewer's language and fitted to the recessed plate
// (pin-plates.js: plate [x, y, w, h] in the pin's 64-unit space). Long lines wrap at word boundaries (EN, 中文, ไทย:
// the browser's own line breaking, with the right lang), the text shrinks until it fits, and at tiny sizes the extra
// lines drop. Positions go through CSSOM (the pages allow no style attributes).
import { PLATES } from "./pin-plates.js";

const LANGATTR = { en: "en", zh: "zh-Hant", th: "th" };
const pc = (v) => (v / 64 * 100).toFixed(2) + "%";

/** backEl({ id, src, lines: [name, tier line, number line], lang }) → <span class="pback"> */
export function backEl(o) {
  const L = PLATES[o.id] || { plate: [12, 38, 40, 13] }, [x, y, w, h] = L.plate, [l1, l2, l3] = o.lines || [];
  const wrap = document.createElement("span"); wrap.className = "pback";
  const img = new Image(); img.src = o.src; img.alt = ""; img.draggable = false; img.decoding = "async";
  const pl = document.createElement("span"); pl.className = "pplate"; pl.lang = LANGATTR[o.lang] || "en";
  for (const [k, v] of Object.entries({ left: pc(x), top: pc(y), width: pc(w), height: pc(h) })) pl.style.setProperty(k, v);
  const line = (tag, cls, t) => { if (!t) return; const e = document.createElement(tag); e.className = cls; e.textContent = t; pl.append(e); };
  line("b", "l1", l1); line("span", "l2", l2); line("span", "l3", l3);
  wrap.append(img, pl);
  return wrap;
}

/** Shrink each plate's text until it fits; drop line 3, then line 2, when even the smallest size doesn't. */
export function fitBacks(root) {
  for (const pl of (root || document).querySelectorAll(".pplate")) {
    const ph = pl.clientHeight, pw = pl.clientWidth; if (!ph || !pw) continue;
    pl.querySelectorAll(".l2, .l3").forEach((e) => e.classList.remove("gone"));
    const MIN = 3.2, over = () => pl.scrollHeight > ph + 0.5 || pl.scrollWidth > pw + 0.5;
    const tryAll = () => { let fs = Math.max(MIN, ph * 0.34); pl.style.fontSize = fs + "px"; while (over() && fs > MIN) { fs = Math.max(MIN, fs - 0.25); pl.style.fontSize = fs + "px"; } return !over(); };
    if (tryAll()) continue;
    const l3 = pl.querySelector(".l3"); if (l3) { l3.classList.add("gone"); if (tryAll()) continue; }
    const l2 = pl.querySelector(".l2"); if (l2) { l2.classList.add("gone"); tryAll(); }
    pl.dataset.clipped = over() ? "1" : "";
  }
}
