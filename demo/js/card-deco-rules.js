// Decorate your card (Data › Make a picture › Decorate): the saved layouts' shape and checks (settings key
// `cardDeco`). The same rules run in the desktop app (app/desktop/card-deco.js keeps the setting; its
// card-deco-rules.js is a byte copy of this file, test/card-test.js checks they are identical) and on the page.
//
//   cardDeco = { week | day | pomo | thai | goal | month: [{ motif, style, x, y, scale, rot, flip }] }
//     motif  a doodle id (doodles/<style>/<id>.svg) or a pin id (doodles/pins/<id>.svg; style "badge")
//     style  "auto" (the app style's doodle style) | a doodle style | "badge"
//     x, y   the centre, as a fraction of the card (so a layout survives a style or language change)
//     scale  1 = 64 px on the 440 × 310 card (0.4–2.6); rot in degrees (−180–180); flip = mirrored
//   List order is the layer order. At most CAP (6) per card; an empty card is left out.
(function (root, make) {
  const api = make();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MLWH_CARD_RULES = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  const KINDS = ["week", "day", "pomo", "thai", "goal", "month"];
  const CAP = 6;
  const DOODLE_STYLES = ["kawaii", "kawaii-soft", "kawaii-pop", "sticker", "plush", "neon", "pixel", "riso", "marker"];
  const STYLES = ["auto", ...DOODLE_STYLES, "badge"];
  const MIN_S = 0.4, MAX_S = 2.6;
  const ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
  const num = (v, a, b, d) => (typeof v === "number" && Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : d);
  const r3 = (v) => Math.round(v * 1000) / 1000;

  /** One decoration, checked; null if it can't be one. */
  function item(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const motif = String(raw.motif || "");
    if (!ID.test(motif)) return null;
    const style = STYLES.includes(raw.style) ? raw.style : "auto";
    return {
      motif, style,
      x: r3(num(raw.x, 0, 1, 0.5)), y: r3(num(raw.y, 0, 1, 0.5)),
      scale: Math.round(num(raw.scale, MIN_S, MAX_S, 1) * 100) / 100,
      rot: Math.round(num(raw.rot, -180, 180, 0)),
      flip: raw.flip === true,
    };
  }
  /** One card's list: checked, at most CAP. */
  const list = (raw) => (Array.isArray(raw) ? raw.map(item).filter(Boolean).slice(0, CAP) : []);
  /** Every card's list from whatever was saved (nothing saved, an old settings file: {}). */
  function normalize(raw) {
    const r = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const out = {};
    for (const k of KINDS) { const l = list(r[k]); if (l.length) out[k] = l; }
    return out;
  }
  /** A change: { day: [...] } replaces that card's list ([] or null clears it); other cards stay. */
  function merge(prev, patch) {
    const cur = normalize(prev);
    const p = patch && typeof patch === "object" && !Array.isArray(patch) ? patch : {};
    for (const k of KINDS) if (k in p) { const l = list(p[k]); if (l.length) cur[k] = l; else delete cur[k]; }
    return cur;
  }
  /** The credit line goes on a card exactly when it has a decoration. */
  const credited = (l) => Array.isArray(l) && l.length > 0;
  return { KINDS, CAP, STYLES, DOODLE_STYLES, MIN_S, MAX_S, item, list, normalize, merge, credited };
});
