// The engraving on a pin's back, laid over the back art in the viewer's language and fitted to the recessed plate
// (assets/pin-plates.js: plate [x, y, w, h] in the pin's 64-unit space). Long lines wrap at word boundaries (EN, 中文, ไทย:
// the browser's own line breaking, with the right lang), the text shrinks until it fits, and at tiny sizes the extra lines drop.
(function (g) {
  "use strict";
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const LANGATTR = { en: "en", zh: "zh-Hant", th: "th" };
  /** html({ id, src, lines: [name, tier line, number line], lang, cls }) */
  function html(o) {
    const L = (g.PIN_PLATES || {})[o.id] || { plate: [12, 38, 40, 13] };
    const [x, y, w, h] = L.plate, pc = (v) => (v / 64 * 100).toFixed(2) + "%";
    const [l1, l2, l3] = o.lines || [];
    return `<span class="pback ${o.cls || ""}"><img src="${o.src}" alt="${esc(o.alt || "")}" draggable="false"><span class="pplate" lang="${LANGATTR[o.lang] || "en"}" style="left:${pc(x)};top:${pc(y)};width:${pc(w)};height:${pc(h)}">` +
      `<b class="l1">${esc(l1)}</b>${l2 ? `<span class="l2">${esc(l2)}</span>` : ""}${l3 ? `<span class="l3">${esc(l3)}</span>` : ""}</span></span>`;
  }
  /** Shrink each plate's text until it fits; drop line 3, then line 2, when even the smallest size doesn't. */
  function fit(root) {
    const plates = (root || document).querySelectorAll(".pplate");
    plates.forEach((pl) => {
      const ph = pl.clientHeight, pw = pl.clientWidth; if (!ph || !pw) return;
      pl.querySelectorAll(".l2, .l3").forEach((e) => (e.style.display = ""));
      const MIN = 3.2, over = () => pl.scrollHeight > ph + 0.5 || pl.scrollWidth > pw + 0.5;
      const tryAll = () => { let fs = Math.max(MIN, ph * 0.34); pl.style.fontSize = fs + "px"; while (over() && fs > MIN) { fs = Math.max(MIN, fs - 0.25); pl.style.fontSize = fs + "px"; } return !over(); };
      if (tryAll()) return;
      const l3 = pl.querySelector(".l3"); if (l3) { l3.style.display = "none"; if (tryAll()) return; }
      const l2 = pl.querySelector(".l2"); if (l2) { l2.style.display = "none"; tryAll(); }
      pl.dataset.clipped = over() ? "1" : "";
    });
  }
  g.PinBack = { html, fit };
})(window);
