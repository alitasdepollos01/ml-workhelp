// The Look settings on the page (settings.look; rules in look-rules.js): turns them into <html> switches that
// skins-new.css and doodles.css read, through the DOM and CSSOM only (the CSP allows no style="…" in markup):
//   html[data-dwall="on"]       the quiet wallpaper (look.doodles "wall"), with html[data-dp="quiet"] for Y2K emo's wall strength
//   html[data-dstyle="<style>"] a doodle style picked (look.doodleStyle; "auto" = none: each style's own)
//   html[data-wallhead="full"]  the wallpaper runs under the page top too (look.wallHead)
//   html[data-mwall="plush"]    Whimsical's plush wall in the corner-stickers layout
//   --wop-l / --wop-d           the wallpaper strength, where it differs from the balanced value (look.wallStrength)
//   html[data-dlayout]          the layout the page draws (doodles.js): wall | corners; none with the doodles off
// Where the desktop app runs, it keeps the setting (settings.look, sent with the work status); elsewhere (a browser,
// the website's demo) the page keeps it itself (host.load / host.save).
import "./look-rules.js";
import "./visible-set.js";
import { host, state } from "./app-common.js";

const RULES = window.MLWH_LOOK_RULES, VIS = window.MLWH_VISIBLE;
const R = document.documentElement;
const listeners = new Set();
let local = null;        // the look as last changed here (until the app's status brings it back)
let applied = "";        // (what was last put on <html>: nothing to do when it's the same)

/** The look in use: the desktop app's, else the page's own. */
export function currentLook() {
  if (local) return local;
  return RULES.normalize(state.st && "look" in state.st ? state.st.look : null);
}
function ownLook() { try { const v = window.localStorage.getItem("mlwh:look"); return v ? JSON.parse(v) : null; } catch { return null; } }

/** Change some of it: { doodles: "corners" }, { wallStrength: { a: { light: 0.1 } } } (null resets; look-rules.js merge). */
export function saveLook(patch) {
  const next = RULES.merge(currentLook(), patch);
  local = next;
  if (host?.settingText) host.settingText("look", JSON.stringify(patch));
  else { try { window.localStorage.setItem("mlwh:look", JSON.stringify(next)); } catch { /* private windows: just for now */ } }
  applyLook();
  return next;
}
/** The app's status came (state.st): its look wins from now on, once it has the change made here. */
export function lookFromStatus(st) {
  if (st && "look" in st && local && JSON.stringify(RULES.normalize(st.look)) === JSON.stringify(local)) local = null;
  applyLook();
}
export const onLook = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

// (Y2K emo's badge row was removed on 28 Oct 2026: badges looked like pins. look.badges may stay in the settings, unused.)
export function setDoodleFiles() { applied = ""; applyLook(); }

const setData = (k, v) => { if (v == null) delete R.dataset[k]; else if (R.dataset[k] !== v) R.dataset[k] = v; };
const setVar = (k, v) => { if (v == null) R.style.removeProperty(k); else if (R.style.getPropertyValue(k) !== v) R.style.setProperty(k, v); };

/** Put the look on <html> (and tell doodles.js). Safe to call often. */
export function applyLook(look = currentLook()) {
  const style = R.dataset.style || "";
  const L = RULES.normalize(look);
  const sig = JSON.stringify([L, style]);
  if (sig === applied) return L;
  applied = sig;
  const on = L.doodles !== "off";
  setData("dlayout", on ? L.doodles : null);
  setData("dwall", L.doodles === "wall" ? "on" : null);
  setData("dp", L.doodles === "wall" ? "quiet" : null);
  setData("dstyle", on && L.doodleStyle !== "auto" ? L.doodleStyle : null);
  setData("wallhead", on && L.wallHead === "full" ? "full" : null);
  setData("mwall", style === "m" && L.doodles === "corners" ? "plush" : null);
  const ws = L.wallStrength[style] || {};
  setVar("--wop-l", L.doodles === "wall" && ws.light != null ? String(ws.light) : null);
  setVar("--wop-d", L.doodles === "wall" && ws.dark != null ? String(ws.dark) : null);
  listeners.forEach((fn) => { try { fn(L); } catch (e) { console.error(e); } });
  return L;
}

// The style can change under the page (preload.js sets html[data-style]): follow it.
new MutationObserver(() => { applied = ""; applyLook(); }).observe(R, { attributes: true, attributeFilter: ["data-style"] });
VIS.onChange(() => { applied = ""; applyLook(); });
// (no desktop app: the page's own look, kept in its storage)
if (!host?.settingText) { const own = ownLook(); if (own) local = RULES.normalize(own); }

// for the tests
window.__mlwhLook = { currentLook, saveLook, applyLook, rules: RULES, visible: VIS };
