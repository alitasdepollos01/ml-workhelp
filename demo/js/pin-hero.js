// The hero pin: a real 3D enamel pin (three.js, vendor/three, loaded with import() only when it's needed) for an
// opened EARNED pin and for the earning moment. Shape and metal come ready-made from pins/pin3d/<id>.json (the art
// pipeline's pin3d-shapes.mjs), so the page only draws the two SVGs onto textures. It renders only while something
// moves. Falls back to the CSS pin (pin3d.js) in the buddy window, without WebGL, on a software renderer
// (SwiftShader, llvmpipe), with reduced motion, or if three.js can't load. Never called for a locked pin.
//   mount(host, info, { mode: "cabinet" | "earn", onSide }) → { turn(), side(back), destroy(), ready, kind }
//   stage(info, opts) → a quiet stage (soft light + shadow) with the hero pin in it (call .hero.destroy() when it goes)
//   info: { id, tier (tier id), front, back, lines, lang, label }
import { PLATES } from "./pin-plates.js";
import { make, attach, flip3d } from "./pin3d.js";

const THREE_URL = new URL("../vendor/three/three.module.min.js", import.meta.url).href;
const ROOM_URL = new URL("../vendor/three/RoomEnvironment.js", import.meta.url).href;
const SHAPES = new URL("../pins/pin3d/", import.meta.url).href;
const RIM = { plain: 0x4a4552, silver: 0xc9ccd4, gold: 0xd9ab45, gem: 0xdfe3f0 };
const R = () => document.documentElement;
const q = new URLSearchParams(location.search);
export const isBuddy = () => q.get("mode") === "buddy" || /quick\.html$/.test(location.pathname) || window.MLHost?.mode === "buddy";
const reduced = () => R().dataset.prm === "1" || matchMedia("(prefers-reduced-motion: reduce)").matches;
let glOK = null;
/** WebGL 2 on real graphics hardware (not a software renderer). */
export function webgl() {
  if (glOK !== null) return glOK;
  try { const c = document.createElement("canvas"), gl = c.getContext("webgl2"); if (!gl) return (glOK = false);
    const d = gl.getExtension("WEBGL_debug_renderer_info"), r = String(d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    glOK = !/swiftshader|llvmpipe|software|basic render/i.test(r); gl.getExtension("WEBGL_lose_context")?.loseContext(); } catch { glOK = false; }
  return glOK;
}
export const canUse = () => R().dataset.hero !== "css" && !isBuddy() && !reduced() && webgl();
let libP = null; const lib = () => (libP ||= Promise.all([import(THREE_URL), import(ROOM_URL)]).then(([T, E]) => ({ T, Room: E.RoomEnvironment })));
const shapes = {}; const shape = (id) => (shapes[id] ||= fetch(SHAPES + encodeURIComponent(id) + ".json").then((r) => { if (!r.ok) throw new Error("no shape " + id); return r.json(); }));
const loadImg = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error("no " + src)); i.src = src; });
const cv = (n) => { const c = document.createElement("canvas"); c.width = c.height = n; return c; };
let current = null;

function fallback(host, info) {   // the CSS pin: leans, turns over on a click
  host.classList.remove("ph-loading"); host.querySelector("canvas")?.remove();
  const p = make({ ...info, flip: "click" }); host.append(p); attach(host);
  return { turn: () => flip3d(p), side: (back) => flip3d(p, back), isBack: () => p.classList.contains("is-flipped"), destroy: () => p.remove(), ready: Promise.resolve("css"), kind: "css", host, info };
}

export function mount(host, info, opts = {}) {
  // one 3D pin at a time: an older one still on the page (an opened pin under an earning moment) becomes the CSS pin
  if (current) { const old = current; old.destroy(); if (old.host && old.host !== host && old.host.isConnected && old.kind === "3d") fallback(old.host, old.info); }
  host.classList.add("ph-host");
  if (!canUse()) { current = fallback(host, info); return current; }
  host.classList.add("ph-loading");
  const ctl = { kind: "3d", host, info, turn: () => {}, side: () => {}, destroy: () => { ctl.dead = true; }, ready: null, dead: false };
  ctl.ready = build(host, info, opts, ctl).catch((e) => { if (ctl.dead) return "gone"; console.warn("hero pin: CSS instead", e && e.message); const f = fallback(host, info); Object.assign(ctl, f); return "css"; });
  return (current = ctl);
}

async function build(host, info, opts, ctl) {
  const TEX = 1024, mode = opts.mode || "cabinet";
  const [{ T, Room }, sh, fi, bi] = await Promise.all([lib(), shape(info.id), loadImg(info.front), info.back ? loadImg(info.back) : null]);
  if (ctl.dead) return "gone";
  const canvas = document.createElement("canvas"); canvas.setAttribute("aria-label", info.label || ""); canvas.setAttribute("role", "img");
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.NeutralToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new T.Scene(), pmrem = new T.PMREMGenerator(renderer), env = pmrem.fromScene(new Room(), 0.04); scene.environment = env.texture; pmrem.dispose();
  const key = new T.DirectionalLight(0xffffff, 1.4); key.position.set(-2, 3, 4); scene.add(key);
  const camera = new T.PerspectiveCamera(30, 1, 0.1, 20); camera.position.set(0, 0, mode === "earn" ? 2.15 : 2.55);
  // the front: metal under any see-through part of the body (a hang tag behind a hollow, a gap the outline closed), never black
  const fc = cv(TEX), fx = fc.getContext("2d"), oo = sh.outline[info.tier] || sh.outline.gold || Object.values(sh.outline)[0], kk = TEX / sh.grid;
  if (oo && oo.length > 4) { fx.beginPath(); for (let i = 0; i < oo.length; i += 2) fx[i ? "lineTo" : "moveTo"]((oo[i] + .5) * kk, (oo[i + 1] + .5) * kk); fx.closePath();
    fx.fillStyle = "#" + ((/^sp-/.test(info.id) ? RIM.gold : RIM[info.tier]) || RIM.gold).toString(16).padStart(6, "0"); fx.fill(); }   // series pins are gold-edged in their one tier
  fx.drawImage(fi, 0, 0, TEX, TEX);
  // the back, mirrored (its UVs use the front's x), with the engraving written on the plate
  const bm = cv(TEX); if (bi) { const bc = cv(TEX), bg = bc.getContext("2d"); bg.drawImage(bi, 0, 0, TEX, TEX); engrave(bg, info, TEX); const m = bm.getContext("2d"); m.translate(TEX, 0); m.scale(-1, 1); m.drawImage(bc, 0, 0); }
  // metal mask (run-length rows) → roughness (G) + metalness (B)
  const M = sh.metal.size, mc = cv(M), mg = mc.getContext("2d"), md = mg.createImageData(M, M), px = md.data;
  sh.metal.rle.split(";").forEach((row, y) => { let x = 0, v = 0; for (const n of row.split(",").map(Number)) { for (let i = 0; i < n; i++, x++) { const j = (y * M + x) * 4; px[j] = 255; px[j + 1] = v ? 70 : 105; px[j + 2] = v ? 255 : 0; px[j + 3] = 255; } v ^= 1; } });
  mg.putImageData(md, 0, 0);
  // the body: this tier's outline, smoothed, extruded with a bevel (the metal edge); hollow areas cut through
  const o = sh.outline[info.tier] || sh.outline.gold || Object.values(sh.outline)[0], G = sh.grid;
  const smooth = (Q) => { for (let it = 0; it < 2; it++) { const n = []; for (let i = 0; i < Q.length; i++) { const a = Q[i], b = Q[(i + 1) % Q.length]; n.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); } Q = n; } return Q; };
  const pairs = (f) => { const P = []; for (let i = 0; i < f.length; i += 2) P.push([f[i], f[i + 1]]); return P; };
  const V = ([x, y]) => new T.Vector2((x + .5) / G, 1 - (y + .5) / G);
  const shapeT = new T.Shape(smooth(pairs(o)).map(V));
  const holes = (sh.holes || {})[info.tier] || (sh.holes || {}).gold || [];
  for (const h of holes) shapeT.holes.push(new T.Path(smooth(pairs(h)).map(V)));
  const depth = 0.035, bev = 0.012;
  const geo = new T.ExtrudeGeometry(shapeT, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * .8, bevelSegments: 3, curveSegments: 4 });
  const caps = geo.groups[0], nz = geo.attributes.normal; let split = caps.start; for (let i = caps.start; i < caps.start + caps.count; i += 3) if (nz.getZ(i) > 0) { split = i; break; }
  const sides = geo.groups[1]; geo.clearGroups(); geo.addGroup(caps.start, split - caps.start, 2); geo.addGroup(split, caps.start + caps.count - split, 0); geo.addGroup(sides.start, sides.count, 1);
  geo.translate(-.5, -.5, -depth / 2);
  const tex = (c) => { const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t; };
  const mm = new T.CanvasTexture(mc), gem = info.tier === "gem";
  const front = new T.MeshPhysicalMaterial({ map: tex(fc), metalnessMap: mm, roughnessMap: mm, metalness: 1, roughness: 1, clearcoat: .7, clearcoatRoughness: .08, specularIntensity: .25, envMapIntensity: .7,
    ...(gem ? { iridescence: .6, iridescenceIOR: 1.6 } : {}) });
  const edge = new T.MeshStandardMaterial({ color: RIM[info.tier] || RIM.gold, metalness: 1, roughness: .26 });
  const back = new T.MeshStandardMaterial({ map: tex(bm), metalness: .75, roughness: .42 });
  const pin = new T.Group(); pin.add(new T.Mesh(geo, [front, edge, back]));
  // the clutch on the back; none floating in a hollow (skipped when it would sit inside a cut-out hole)
  const C = PLATES[info.id]?.clutch;
  const inPoly = (x, y, a) => { let c = false; for (let i = 0, j = a.length - 2; i < a.length; j = i, i += 2) { const xi = a[i], yi = a[i + 1], xj = a[j], yj = a[j + 1]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
  const inHole = (c) => holes.some((h) => inPoly((64 - c[0]) * G / 64, c[1] * G / 64, h));
  if (C && !inHole(C)) { const cx = 1 - C[0] / 64 - .5, cy = 1 - C[1] / 64 - .5, z0 = -depth / 2 - bev;
    const post = new T.Mesh(new T.CylinderGeometry(.008, .008, .09, 12), edge); post.rotation.x = Math.PI / 2; post.position.set(cx, cy, z0 - .045); pin.add(post);
    const cl = new T.Mesh(new T.CylinderGeometry(C[2] / 64, C[2] / 64 * .9, .028, 28), new T.MeshPhysicalMaterial({ color: 0xff8fb4, roughness: .55, clearcoat: .3 }));
    cl.rotation.x = Math.PI / 2; cl.position.set(cx, cy, z0 - .06); pin.add(cl); }
  const pivot = new T.Group(); pivot.add(pin); scene.add(pivot);
  if (ctl.dead) { renderer.dispose(); return "gone"; }
  host.classList.remove("ph-loading"); host.append(canvas);

  // motion: a spin-in, then still; drag to spin (it settles on the nearest side); turn() shows the other side. Renders only while moving.
  const S0 = mode === "earn" ? .35 : .8;
  let angle = mode === "earn" ? -Math.PI * 5 : -Math.PI * 2, target = 0, vel = 0, drag = false, lastX = 0, t0 = performance.now(), raf = 0, scale = S0, lastT = t0;
  let settledSide = false; const isBack = (a) => Math.abs(Math.round(a / Math.PI)) % 2 === 1;
  const SPIN = mode === "earn" ? 1400 : 1000, ease = (x) => 1 - Math.pow(1 - x, 3), a0 = angle;
  const size = () => { const r = host.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height || 1; camera.updateProjectionMatrix(); };
  size(); const ro = new ResizeObserver(() => { size(); kick(); }); ro.observe(host);
  function tick(t) {
    raf = 0; const dt = Math.min(.05, (t - lastT) / 1000); lastT = t; let moving = false;
    const k = Math.min(1, (t - t0) / SPIN);
    if (k < 1) { angle = a0 + (target - a0) * ease(k); scale = S0 + (1 - S0) * ease(k); moving = true; }
    else if (drag) moving = true;
    else if (Math.abs(vel) > .05) { angle += vel * dt; vel *= Math.pow(.04, dt); moving = true; if (Math.abs(vel) <= .05) target = Math.round(angle / Math.PI) * Math.PI; }
    else if (Math.abs(target - angle) > .001) { angle += (target - angle) * Math.min(1, dt * 6); moving = true; }
    else { if (angle !== target || settledSide !== isBack(target)) { settledSide = isBack(target); opts.onSide && opts.onSide(settledSide); } angle = target; scale = 1; }
    pivot.rotation.y = angle; pivot.rotation.x = Math.sin(angle * .5) * .06; pivot.scale.setScalar(scale);
    renderer.render(scene, camera); ctl.frames = (ctl.frames || 0) + 1;
    if (moving && !document.hidden) raf = requestAnimationFrame(tick);
  }
  const kick = () => { if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(tick); } };
  canvas.addEventListener("pointerdown", (e) => { drag = true; lastX = e.clientX; vel = 0; t0 = -1e9; canvas.setPointerCapture(e.pointerId); kick(); });
  canvas.addEventListener("pointermove", (e) => { if (!drag) return; const dx = e.clientX - lastX; lastX = e.clientX; angle += dx * .013; vel = dx * .013 * 60; kick(); });
  const up = () => { if (!drag) return; drag = false; if (Math.abs(vel) <= .05) target = Math.round(angle / Math.PI) * Math.PI; kick(); };
  canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
  document.addEventListener("visibilitychange", kick);
  ctl.turn = () => { t0 = -1e9; vel = 0; target = (Math.round(angle / Math.PI) + 1) * Math.PI; kick(); return isBack(target); };
  ctl.side = (b) => { if (isBack(Math.round(angle / Math.PI) * Math.PI) !== !!b) ctl.turn(); };
  ctl.isBack = () => isBack(target);
  ctl.destroy = () => { ctl.dead = true; if (raf) cancelAnimationFrame(raf); raf = 0; ro.disconnect(); document.removeEventListener("visibilitychange", kick);
    scene.traverse((x) => { x.geometry?.dispose(); [].concat(x.material || []).forEach((m) => { ["map", "metalnessMap", "roughnessMap"].forEach((k2) => m[k2]?.dispose()); m.dispose(); }); });
    env.texture.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); if (current === ctl) current = null; };
  ctl.renderer = renderer; kick();
  return "3d";
}

function engrave(gc, info, TEX) {
  const L = PLATES[info.id]; const lines = info.lines || []; if (!L || !lines[0]) return;
  const k = TEX / 64, [x, y, w, h] = L.plate.map((v) => v * k), cxp = x + w / 2;
  const fam = '-apple-system, BlinkMacSystemFont, "PingFang TC", "Noto Sans Thai", "Helvetica Neue", Arial, sans-serif', f = (s, wt) => `${wt} ${s}px ${fam}`;
  gc.save(); gc.textAlign = "center"; gc.textBaseline = "middle"; gc.fillStyle = "#3d3a44"; gc.shadowColor = "rgba(255,255,255,.5)"; gc.shadowOffsetY = k * .06;
  const rows = [[lines[0], 1, 700, 1], [lines[1], .72, 600, .85], [lines[2], .6, 600, .65]].filter((r) => r[0]);
  let fs = h * .34; const fits = () => rows.reduce((a, r) => a + fs * r[1] * 1.12, 0) <= h * .96 && rows.every((r) => { gc.font = f(fs * r[1], r[2]); return gc.measureText(r[0]).width <= w * .94; });
  while (!fits() && fs > 7) fs -= .5;
  while (rows.length > 1 && !fits()) rows.pop();   // like pin-back.js: drop line 3, then line 2, when even the smallest size doesn't fit
  let yy = y + h / 2 - rows.reduce((a, r) => a + fs * r[1] * 1.12, 0) / 2;
  for (const [t, sc, wt, al] of rows) { gc.font = f(fs * sc, wt); gc.globalAlpha = al; yy += fs * sc * .56; gc.fillText(t, cxp, yy, w * .94); yy += fs * sc * .56; }
  gc.restore();
}

/** A quiet stage for an opened pin: soft light on the card's own background and a shadow, no box. */
export function stage(info, opts = {}) {
  const st = document.createElement("div"); st.className = "ph-stage";
  const host = document.createElement("div"); st.append(host); st.hero = null;
  let tries = 0;   // mount once it's in the page and has a size
  const go = () => { if (st.hero || !(++tries < 100)) return; if (st.isConnected && host.getBoundingClientRect().width) st.hero = mount(host, info, { mode: "cabinet", onSide: opts.onSide }); else setTimeout(go, 30); };
  setTimeout(go, 0);   // (a timer, not a frame: a window the system isn't drawing gets no frames, and the pin must still be there)
  return st;
}
/** Start loading three.js early (an earned pin is about to open). */
export const preload = () => (canUse() ? lib().catch(() => null) : null);
