// The picture card (Data › Make a picture), drawn on a canvas: the same drawing for the Decorate stage and for the
// downloaded PNG (at 2×, 880 × 620), so the picture is the same in every host. From the card-deco prototype's
// assets/card.js (proto/card-deco/).
//   drawBase(ctx, o)    the background, the words, the little pictures (tomatoes, goal bars, the days' squares), the sticker
//   drawCredits(ctx, o) the credit label: the photographer's line, and the design line once the card has a decoration;
//                       always the top layer (decorations go under it)
// Each returns the boxes it used, so the layout helper (card-deco.js) keeps decorations off the words.
// Looks: Whimsical (m) and Y2K emo (i) have their own card (fixed palettes, as their pages); every other style is the
// card the app always made (its colour theme's --primary and --control-bg), and Purikura (f) adds its photo-booth
// frame and ✦ (Myra, 27 Oct: keep the frame).

export const W = 440, H = 310;

// ---- colours ----
const cv1 = typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null;
/** Any CSS colour → [r, g, b, a] (the canvas parses it). */
function parse(c, fb = "#ffffff") {
  if (!cv1) return [255, 255, 255, 1];
  cv1.fillStyle = fb; cv1.fillStyle = String(c || fb).trim() || fb;
  const s = cv1.fillStyle;
  if (s[0] === "#") { const n = parseInt(s.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]; }
  const m = s.match(/[\d.]+/g) || [255, 255, 255, 1];
  return [+m[0], +m[1], +m[2], m[3] == null ? 1 : +m[3]];
}
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
/** color-mix(in srgb, a p, b) */
const mix = (a, p, b) => { const A = parse(a), B = parse(b); return rgb(A.map((v, i) => v * p + B[i] * (1 - p))); };

// Whimsical and Y2K emo keep their own palettes (as their pages do, whatever the colour theme)
const PAL = {
  m: { light: { ink: "#4a1838", muted: "#7d4f68", big: "#b0256a", mint: "#6fdcd0" }, dark: { ink: "#fbe9f2", muted: "#d9b8cb", big: "#ff9cc8", mint: "#6fdcd0" } },
  i: { light: { card: "#ffffff", line: "#151515", ink: "#151515", muted: "#3c4046", red: "#b4202e", hl: "#fff04d" },
    dark: { card: "#1d2027", line: "#e9e9ec", ink: "#f4f3f5", muted: "#c4c8cf", red: "#ff8a95", hl: "#fff04d" } },
};
const PINK = { light: "#e48aa6", dark: "#e99ab2" }; // Purikura's frame and ✦

// ---- fonts (the style's own; Thai and Chinese fall back to the style's Thai face, then Huninn, then the system) ----
const FONTS = {
  f: { text: '"Nunito", "Mali", "ML Huninn", "PingFang TC", sans-serif', big: '"Baloo 2", "Mali", "ML Huninn", "PingFang TC", sans-serif' },
  // Whimsical's titles: Lily Script One for Latin, 寒蟬圓黑體 Bold ("ZH goround") for Chinese, Mitr for Thai
  m: { text: '"Nunito", "Mitr", "ML Huninn", "PingFang TC", sans-serif', big: '"Lilita One", "Mitr", "ML Huninn", "PingFang TC", sans-serif', title: '"Lily Script One", "ZH goround", "Mitr", "ML Huninn", "PingFang TC", cursive' },
  i: { text: '"DM Sans", "Kanit", "ML Huninn", "PingFang TC", sans-serif', big: '"Permanent Marker", "Kanit", "ML Huninn", "PingFang TC", cursive' },
};

/**
 * The look for a style: { st ("m" | "i" | "x": the theme's card), purikura, P (colours), F (fonts), radius }.
 * css: the page's own values for the theme's card ({ primary, ctrl, ink, muted, text, big }, read by cssLook()).
 */
export function cardLook(style, dark, css = {}) {
  const mode = dark ? "dark" : "light";
  if (style === "m" || style === "i") return { st: style, purikura: false, P: PAL[style][mode], F: FONTS[style], radius: style === "m" ? 24 : [16, 5, 14, 6] };
  const P = { ctrl: css.ctrl || (dark ? "#212c25" : "#ffffff"), primary: css.primary || (dark ? "#8fd1a8" : "#3f7d5c"), ink: css.ink || (dark ? "#e8f1eb" : "#22352a"),
    muted: css.muted || (dark ? "#9fb3a6" : "#5d7164"), accent: PINK[mode] };
  const F = style === "f" ? FONTS.f : { text: css.text || FONTS.f.text, big: css.big || css.text || FONTS.f.big };
  return { st: "x", purikura: style === "f", P, F, radius: 20 };
}

/** The theme's card colours and the style's fonts, read from the page (a probe inside the app's own CSS). */
export function cssLook() {
  if (typeof document === "undefined") return {};
  const R = getComputedStyle(document.documentElement), v = (k) => R.getPropertyValue(k).trim();
  const h2 = document.querySelector("main .page-top h2");
  return { primary: v("--primary"), ctrl: v("--control-bg"), ink: v("--desk-ink"), muted: v("--desk-muted"),
    text: getComputedStyle(document.body).fontFamily, big: h2 ? getComputedStyle(h2).fontFamily : "" };
}

/** What to ask document.fonts for before drawing (so the canvas never falls back mid-draw). */
export function fontList(lk) {
  const out = [];
  for (const k of Object.keys(lk.F)) for (const w of [400, 600, 700, 800]) out.push(`${w} 20px ${lk.F[k]}`);
  return out;
}

// ---- shapes ----
export function rr(ctx, x, y, w, h, r) { // r: a number or [tl, tr, br, bl]
  const [a, b, c, d] = Array.isArray(r) ? r : [r, r, r, r];
  ctx.beginPath(); ctx.moveTo(x + a, y); ctx.lineTo(x + w - b, y); ctx.quadraticCurveTo(x + w, y, x + w, y + b); ctx.lineTo(x + w, y + h - c);
  ctx.quadraticCurveTo(x + w, y + h, x + w - c, y + h); ctx.lineTo(x + d, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - d); ctx.lineTo(x, y + a); ctx.quadraticCurveTo(x, y, x + a, y); ctx.closePath();
}
export function clipCard(ctx, lk) { rr(ctx, 0, 0, W, H, lk.radius); ctx.clip(); }
// CSS linear-gradient(<deg>) across a w×h box
function cssGrad(ctx, w, h, deg, stops) {
  const a = (deg * Math.PI) / 180, len = Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a));
  const dx = (Math.sin(a) * len) / 2, dy = (-Math.cos(a) * len) / 2;
  const g = ctx.createLinearGradient(w / 2 - dx, h / 2 - dy, w / 2 + dx, h / 2 + dy);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}
function seeded(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function sparkle(ctx, x, y, r, color) { // a four-point star
  ctx.save(); ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x + r * 0.18, y - r * 0.18, x + r, y); ctx.quadraticCurveTo(x + r * 0.18, y + r * 0.18, x, y + r);
  ctx.quadraticCurveTo(x - r * 0.18, y + r * 0.18, x - r, y); ctx.quadraticCurveTo(x - r * 0.18, y - r * 0.18, x, y - r); ctx.fill(); ctx.restore();
}

// ---- words ----
function fit(ctx, text, max) { // one line, … when it runs out of room
  if (ctx.measureText(text).width <= max) return text;
  let t = text; while (t.length > 1 && ctx.measureText(t + "…").width > max) t = t.slice(0, -1);
  return t + "…";
}
function wrap(ctx, text, max, lines = 2) {
  // Thai and Chinese have no spaces: break between words (Intl.Segmenter keeps Thai words whole)
  const seg = typeof Intl !== "undefined" && Intl.Segmenter ? [...new Intl.Segmenter(undefined, { granularity: "word" }).segment(text)].map((s) => s.segment) : text.split(/(\s+)/);
  const out = []; let cur = "";
  for (let k = 0; k < seg.length; k++) {
    const s = seg[k];
    if (ctx.measureText(cur + s).width <= max || !cur) { cur += s; continue; }
    out.push(cur.trimEnd()); cur = s.trimStart();
    if (out.length === lines - 1) { cur = fit(ctx, cur + seg.slice(k + 1).join(""), max); break; }
  }
  if (cur) out.push(cur);
  return out.slice(0, lines);
}

// ---- the sticker with its white die-cut edge (drawn as it is: never cut, changed or saved back) ----
function stickerEdge(ctx, img, x, y, w, h, st, dark, scale) {
  const edge = st === "m" ? 3 : 2, pad = 16;
  const off = document.createElement("canvas"); off.width = Math.ceil((w + pad * 2) * scale); off.height = Math.ceil((h + pad * 2) * scale);
  const o = off.getContext("2d"); o.scale(scale, scale); o.drawImage(img, pad, pad, w, h);
  o.globalCompositeOperation = "source-in"; o.fillStyle = "#fff"; o.fillRect(0, 0, w + pad * 2, h + pad * 2);
  ctx.save();
  if (st === "i") { ctx.shadowColor = "rgba(21,21,21,.55)"; ctx.shadowOffsetX = 3 * scale; ctx.shadowOffsetY = 3 * scale; ctx.shadowBlur = 0; }
  else if (st === "m") { ctx.shadowColor = dark ? "rgba(255,140,200,.45)" : "rgba(240,106,164,.35)"; ctx.shadowOffsetY = (dark ? 0 : 6) * scale; ctx.shadowBlur = (dark ? 12 : 10) * scale; }
  else { ctx.shadowColor = "rgba(40,20,30,.25)"; ctx.shadowOffsetY = 4 * scale; ctx.shadowBlur = 6 * scale; }
  ctx.drawImage(off, x - pad, y - pad, w + pad * 2, h + pad * 2);
  ctx.restore();
  for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; ctx.drawImage(off, x - pad + Math.cos(a) * edge, y - pad + Math.sin(a) * edge, w + pad * 2, h + pad * 2); }
  ctx.drawImage(img, x, y, w, h);
}

// ---- Whimsical's signature title: pink chrome script on the frosted label (the page titles' H2 look) ----
function chromeTitle(ctx, text, x, y, o, F) {
  const px = o.lang === "zh" ? 28 : o.lang === "th" ? 27 : 30, lh = Math.round(px * 1.2), f = `400 ${px}px ${F.title}`;
  ctx.save(); ctx.font = f; ctx.textBaseline = "top";
  const w = Math.min(ctx.measureText(text).width, W * 0.6), padX = 16, padY = 7, bw = w + padX * 2, bh = lh + padY * 2;
  ctx.save();
  ctx.shadowColor = o.dark ? "rgba(0,0,0,.55)" : "rgba(40,40,100,.32)"; ctx.shadowBlur = 16; ctx.shadowOffsetY = 8;
  const g = ctx.createLinearGradient(0, y, 0, y + bh);
  if (o.dark) { g.addColorStop(0, "rgba(40,34,78,.62)"); g.addColorStop(1, "rgba(30,26,60,.55)"); } else { g.addColorStop(0, "rgba(255,255,255,.8)"); g.addColorStop(1, "rgba(255,255,255,.72)"); }
  ctx.fillStyle = g; rr(ctx, x, y, bw, bh, 16); ctx.fill(); ctx.restore();
  ctx.save(); ctx.lineWidth = 1; ctx.strokeStyle = o.dark ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.65)"; rr(ctx, x + 0.5, y + 0.5, bw - 1, bh - 1, 15.5); ctx.stroke();
  if (!o.dark) { ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.beginPath(); ctx.moveTo(x + 14, y + 1.5); ctx.lineTo(x + bw - 14, y + 1.5); ctx.stroke(); }
  ctx.restore();
  const tx = x + padX, boxTop = y + padY, ty = boxTop + (lh - px) / 2, d = o.lang === "zh" ? 1.2 : 1.5;
  const draw = (fill, dx, dy) => { ctx.fillStyle = fill; ctx.fillText(text, tx + dx, ty + dy, W * 0.6); };
  if (o.dark) draw("#1f8a76", d, d);
  else { draw("#6fdcd0", d, d); draw("#6fdcd0", d, d - 1); draw("#ffffff", 0, -1); }
  const cg = ctx.createLinearGradient(0, boxTop, 0, boxTop + lh);
  const stops = o.dark ? [[0, "#fff0f6"], [0.36, "#ffc6de"], [0.5, "#ff8fc0"], [0.6, "#ffd6e8"], [1, "#ffb3d3"]] : [[0, "#c2337a"], [0.34, "#cc3f86"], [0.5, "#8e1650"], [0.58, "#b52d70"], [1, "#a32664"]];
  for (const [k, c] of stops) cg.addColorStop(k, c);
  draw(cg, 0, 0);
  ctx.restore();
  return { x, y, w: bw, h: bh };
}

// each kind's two colours on the theme's card (the same as the app's .share-card.k-* rules)
const KIND_BG = { week: [["P", 0.35], ["#f2a7c3", 0.3]], day: [["#ffe27a", 0.4], ["#f2a7c3", 0.3]], pomo: [["#f2a7c3", 0.4], ["#ffc2a8", 0.35]],
  thai: [["#c9bdf3", 0.4], ["#f2a7c3", 0.3]], goal: [["#a9d4f2", 0.4], ["P", 0.25]], month: [["#f6e7c8", 0.5], ["P", 0.25]] };

/**
 * The card.
 * o: { look (cardLook()), dark, lang, kind, model: { kicker, focus, big, thai (the big line is a Thai word), lines: [],
 *      marks: { dots: n } | { bars: [{ f (0–1), hit }] } | { cal: [0–1 or 0] } }, sticker: HTMLImageElement | null, scale }
 */
export function drawBase(ctx, o) {
  const lk = o.look, st = lk.st, P = lk.P, zones = { text: [], sticker: null };
  ctx.save(); clipCard(ctx, lk);
  // the background
  if (st === "m") {
    const sky = o.dark ? [[0, "#1b2142"], [0.2, "#262a56"], [0.42, "#3a2d64"], [0.62, "#4a2f5e"], [0.82, "#33243f"], [1, "#2b2140"]]
      : [[0, "#5d7ea3"], [0.14, "#7c92b8"], [0.28, "#a8a9cb"], [0.42, "#e2b2c8"], [0.56, "#f6c8d7"], [0.72, "#fde3ec"], [1, "#fff4f7"]];
    ctx.fillStyle = cssGrad(ctx, W, H, 180, sky); ctx.fillRect(0, 0, W, H);
    sparkle(ctx, W - 150, 26, 7, "rgba(255,236,190,.95)"); sparkle(ctx, W - 132, 44, 4, "rgba(255,255,255,.9)"); sparkle(ctx, W - 166, 48, 3, "rgba(255,255,255,.75)");
    ctx.save(); ctx.lineWidth = 3; ctx.strokeStyle = o.dark ? "rgba(255,255,255,.22)" : "rgba(255,255,255,.9)"; rr(ctx, 1.5, 1.5, W - 3, H - 3, 22); ctx.stroke(); ctx.restore();
  } else if (st === "i") {
    ctx.fillStyle = P.card; ctx.fillRect(0, 0, W, H);
    const r = seeded(7); ctx.fillStyle = o.dark ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.06)";
    for (let k = 0; k < 420; k++) ctx.fillRect(r() * W, r() * H, 1 + r() * 1.4, 1 + r() * 1.4);
    ctx.save(); ctx.fillStyle = "#b4202e"; ctx.fillRect(0, 0, W, 16);
    ctx.fillStyle = "rgba(0,0,0,.38)"; for (let x = 0; x < W; x += 22) ctx.fillRect(x, 0, 5, 16); for (let y = 0; y < 16; y += 22) ctx.fillRect(0, y, W, 5);
    ctx.fillStyle = "rgba(255,255,255,.18)"; for (let x = 12; x < W; x += 22) ctx.fillRect(x, 0, 2, 16); ctx.fillRect(0, 12, W, 2);
    ctx.fillStyle = P.line; ctx.fillRect(0, 16, W, 2.5); ctx.restore();
  } else {
    const [[a, pa], [b, pb]] = KIND_BG[o.kind] || KIND_BG.week, c = (x) => (x === "P" ? P.primary : x);
    ctx.fillStyle = cssGrad(ctx, W, H, 150, [[0, mix(c(a), pa, P.ctrl)], [1, mix(c(b), pb, P.ctrl)]]); ctx.fillRect(0, 0, W, H);
    if (lk.purikura) { // the photo-booth frame: a dashed line inside the edge
      ctx.save(); ctx.setLineDash([7, 5]); ctx.lineWidth = 2; ctx.strokeStyle = rgb(parse(P.accent), o.dark ? 0.45 : 0.55); rr(ctx, 6, 6, W - 12, H - 12, 15); ctx.stroke(); ctx.restore();
    }
  }

  // the words
  const L = 22, maxW = W * 0.6, F = lk.F;
  const font = (kind, w, px) => `${w} ${px}px ${F[kind] || F.text}`;
  const line = (text, f, color, y, lh, opts = {}) => {
    ctx.font = f; ctx.fillStyle = color; ctx.textBaseline = "top";
    const t = fit(ctx, String(text), opts.max || maxW), w = ctx.measureText(t).width;
    if (opts.under) opts.under(L, y, w, lh);
    if (opts.drop) { ctx.save(); ctx.fillStyle = opts.drop; ctx.fillText(t, L + 1.5, y + 1.5 + (opts.dy || 0)); ctx.restore(); }
    ctx.fillText(t, L, y + (opts.dy || 0));
    zones.text.push({ x: L - 4, y: y - 2, w: w + 8, h: lh + 2 });
    return y + lh;
  };
  const ink = P.ink, muted = st === "x" ? P.ink : P.muted;
  const M = o.model;
  let y = st === "i" ? 28 : 20;
  y = line("ML WorkHelp", font("text", 700, 12), st === "m" ? "rgba(255,255,255,.85)" : rgb(parse(muted), 0.75), y, 18);
  // the kicker (Whimsical: the card's title, in the style's chrome)
  if (st === "m") { const z = chromeTitle(ctx, M.kicker, L - 10, y + 2, o, F); zones.text.push(z); y = z.y + z.h + 4; }
  else if (st === "i") y = line(M.kicker, o.lang === "en" ? font("big", 400, 18) : font("text", 700, 16), P.red, y + 2, 25);
  else {
    y = line(M.kicker, font("text", 700, 15), rgb(parse(ink), 0.8), y + 2, 22);
    if (lk.purikura) { const z = zones.text[zones.text.length - 1]; ctx.font = font("text", 700, 12); ctx.fillStyle = P.accent; ctx.fillText("✦", z.x + z.w + 2, z.y + 5); }
  }
  if (M.focus) { ctx.font = font("text", 800, 19); for (const l of wrap(ctx, M.focus, maxW, 2)) y = line(l, font("text", 800, 19), ink, y + 1, 24); }
  // the big line shrinks (down to 26 px) rather than run into the sticker in a longer language
  if (M.big != null && M.big !== "") {
    let px = M.thai ? 50 : st === "m" ? 38 : 36;
    const bigF = (n) => (st === "x" ? font("big", 800, n) : font("big", 400, n));
    ctx.font = bigF(px); while (px > 22 && ctx.measureText(M.big).width > maxW - (st === "i" ? 14 : 0)) { px -= 1; ctx.font = bigF(px); }
    const lh = Math.round(px * (M.thai ? 1.27 : 1.25));
    if (st === "i") y = line(M.big, bigF(px), "#151515", y + 6, lh, { dy: 4, under: (x, yy, w, h) => { ctx.save(); ctx.fillStyle = P.hl; ctx.beginPath(); ctx.moveTo(x - 10, yy + h * 0.12); ctx.lineTo(x + w + 12, yy + 2); ctx.lineTo(x + w + 9, yy + h - 2); ctx.lineTo(x - 7, yy + h + 1); ctx.closePath(); ctx.fill(); ctx.restore(); } });
    else if (st === "m") y = line(M.big, bigF(px), P.big, y + 2, lh, { drop: P.mint, dy: 2 });
    else y = line(M.big, bigF(px), ink, y + 2, lh, { dy: 2 });
  }
  // the small lines
  const small = (t) => { ctx.font = font("text", 600, 14); for (const l of wrap(ctx, t, maxW, 2)) y = line(l, font("text", 600, 14), ink, y, 20); };
  for (const t of M.lines || []) if (t) small(t);
  // the little pictures (kept as a zone, so decorations stay off them)
  const mk = M.marks || {}, gw = W * 0.56;
  const mark = { x: [o.dark ? "#ff8a80" : "#e2584f", P.primary], m: [o.dark ? "#ff9cc8" : "#f06aa4", o.dark ? "#8de2c8" : "#1f8a76"], i: [P.red, P.ink] }[st];
  if (mk.dots) {
    const n = Math.min(mk.dots, 40), per = Math.floor((gw + 5) / 23), y0 = y + 6;
    for (let k = 0; k < n; k++) {
      const cx = L + (k % per) * 23 + 9, cy = y0 + Math.floor(k / per) * 23 + 9;
      ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fillStyle = mark[0]; ctx.fill();
      if (st === "i") { ctx.lineWidth = 1.5; ctx.strokeStyle = P.line; ctx.stroke(); } else { ctx.beginPath(); ctx.arc(cx, cy + 1.5, 9, 0.15 * Math.PI, 0.85 * Math.PI); ctx.lineWidth = 2; ctx.strokeStyle = "rgba(0,0,0,.12)"; ctx.stroke(); }
    }
    const rows = Math.ceil(n / per); zones.text.push({ x: L - 4, y: y0 - 2, w: Math.min(n, per) * 23 + 6, h: rows * 23 + 4 }); y = y0 + rows * 23;
    if (mk.more) small(mk.more);
  } else if (mk.bars && mk.bars.length) {
    const bars = mk.bars, bw = (gw - 6 * (bars.length - 1)) / bars.length, y0 = y + 8, bh = Math.min(80, H - 60 - y0);
    bars.forEach((d, k) => { const h = Math.max(4, d.f * bh), x = L + k * (bw + 6); ctx.save(); ctx.globalAlpha = d.hit ? 1 : 0.5; ctx.fillStyle = mark[1]; rr(ctx, x, y0 + bh - h, bw, h, [5, 5, 2, 2]); ctx.fill(); if (st === "i") { ctx.globalAlpha = 1; ctx.lineWidth = 1.5; ctx.strokeStyle = P.line; ctx.stroke(); } ctx.restore(); });
    zones.text.push({ x: L - 4, y: y0 - 2, w: gw + 8, h: bh + 4 }); y = y0 + bh;
  } else if (mk.cal && mk.cal.length) {
    const y0 = y + 8, rows = Math.ceil(mk.cal.length / 7), sz = rows > 4 ? 15 : 18, step = sz + 4;
    mk.cal.forEach((f, k) => { ctx.save(); ctx.globalAlpha = f ? 0.25 + 0.75 * f : 0.1; ctx.fillStyle = mark[1]; rr(ctx, L + (k % 7) * step, y0 + Math.floor(k / 7) * step, sz, sz, 4); ctx.fill(); ctx.restore(); });
    zones.text.push({ x: L - 4, y: y0 - 2, w: 7 * step + 6, h: rows * step + 2 }); y = y0 + rows * step;
  }

  // the sticker: bottom right, above the credit
  if (o.sticker && o.sticker.naturalWidth) {
    const bh = H * 0.6, bw = W * 0.46, r = Math.min(bw / o.sticker.naturalWidth, bh / o.sticker.naturalHeight);
    const w = o.sticker.naturalWidth * r, h = o.sticker.naturalHeight * r, x = W - 14 - w, yy = H - 54 - h;
    stickerEdge(ctx, o.sticker, x, yy, w, h, st, o.dark, o.scale || 1);
    zones.sticker = { x, y: yy, w, h };
  }
  ctx.restore();
  zones.bottom = y;
  return zones;
}

/** The credit label: the photographer's line (as always) and the design line, in the card's own look. o: { look, dark, photoLine, decoLine } */
export function drawCredits(ctx, o) {
  const lk = o.look, st = lk.st, dark = o.dark;
  const l1 = o.photoLine || null, l2 = o.decoLine || null;
  if (!l1 && !l2) return null;
  ctx.save(); clipCard(ctx, lk);
  const f1 = `700 13px ${lk.F.text}`, f2 = `700 11px ${lk.F.text}`;
  ctx.font = f1; const w1 = l1 ? ctx.measureText(l1).width : 0; ctx.font = f2; const w2 = l2 ? ctx.measureText(l2).width : 0;
  const padX = 12, w = Math.min(W - 28, Math.max(w1, w2) + padX * 2), h = l1 && l2 ? 40 : l1 ? 26 : 24, x = 14, y = H - 10 - h;
  ctx.save();
  if (st === "i") {
    ctx.fillStyle = dark ? "#000" : "rgba(21,21,21,.9)"; rr(ctx, x + 3, y + 3, w, h, 4); ctx.fill();
    ctx.fillStyle = dark ? "#1c1b20" : "#ffffff"; ctx.strokeStyle = dark ? "#f2f0f3" : "#151515"; ctx.lineWidth = 2; rr(ctx, x, y, w, h, 4); ctx.fill(); ctx.stroke();
  } else if (st === "m") {
    ctx.fillStyle = dark ? "rgba(43,33,64,.94)" : "rgba(255,255,255,.92)"; rr(ctx, x, y, w, h, 12); ctx.fill();
    ctx.strokeStyle = dark ? "rgba(244,182,207,.45)" : "#f4b6cf"; ctx.lineWidth = 1.5; ctx.stroke();
  } else { ctx.fillStyle = "rgba(255,255,255,.86)"; rr(ctx, x, y, w, h, 12); ctx.fill(); }
  ctx.restore();
  const c1 = st === "i" ? (dark ? "#f2f0f3" : "#151515") : st === "m" ? (dark ? "#fbe9f2" : "#4a1838") : "#3b2a32";
  const c2 = st === "i" ? (dark ? "#c4c8cf" : "#3c4046") : st === "m" ? (dark ? "#e3c3d6" : "#7d4f68") : "#6d4f5e";
  ctx.textBaseline = "top";
  let ty = y + 5;
  if (l1) { ctx.font = f1; ctx.fillStyle = c1; ctx.fillText(fit(ctx, l1, w - padX * 2), x + padX, ty); ty += 18; }
  if (l2) { ctx.font = f2; ctx.fillStyle = c2; ctx.fillText(fit(ctx, l2, w - padX * 2), x + padX, ty); }
  ctx.restore();
  return { x, y, w, h };
}
