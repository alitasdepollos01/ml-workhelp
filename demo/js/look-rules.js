// The Look settings (settings.look, Settings › Look › "Doodles"): their keys, defaults and checks.
// The same rules run in the desktop app (app/desktop/look.js, which keeps the setting) and here (the page applies it,
// and keeps it itself where there is no desktop app: a browser, the website's demo). test/look-test.js checks the
// two copies agree.
//
//   doodles      "wall" (quiet wallpaper, the default) | "corners" (corner stickers) | "off"
//   doodleStyle  "auto" (each style's own) | kawaii | kawaii-soft | kawaii-pop | sticker | plush | neon | pixel | riso | marker
//   wallStrength { "<style>": { light, dark } }: the wallpaper's opacity (0–0.30) where it differs from the balanced value
//   wallHead     "fade" (fades out under the page top, the default) | "full"
//   badges       "on" (default) | "off": unused since badges were removed (28 Oct); kept so old settings stay valid
//   menuHeading  "on" (default) | "off": the "Work corner" heading above Today
(function (root, make) {
  const api = make();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MLWH_LOOK_RULES = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  const STYLES = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "m"];
  const DOODLE_STYLES = ["kawaii", "kawaii-soft", "kawaii-pop", "sticker", "plush", "neon", "pixel", "riso", "marker"];
  // Myra's wallpaper strengths (26 Oct), light / dark, in %: skins-new.css --wop-l / --wop-d ("Reset to balanced")
  const BALANCED = { a: [6.0, 4.8], b: [15.5, 4.8], c: [8.0, 6.4], d: [5.6, 6.0], e: [7.0, 8.4], f: [8.9, 4.5], g: [6.9, 3.6], h: [6.0, 5.0], i: [5.6, 4.2], m: [17.5, 3.6] };
  // each app style's own doodle style (Myra's mapping; placement.json appStyles.<id>.doodleStyle)
  const OWN_DOODLES = { a: "sticker", b: "plush", c: "riso", d: "kawaii", e: "neon", f: "kawaii-soft", g: "pixel", h: "sticker", i: "marker", m: "plush" };
  const DEFAULTS = { doodles: "wall", doodleStyle: "auto", wallStrength: {}, wallHead: "fade", badges: "on", menuHeading: "on" };
  const MAX = 0.3;
  const CHOICES = { doodles: ["wall", "corners", "off"], doodleStyle: ["auto", ...DOODLE_STYLES], wallHead: ["fade", "full"], badges: ["on", "off"], menuHeading: ["on", "off"] };
  const num = (v) => (typeof v === "number" && Number.isFinite(v) ? Math.round(Math.max(0, Math.min(MAX, v)) * 1000) / 1000 : undefined);
  const balanced = (style, mode) => (BALANCED[style] ? BALANCED[style][mode === "dark" ? 1 : 0] / 100 : 0.06);

  /** A whole look from whatever was saved (unknown keys and bad values dropped, the defaults filled in). */
  function normalize(raw) {
    const r = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const out = { ...DEFAULTS, wallStrength: {} };
    for (const [k, list] of Object.entries(CHOICES)) if (list.includes(r[k])) out[k] = r[k];
    const ws = r.wallStrength && typeof r.wallStrength === "object" ? r.wallStrength : {};
    for (const st of STYLES) {
      const v = ws[st]; if (!v || typeof v !== "object") continue;
      const o = {};
      for (const mode of ["light", "dark"]) { const n = num(v[mode]); if (n !== undefined && Math.abs(n - balanced(st, mode)) > 0.0005) o[mode] = n; }
      if (Object.keys(o).length) out.wallStrength[st] = o;
    }
    return out;
  }
  /** A change on top of the saved look: { doodles: "corners" }, { wallStrength: { a: { light: 0.1 } } }; null resets
   *  ({ wallStrength: { a: null } } = style a back to balanced; { wallStrength: { a: { dark: null } } } = only its dark). */
  function merge(prev, patch) {
    const cur = normalize(prev);
    const p = patch && typeof patch === "object" && !Array.isArray(patch) ? patch : {};
    const next = { ...cur, wallStrength: { ...cur.wallStrength } };
    for (const k of Object.keys(CHOICES)) if (k in p) next[k] = p[k];
    if (p.wallStrength === null) next.wallStrength = {};
    else if (p.wallStrength && typeof p.wallStrength === "object") {
      for (const [st, v] of Object.entries(p.wallStrength)) {
        if (!STYLES.includes(st)) continue;
        if (v === null) { delete next.wallStrength[st]; continue; }
        if (typeof v !== "object") continue;
        const o = { ...(next.wallStrength[st] || {}) };
        for (const mode of ["light", "dark"]) if (mode in v) { if (v[mode] === null) delete o[mode]; else o[mode] = v[mode]; }
        next.wallStrength[st] = o;
      }
    }
    return normalize(next);
  }
  /** The wallpaper strength in use for a style (0–0.30). */
  const strength = (look, style, mode) => { const v = normalize(look).wallStrength[style]?.[mode === "dark" ? "dark" : "light"]; return v ?? balanced(style, mode); };
  return { STYLES, DOODLE_STYLES, BALANCED, OWN_DOODLES, DEFAULTS, CHOICES, MAX, normalize, merge, strength, balanced };
});
