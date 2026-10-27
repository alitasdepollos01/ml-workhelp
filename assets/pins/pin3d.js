// CSS 3D pins: wrap any pin picture so it leans towards the pointer, catches the light on its own shape, shows its thickness, and can turn
// over to its engraved back. No library; styles go through CSSOM only (works under style-src 'self'); reduced motion = no tilt, turning still works.
//   Pin3D.wrap(img, info)      → the img, wrapped in place (returns the .p3d element)
//   Pin3D.make(info)           → a new .p3d with its own picture (info.front)
//   Pin3D.attach(root, { select, info })  → lean every .p3d inside root (one set of listeners per root); wraps the imgs matching `select` first
//   Pin3D.flip(el, toBack?)    → turn over (builds the back the first time)
//   info: { id, front?, back?, lines?: [name, tier line, date / number], lang?, flip?: "click" | "none", sheen?: true, max?: 14 }
(function (g) {
  "use strict";
  const R = document.documentElement, INFO = new WeakMap(), LANGATTR = { en: "en", zh: "zh-Hant", th: "th" };
  const reduced = () => R.dataset.prm === "1" || matchMedia("(prefers-reduced-motion: reduce)").matches;
  const el = (tag, cls, kids) => { const e = document.createElement(tag); if (cls) e.className = cls; (kids || []).forEach((k) => e.append(k)); return e; };
  const pic = (src) => { const i = new Image(); i.src = src; i.alt = ""; i.draggable = false; i.decoding = "async"; return i; };
  const css = (e, o) => { for (const k in o) e.style.setProperty(k, o[k]); };

  function wrap(img, info = {}) {
    if (img.closest(".p3d")) return img.closest(".p3d");
    const p = el("span", "p3d"), tilt = el("span", "p3d-tilt"), flip = el("span", "p3d-flip"), front = el("span", "p3d-face p3d-front");
    img.replaceWith(p); front.append(img); flip.append(front); tilt.append(flip); p.append(tilt);
    INFO.set(p, { ...info, front: info.front || img.currentSrc || img.src });
    if (info.flip === "click") {
      p.setAttribute("role", "button"); p.tabIndex = 0; p.setAttribute("aria-pressed", "false");
      if (info.label) p.setAttribute("aria-label", info.label);
      p.addEventListener("click", (e) => { e.stopPropagation(); flipEl(p); });
      p.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flipEl(p); } });
    }
    return p;
  }
  const make = (info) => wrap(el("span", "", [pic(info.front)]).firstChild, info);

  // the engraving: the same classes and plates as assets/pin-back.js, positioned through CSSOM
  function backFace(info) {
    const L = (g.PIN_PLATES || {})[info.id] || { plate: [12, 38, 40, 13] }, pc = (v) => (v / 64 * 100).toFixed(2) + "%";
    const wrapB = el("span", "pback", [pic(info.back)]), pl = el("span", "pplate"), [l1, l2, l3] = info.lines || [];
    css(pl, { left: pc(L.plate[0]), top: pc(L.plate[1]), width: pc(L.plate[2]), height: pc(L.plate[3]) }); pl.lang = LANGATTR[info.lang] || "en";
    if (l1) { const b = el("b", "l1"); b.textContent = l1; pl.append(b); }
    [["l2", l2], ["l3", l3]].forEach(([c, t]) => { if (t) { const s = el("span", c); s.textContent = t; pl.append(s); } });
    wrapB.append(pl); return wrapB;
  }
  const sheen = (src) => { const s = el("span", "p3d-sheen", [el("span", "p3d-band"), el("span", "p3d-glint")]); css(s, { "-webkit-mask-image": `url("${src}")`, "mask-image": `url("${src}")` }); return s; };

  // build the 3D layers (only while needed)
  function build(p) {
    if (p.classList.contains("p3d-on")) return;
    const info = INFO.get(p) || {}, flip = p.querySelector(".p3d-flip"), front = p.querySelector(".p3d-front");
    const w = p.getBoundingClientRect().width || 64; css(p, { "--p3d-thick": Math.max(2, Math.round(w * .045)) + "px" });
    // a pin that never turns over (Board, Box) uses its own front for the edge: no new picture to decode, no back to lay out
    const turns = info.flip !== "none" && !!info.back, N = w > 120 ? 5 : 3, body = turns ? info.back : info.front;
    for (let i = 0; i < N; i++) { const e = el("span", "p3d-edge" + (turns ? " from-back" : ""), [pic(body)]); css(e, { transform: `translateZ(calc(var(--p3d-thick) * ${(i / (N - 1) - .5).toFixed(3)}))` }); flip.prepend(e); }
    if (info.sheen !== false) front.append(sheen(info.front));
    if (turns && !p.querySelector(".p3d-back")) { const b = el("span", "p3d-face p3d-back", [backFace(info)]); if (info.sheen !== false) b.append(sheen(info.back)); flip.append(b); if (g.PinBack) g.PinBack.fit(b); }
    if (!p.querySelector(".p3d-shadow")) p.prepend(el("span", "p3d-shadow", [pic(info.front)]));
    p.classList.add("p3d-on");
  }
  function unbuild(p) {
    if (!p.classList.contains("p3d-on") || p.classList.contains("is-flipped") || p === active) return;
    p.querySelectorAll(".p3d-edge, .p3d-sheen, .p3d-shadow").forEach((e) => e.remove());
    p.classList.remove("p3d-on");
  }
  function flipEl(p, toBack) {
    const info = INFO.get(p) || {}; if (!info.back) return false;
    build(p); const want = toBack == null ? !p.classList.contains("is-flipped") : !!toBack;
    p.classList.toggle("is-flipped", want); if (p.getAttribute("role") === "button") p.setAttribute("aria-pressed", String(want));
    if (!want) setTimeout(() => unbuild(p), 900);
    return want;
  }

  // leaning: one pointer listener per root, one rAF write per frame, only for the pin under the pointer
  let active = null, frame = 0, last = null;
  function lean(p, x, y) {
    const info = INFO.get(p) || {}, max = info.max || 14, tilt = p.querySelector(".p3d-tilt");
    const rx = (0.5 - y) * 2 * max, ry = (x - 0.5) * 2 * max;
    css(tilt, { transform: `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(1.06)` });
    css(p, { "--px": (x * 100).toFixed(1), "--py": (y * 100).toFixed(1), "--sx": (-ry * .3).toFixed(2), "--sy": (rx * .3).toFixed(2) });
  }
  function rest(p) { const t = p.querySelector(".p3d-tilt"); if (t) t.style.removeProperty("transform"); p.classList.remove("p3d-moving"); css(p, { "--sx": "0", "--sy": "0" }); setTimeout(() => unbuild(p), 600); }
  function attach(root, opts = {}) {
    if (!root) return;
    if (opts.select) root.querySelectorAll(opts.select).forEach((img) => { if (!img.closest(".p3d")) wrap(img, opts.info ? opts.info(img) : {}); });
    if (root.__p3d) return; root.__p3d = true;
    root.addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch" || reduced()) return;
      const p = e.target.closest && e.target.closest(".p3d"); if (p !== active) { if (active) rest(active); active = p; if (p) { build(p); p.classList.add("p3d-moving"); } }
      if (!p) return; const r = p.getBoundingClientRect(); last = [p, Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))];
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; if (last && last[0] === active) lean(...last); });
    });
    root.addEventListener("pointerleave", () => { if (active) rest(active); active = null; });
  }
  g.Pin3D = { wrap, make, attach, flip: flipEl, build, reduced };
})(window);
