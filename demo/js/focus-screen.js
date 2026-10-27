// ⛶ The focus screen: for work away from the computer (reading, studying on paper). The window
// goes full screen with one clock: the Pomodoro's ring counting down, or the work clock's big
// count of this stretch; under either, the day's total so far. Behind it one sticker (still, slowly walking, or round the screen's edges, a
// new one now and then), photos from the photographers who gave permission and/or your own, or nothing, at the
// brightness you pick, and the clock's colours, place and size (⚙, or Settings › Keeping time).
// The buttons show when the mouse moves.
// While it's open the screen stays on and sitting still isn't "away" (main.js).

import { L, el, host, work, state, pad, toast } from "./app-common.js";
import { doneForToday } from "./today-now.js";
import { LOOK_DEFAULTS, applyLook, lookControls } from "./clock-look.js";
import { photosFor, PHOTOGRAPHERS } from "./focus-photos.js";

let box = null, ticker = 0, raf = 0, swapT = 0, hideT = 0, statusAt = 0, popOpen = false;
let pool = { stickers: {}, photos: [] }, walker = null, lastRound = null;

const opts = () => ({ bg: "sticker", move: "edge", sets: ["milk", "love", "together"], stickerEvery: 10, photosBy: PHOTOGRAPHERS, photoEvery: 5,
  bright: 35, lines: ["worked", "next"], auto: false, dim: true, ...LOOK_DEFAULTS, ...(state.st?.focusScreen || {}) });
const save = (patch) => { host.settingText("focusScreen", JSON.stringify(patch)); state.st = { ...state.st, focusScreen: { ...opts(), ...patch } }; };
const mmss = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return s >= 3600 ? `${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}` : `${Math.floor(s / 60)}:${pad(s % 60)}`; };
const hm = (ms) => { const m = Math.floor(Math.max(0, ms) / 60e3); return m >= 60 ? L(`${Math.floor(m / 60)} h ${pad(m % 60)}`, `${Math.floor(m / 60)} 小時 ${pad(m % 60)} 分`) : L(`${m} min`, `${m} 分鐘`); };
const btn = (label, fn, cls = "") => { const b = el("button", { type: "button", className: cls, textContent: label }); b.addEventListener("click", (e) => { e.stopPropagation(); fn(); }); return b; };

export const focusOpen = () => !!box;

/** Open it (Today's ⛶ button, the menus, or a round starting with "every round opens it"). */
export async function openFocus() {
  if (box) return;
  box = el("div", { className: "fscreen", role: "dialog", "aria-modal": "true", "aria-label": L("Focus screen", "專注全螢幕") });
  document.body.append(box);
  document.body.classList.add("focus-on");
  work.act("focus-screen", "on");
  statusAt = Date.now();
  box.addEventListener("mousemove", showControls);
  box.addEventListener("click", () => { if (popOpen) { popOpen = false; draw(); } });
  document.addEventListener("keydown", onKey);
  await loadPool();
  draw();
  setBackdrop();
  showControls();
  ticker = setInterval(tick, 250); // (only what changed is redrawn: the seconds turn over on time)
  raf = requestAnimationFrame(walk);
}

export function closeFocus() {
  if (!box) return;
  clearInterval(ticker); clearInterval(swapT); clearTimeout(hideT); cancelAnimationFrame(raf);
  box.remove(); box = null; walker = null; popOpen = false;
  document.body.classList.remove("focus-on");
  document.removeEventListener("keydown", onKey);
  work.act("focus-screen", "off");
}

/** New status from the clock (app.js): redraw the clock. */
export function focusUpdate(st) {
  if (!box) return;
  statusAt = Date.now();
  // A new round: a new sticker, if that's how often.
  if (opts().stickerEvery === 0 && st.rounds !== lastRound && lastRound != null) newSticker();
  lastRound = st.rounds;
  if (!popOpen) draw(); else drawClock(true);
}

const onKey = (e) => { if (e.key === "Escape") { if (popOpen) { popOpen = false; draw(); } else closeFocus(); } };

async function loadPool() {
  try {
    const [lib, cr] = await Promise.all([host.library(), host.photoCredits().catch(() => null)]);
    const off = new Set(lib.buddyOff || []);
    for (const set of ["milk", "love", "together", "others"]) pool.stickers[set] = (lib.stickers?.[set] || []).filter((s) => !off.has(`${set}/${decodeURIComponent(s.url.split("/").pop())}`)).map((s) => s.url);
    const credits = cr?.credits || {};
    pool.photos = (lib.photos || []).map((p) => ({ url: p.url, by: credits[decodeURIComponent(p.url.split("/").pop())] || [], focus: p.focus || [0.5, 0.4], tall: p.height && p.width ? p.height > p.width * 1.1 : false, shipped: !!p.shipped }));
  } catch { /* nothing to show behind the clock: that's fine */ }
}

// ---- the clock --------------------------------------------------------------------

function clockParts() {
  const st = state.st || {}, p = st.pomoNow, b = st.onBreak, now = Date.now();
  // (from when the app last counted: a status that arrives for something else mustn't restart the count)
  const from = st.measuredAt && Math.abs(now - st.measuredAt) < 60e3 ? st.measuredAt : statusAt;
  const live = (ms, counting) => ms + (counting ? Math.max(0, now - from) : 0);
  const counting = !st.doneToday && (st.started || st.dayStart !== "ask");
  // The day so far, under the clock (whichever way you keep time).
  const today = live(st.today, counting && (st.keep === "both" ? st.pomoNow?.phase === "focus" && st.pomoNow.pausedLeft == null : !st.onBreak));
  const day = st.goal ? L(`Today ${hm(today)} of ${st.goal} h`, `今天工作 ${hm(today)} / 目標 ${st.goal} 小時`) : L(`Today ${hm(today)}`, `今天工作 ${hm(today)}`);
  if (st.doneToday) return { kind: "big", big: mmss(st.today), sub: L("Done for today", "今天收工了") };
  if (b) {
    const left = b.until ? b.until - now : now - b.since;
    return { kind: st.keep === "both" ? "ring" : "big", color: "var(--fs-ring-brk)", pct: b.until ? ((now - b.since) / (b.until - b.since)) * 100 : 100, big: mmss(left),
      sub: L("Break · stand up, drink some water", "休息 · 站起來、喝點水"), day, brk: true };
  }
  if (st.keep === "both") {
    if (p?.phase === "focus") {
      const left = p.pausedLeft != null ? p.pausedLeft : p.endsAt - now, total = p.focus * 60e3;
      return { kind: "ring", color: "var(--fs-ring)", pct: (1 - left / total) * 100, big: mmss(left),
        sub: (p.pausedLeft != null ? L("Paused · ", "暫停中 · ") : "") + L(`Round ${st.rounds + 1}`, `第 ${st.rounds + 1} 輪`), day, focusing: true, paused: p.pausedLeft != null };
    }
    return { kind: "ring", color: "var(--fs-ring)", pct: 0, big: `${st.pomo?.focus || 25}:00`, sub: L(`Ready for round ${st.rounds + 1}`, `準備開始第 ${st.rounds + 1} 輪`), day, ready: true };
  }
  // The work clock: this stretch, big (from zero after each break); the day's total under it.
  return { kind: "big", big: mmss(live(st.stretch || 0, counting && st.stretch > 0)), sub: L("This stretch", "這一段"), day };
}

function lines() {
  const st = state.st || {}, o = opts(), out = [];
  if (o.lines.includes("next")) {
    const n = (st.reminders || []).filter((r) => r.at > Date.now()).sort((a, b) => a.at - b.at)[0];
    if (n) { const t = new Date(n.at); out.push(`${L("Next", "下一個")}: <b>${pad(t.getHours())}:${pad(t.getMinutes())}</b> ${esc(n.text || "")}`); }
  }
  if (o.lines.includes("focus") && st.focus) out.push(`${esc(st.focus)}`);
  return out;
}
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

let lastClock = "";
function drawClock(force = false) {
  const c = box?.querySelector(".fs-clock");
  if (!c) return;
  const st = state.st || {}, k = clockParts();
  const sig = JSON.stringify([k, st.name, lines(), box.classList.contains("night")]);
  if (!force && sig === lastClock && c.childElementCount) return;
  lastClock = sig;
  c.className = "fs-clock " + k.kind;
  // (built with the DOM: the page's CSP allows no style="…" in markup)
  const html = (tag, cls, inner) => { const e = document.createElement(tag); if (cls) e.className = cls; if (inner != null) e.innerHTML = inner; return e; };
  const parts = [];
  if (st.name && !k.brk) parts.push(html("div", "fs-task", `${L("Working on", "正在做")} <b>${esc(st.name)}</b>`));
  const big = html("span", "fs-big"); big.textContent = k.big;
  if (k.kind === "ring") {
    const ring = html("div", "fs-ring"), inner = html("div");
    ring.style.setProperty("--c", k.color); ring.style.setProperty("--p", String(Math.max(0, Math.min(100, k.pct))));
    inner.append(big);
    if (st.keep === "both") { const every = st.pomo?.every || 4, dots = html("div", "fs-dots"); for (let i = 0; i < every; i++) dots.append(html("i", i < (st.rounds || 0) % every ? "done" : "")); inner.append(dots); }
    ring.append(inner); parts.push(ring);
  } else parts.push(big);
  const sub = html("div", "fs-sub"); sub.textContent = k.sub; parts.push(sub);
  if (k.day) { const d = html("div", "fs-day"); d.textContent = k.day; parts.push(d); }
  const ls = lines();
  if (ls.length) parts.push(html("div", "fs-lines", ls.join(" &nbsp;·&nbsp; ")));
  c.replaceChildren(...parts);
  // (late at night, a little dimmer)
  box.classList.toggle("night", opts().dim && (new Date().getHours() >= 22 || new Date().getHours() < 6));
}

function tick() {
  if (!box) return;
  drawClock();
  const t = box.querySelector(".fs-time"); if (t) { const d = new Date(); t.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
}

// ---- the page --------------------------------------------------------------------

function draw() {
  if (!box) return;
  const st = state.st || {}, k = clockParts();
  const keepBg = box.querySelector(".fs-bg");
  box.innerHTML = "";
  box.append(keepBg || el("div", { className: "fs-bg" }), el("div", { className: "fs-clock" }), el("div", { className: "fs-time" }));
  const bar = el("div", { className: "fs-controls" });
  if (st.keep === "both" && !st.doneToday) {
    if (k.ready) bar.append(btn(L("Start a round", "開始一輪"), () => { host.pomo("start"); toast(L("Focus!", "開始專注！")); }, "go"));
    else if (k.focusing) bar.append(btn(k.paused ? L("Resume", "繼續") : L("Pause", "暫停"), () => host.pomo(k.paused ? "alarm-resume" : "alarm-pause")),
      btn(L("Break now", "現在就休息"), () => host.pomo("alarm-skip")));
    else if (k.brk) bar.append(btn(L(`Back: round ${st.rounds + 1}`, `回來了，開始第 ${st.rounds + 1} 輪`), () => work.act("back-next"), "go"));
  } else if (!st.doneToday) {
    if (k.brk) bar.append(btn(L("I'm back", "我回來了"), () => work.act("end-break"), "go"));
    else bar.append(btn(L("Take a break", "休息一下"), () => work.act("start-break", "10:coffee")));
  }
  if (!st.doneToday) bar.append(btn(L("Done for today", "收工"), () => { closeFocus(); doneForToday(); }, "end"));
  bar.append(btn("⚙", () => { popOpen = !popOpen; draw(); }, "gear" + (popOpen ? " on" : "")), btn(L("✕ Close (Esc)", "✕ 關閉（Esc）"), closeFocus));
  box.append(bar);
  if (popOpen) box.append(optionsPop());
  box.style.setProperty("--fs-bright", String(opts().bright / 100));
  applyLook(box, opts());
  drawClock(); tick();
  if (walker) box.append(walker.img);
}

/** ⚙: the same options as Settings › Keeping time › Focus screen. */
function optionsPop() {
  const o = opts();
  const seg = (key, items) => el("div", { className: "fs-seg" }, items.map(([v, t]) => btn(t, () => { save({ [key]: v }); draw(); setBackdrop(); }, o[key] === v ? "on" : "")));
  const ticks = (key, items) => el("div", { className: "fs-ticks" }, items.map(([v, t]) => {
    const c = el("input", { type: "checkbox", checked: o[key].includes(v) });
    c.addEventListener("change", () => { const now = opts()[key].filter((x) => x !== v).concat(c.checked ? [v] : []); save({ [key]: now }); if (key === "lines") drawClock(); else setBackdrop(); });
    return el("label", {}, c, " " + t);
  }));
  const range = el("input", { type: "range", min: "10", max: "100", step: "5", value: String(o.bright) });
  const rv = el("span", { className: "small", textContent: o.bright + "%" });
  range.addEventListener("input", () => { rv.textContent = range.value + "%"; box.style.setProperty("--fs-bright", String(range.value / 100)); });
  range.addEventListener("change", () => save({ bright: Number(range.value) }));
  const look = lookControls(o, (patch) => { save(patch); draw(); }, (patch) => applyLook(box, { ...opts(), ...patch }));
  const pop = el("div", { className: "fs-pop" },
    el("b", { textContent: L("The clock", "時鐘") }), look,
    el("b", { textContent: L("Behind the clock", "時鐘後面") }), seg("bg", [["sticker", L("One sticker", "一張貼圖")], ["photos", L("Photos", "照片")], ["none", L("Nothing", "什麼都不放")]]),
    o.bg === "sticker" ? [el("span", { className: "lbl", textContent: L("The sticker", "貼圖") }), seg("move", [["still", L("Still", "不動")], ["slow", L("Walks slowly", "慢慢走")], ["edge", L("Round the edges", "沿著邊緣走")]]),
      ticks("sets", [["milk", "Milk"], ["love", "Love"], ["together", L("Together", "同框")]]),
      el("span", { className: "lbl", textContent: L("A new sticker", "換一張貼圖") }), seg("stickerEvery", [[0, L("Each round", "每一輪")], [10, L("10 min", "10 分鐘")], [30, L("30 min", "30 分鐘")], [-1, L("Keep one", "不換")]])] : null,
    o.bg === "photos" ? [el("span", { className: "lbl", textContent: L("Photos by", "照片來自") }), ticks("photosBy", [...PHOTOGRAPHERS.map((p) => [p, p]), ["mine", L("My own photos", "我自己的照片")]]),
      el("span", { className: "lbl", textContent: L("A new photo", "換一張照片") }), seg("photoEvery", [[1, L("1 min", "1 分鐘")], [5, L("5 min", "5 分鐘")], [15, L("15 min", "15 分鐘")], [30, L("30 min", "30 分鐘")]])] : null,
    o.bg !== "none" ? [el("span", { className: "lbl", textContent: L("Brightness", "亮度") }), el("div", { className: "fs-range" }, range, rv)] : null,
    el("span", { className: "lbl", textContent: L("Under the clock", "時鐘下面") }), ticks("lines", [["next", L("Next reminder or event", "下一個提醒或活動")], ["focus", L("Today's focus", "本日主題")]]));
  pop.addEventListener("click", (e) => e.stopPropagation());
  return pop;
}

function showControls() {
  if (!box) return;
  box.classList.remove("quiet");
  clearTimeout(hideT);
  hideT = setTimeout(() => { if (box && !popOpen) box.classList.add("quiet"); }, 3000);
}

// ---- behind the clock: one sticker, or photos ------------------------------------------

function setBackdrop() {
  if (!box) return;
  const o = opts(), bg = box.querySelector(".fs-bg");
  clearInterval(swapT); swapT = 0;
  walker?.img.remove(); walker = null;
  bg.innerHTML = "";
  bg.classList.toggle("photos", o.bg === "photos");
  if (o.bg === "photos") {
    const list = photosFor(pool.photos, o.photosBy);
    if (!list.length) return;
    // Smart: a wide photo fills the screen, centred on the face; tall ones go two side by side, each on its face.
    const any = (l) => l[Math.floor(Math.random() * l.length)];
    const wide = list.filter((x) => !x.tall), tall = list.filter((x) => x.tall);
    const shot = (x) => { const i = el("img", { src: x.url, alt: "" }); i.style.objectPosition = `${x.focus[0] * 100}% ${x.focus[1] * 100}%`; return i; };
    const show = () => {
      const usePair = tall.length >= 2 && (!wide.length || Math.random() < tall.length / list.length);
      let frame;
      if (usePair) { const a = any(tall); let b = any(tall); for (let n = 0; n < 5 && b === a; n++) b = any(tall); frame = el("div", { className: "fs-ph pair" }, shot(a), shot(b)); }
      else frame = el("div", { className: "fs-ph" }, shot(any(wide.length ? wide : list)));
      const imgs = [...frame.querySelectorAll("img")]; let left = imgs.length;
      const ready = () => { if (--left) return; bg.querySelectorAll(".fs-ph.on").forEach((x) => { x.classList.remove("on"); setTimeout(() => x.remove(), 2600); }); requestAnimationFrame(() => frame.classList.add("on")); };
      imgs.forEach((i) => { i.addEventListener("load", ready); i.addEventListener("error", ready); });
      bg.append(frame);
    };
    show();
    swapT = setInterval(show, o.photoEvery * 60e3);
  } else if (o.bg === "sticker") {
    newSticker();
    if (o.stickerEvery > 0) swapT = setInterval(newSticker, o.stickerEvery * 60e3);
  }
}

function newSticker() {
  if (!box) return;
  const o = opts(), list = o.sets.flatMap((s) => pool.stickers[s] || []);
  if (!list.length) return;
  const url = list[Math.floor(Math.random() * list.length)];
  if (!walker) {
    walker = { img: el("img", { className: "fs-walker", alt: "" }), p: Math.random(), dir: 1, rest: 0, ph: 0 };
    box.append(walker.img);
  }
  const img = walker.img;
  img.classList.add("swap");
  setTimeout(() => { img.src = url; img.onload = () => img.classList.remove("swap"); }, 600);
}

let last = performance.now();
function walk(now) {
  raf = requestAnimationFrame(walk);
  const dt = Math.min(0.5, (now - last) / 1000); last = now;
  if (!walker || !box || !walker.img.naturalWidth) return;
  const o = opts(), W = innerWidth, H = innerHeight, w = walker, img = w.img;
  const h = H * (o.move === "edge" ? 0.17 : 0.24), ew = h * (img.naturalWidth / img.naturalHeight);
  img.style.height = h + "px";
  const k = clockParts(), still = k.paused || k.brk || matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (o.move === "still") {
    img.style.left = W * 0.86 - ew / 2 + "px"; img.style.top = H - h - 4 + "px";
    img.style.transform = `scale(${1 + Math.sin(now / 1500) * 0.012})`;
    return;
  }
  if (w.rest > 0) w.rest -= dt; else if (Math.random() < dt * 0.05) w.rest = 3 + Math.random() * 5;
  const moving = w.rest <= 0 && !still;
  w.ph += dt * (moving ? 4.5 : 0);
  const bob = moving ? Math.abs(Math.sin(w.ph)) * 4 : 0, tilt = moving ? Math.sin(w.ph) * 2.5 : 0;
  if (o.move === "slow") {
    if (moving) { w.p += (w.dir * 22 * dt) / W; if (w.p < 0.06 || w.p > 0.94) { w.dir *= -1; w.p = Math.min(0.94, Math.max(0.06, w.p)); } }
    img.style.left = w.p * W - ew / 2 + "px"; img.style.top = H - h - 4 + "px";
    img.style.transform = `translateY(${-bob}px) rotate(${tilt}deg) scaleX(${w.dir})`;
    return;
  }
  // Round the edges, as the desktop buddy walks: feet on the edge, head inward, slowly.
  const per = 2 * (W + H);
  if (moving) w.p = (w.p + (18 * dt) / per) % 1;
  let d = w.p * per, x, y, rot;
  if (d < W) { x = d; y = H; rot = 0; } else if ((d -= W) < H) { x = W; y = H - d; rot = -90; } else if ((d -= H) < W) { x = W - d; y = 0; rot = 180; } else { d -= W; x = 0; y = d; rot = 90; }
  img.style.left = x - ew / 2 + "px"; img.style.top = y - h + "px";
  img.style.transform = `rotate(${rot}deg) translateY(${-bob}px)`;
}
