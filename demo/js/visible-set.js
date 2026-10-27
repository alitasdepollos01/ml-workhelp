// The spoiler rule (Myra, 26 Oct; proto/pins/research/placement-spoiler-spots.md): before a pin is earned, the page's
// decorations use only the VISIBLE set: Myra's 12 wall motifs + the 5 doodles that aren't pins, plus two she chose on
// purpose for one spot each: the camera (c_title, the Photo credits title) and Ajarn Maewnam (n_work, the "Work corner"
// heading). Each pin earned adds its own doodle (setEarned). Drama and classic pins (doodles/pins/: d-*, milklove, smile)
// aren't pin designs of a doodle, so they pass. Every doodle the app draws goes through guard() (doodles.js, look.js).
//
// A classic script and a CommonJS module both (the app's page loads it as an ES module through look.js, the tests
// require it): window.MLWH_VISIBLE / module.exports.
(function (root, make) {
  const api = make();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MLWH_VISIBLE = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  const MOTIFS = ["whale", "seal", "ws-bike", "vespa", "sunearth", "s235-alien", "headphones", "ballet", "mz-film", "wh-gem", "milk", "ml-logo"]; // = tools/styles/config/wallMotifs.myra.json
  const DOODLES = ["heart", "star", "smile", "check", "bolt"];
  const SPOT_EXTRA = { c_title: ["camera"], n_work: ["ws-ajarn"], s_title: ["dress"] }; // (the dress: the Stickers title only, never the decorate tray)
  // each changed spot's visible default (used when a placement names something outside the set)
  const SPOT_DEFAULT = { s_title: "ballet", s_hcorner: "mz-film", d_title: "sunearth", d_tile: "wh-gem", c_title: "camera", n_work: "ws-ajarn" };
  const BASE = new Set([...MOTIFS, ...DOODLES]);
  let earned = new Set();
  let showAll = false; // (tests only: setShowAll; the prototype's ?visible=all)
  const listeners = new Set();
  const idOf = (item) => (item && typeof item === "object" && item.kind === "badge" ? item.id : String(item || "").replace(/^badge:/, ""));
  const isBadge = (item) => (item && typeof item === "object" && item.kind === "badge") || String(item || "").startsWith("badge:");
  /** Is this item allowed in this spot? isPinMotif(id): true for a doodle motif that has a pin (anything else passes). */
  function ok(item, spot, isPinMotif) {
    if (showAll || !item || item === "none") return true;
    const id = idOf(item);
    if (isPinMotif && !isPinMotif(id)) return true;
    return BASE.has(id) || earned.has(id) || (SPOT_EXTRA[spot] || []).includes(id);
  }
  /** The item if it's visible here, else the fallback (in the same form: a pin stays a pin), else "none". A list keeps its visible items. */
  function guard(item, spot, fallback, isPinMotif) {
    if (Array.isArray(item)) { const v = item.filter((x) => ok(x, spot, isPinMotif)); return v.length ? v : guard(fallback, spot, "none", isPinMotif); }
    if (ok(item, spot, isPinMotif)) return item;
    const fb = fallback == null ? SPOT_DEFAULT[spot] || "none" : fallback, f = Array.isArray(fb) ? fb[0] : fb;
    if (!f || f === "none" || !ok(f, spot, isPinMotif)) return "none";
    return isBadge(item) && !isBadge(f) ? "badge:" + f : f;
  }
  /** The pins engine (track B1) calls this with the motif ids of every pin earned so far; the pages redraw. */
  function setEarned(ids) {
    const next = new Set((ids || []).map((x) => idOf(x)).filter(Boolean));
    if (next.size === earned.size && [...next].every((x) => earned.has(x))) return;
    earned = next;
    listeners.forEach((fn) => { try { fn(); } catch { /* a listener's own problem */ } });
  }
  /** Everything a decoration may show right now (sorted). */
  const visible = () => [...new Set([...BASE, ...earned])].sort();
  return {
    MOTIFS, DOODLES, SPOT_EXTRA, SPOT_DEFAULT, ok, guard, setEarned, visible,
    earned: () => [...earned].sort(),
    onChange: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    setShowAll: (on) => { showAll = !!on; listeners.forEach((fn) => fn()); },
    get showAll() { return showAll; },
  };
});
