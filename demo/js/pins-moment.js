// The earning moment (main window): every pin earned, and every tier it goes up, gets its moment with that tier's
// line. Settings › Pins picks celebrate (Classic: two stickers and confetti, as when you reach your goal), a quiet
// note, or nothing. (Doodles burst / One sticker below are no longer offered: only an explicit opts.anim, from the
// tests and the preview shots, reaches them; the saved setting is always classic.) Also: the code's reveal, the quiet notes, and what comes from
// the app (pinsEvent: earned / tier-up / backfill / code / wear / reset). Pins earned together queue up: each one gets
// its own moment, one after another, and is marked seen only once its moment has played (see "the queue" below). Pins
// from a code (event source "code") never go one by one: one reveal for the whole unlock, after the queued moments.
import { T, tx, h, css, call, api, load, cat, ensureCat, pinArt, backSrc, backLines, nameOf, tierLabel, tierName, unit, saysAt, quoted, whoWhere, date, reduced, ensureCss, SERIES } from "./pins-common.js";
import { backEl, fitBacks } from "./pin-back.js";
import { mount as heroMount, canUse as heroCan } from "./pin-hero.js";

const goPins = (pin) => window.__mlwhApp?.go?.("pins", pin ? { pin } : {});
const onPinsPage = () => window.__mlwhApp?.tab?.() === "pins";
const redrawPins = () => { if (onPinsPage() && !document.querySelector(".pins-dlg, .pins-cele, .pins-reveal")) window.__mlwhApp?.draw?.(); };

/** A random sticker of a set (the buddies' own, as the Done-for-today celebration picks them). */
async function stickers() {
  try {
    const lib = await window.MLHost.library();
    const off = new Set(lib.buddyOff || []), inUse = (set) => (lib.stickers?.[set] || []).filter((s) => !off.has(`${set}/${decodeURIComponent(String(s.url).split("/").pop())}`));
    const any = (l) => (l.length ? l[Math.floor(Math.random() * l.length)].url : "");
    return { together: any(inUse("together")), milk: any(inUse("milk")), love: any(inUse("love")) };
  } catch { return {}; }
}
/** The doodle drawing style for this app style (A's look.js may say; else each style's own default). */
function doodleStyle() {
  const own = window.MLWH_LOOK?.doodleStyle?.();
  if (own && own !== "auto" && own !== "none") return own;
  const s = document.documentElement.dataset.style || "f";
  return { f: "kawaii-soft", a: "sticker", b: "plush", c: "riso", d: "kawaii", e: "neon", g: "pixel", h: "sticker", i: "marker", m: "plush" }[s[0]] || "kawaii-soft";
}
/** The doodles that may burst out: only ones this person can already see (never an unearned pin's design). */
async function burstMotifs(v) {
  const vis = (await call("visibleDoodles")) || { motifs: [] };
  const guard = window.MLWH_VISIBLE?.ok;
  const ok = (id) => (vis.motifs || []).includes(id) && (!guard || guard(id, "pins_burst", () => true));
  const list = (await call("list")) || [];
  const sib = list.filter((x) => x.series === v.series && x.kind !== "entry" && x.series !== "Special days").map((x) => x.id).filter(ok);
  return [...new Set([...sib, ...(vis.motifs || []).filter(ok)])].slice(0, 6);
}

/** The pin in the middle of the moment: the 3D hero when it can, else the CSS pin spinning in. */
function centrepiece(v, k) {
  const stage = h("div", { className: "pc-stage" + (reduced() ? " rm" : "") });
  const spin = h("div", { className: "pc-spin" });
  const back = backSrc(v, k);
  const info = { id: v.id, tier: v.tiers[k], front: pinArt(v, k).src, back, lines: backLines(v, k, date(Date.now())), lang: document.documentElement.lang === "zh-Hant" ? "zh" : document.documentElement.lang, label: nameOf(v) };
  if (heroCan()) { const host = h("div"); spin.append(host); stage.classList.add("pc-3d"); stage.hero = heroMount(host, info, { mode: "earn" }); }
  else { spin.append(pinArt(v, k, "pc-front")); if (back) spin.append(h("span", { className: "pc-back" }, backEl({ id: v.id, src: back, lines: info.lines, lang: info.lang }))); }
  stage.append(spin, h("span", { className: "pc-shine" }));
  return stage;
}
function whenGone(el, fn) { const mo = new MutationObserver(() => { if (!el.isConnected) { mo.disconnect(); fn(); } }); mo.observe(document.body, { childList: true }); }

const KICK = () => ({ 1: T("Your pin got its silver rim", "你的徽章換上銀邊了", "เข็มกลัดได้ขอบเงินแล้ว"), 2: T("Your pin got its gold rim", "你的徽章換上金邊了", "เข็มกลัดได้ขอบทองแล้ว"), 3: T("Your pin got its gem", "你的徽章鑲上寶石了", "เข็มกลัดได้อัญมณีแล้ว") });

/**
 * The moment for news ([{ id, tier, first }], the first one big, "…and N more" for the rest).
 * opts: { celebrate: big|quiet|none (default: the settings), anim: classic (default) | burst | together (tests only) }, demo: true (Settings' "Show me"),
 * step: { at, of } (the queue: "Pin 2 of 3", and "Later" says "Next pin" while more wait), confetti: false (the queue's quick run, after its first).
 */
export async function celebrate(news, opts = {}) {
  if (!news?.length) return null;
  ensureCss(); await ensureCat();
  const set = { ...((await call("summary"))?.settings || {}), ...opts };
  const mode = set.celebrate || "big";
  if (mode === "none") return null;
  if (mode === "quiet") { news.forEach((n, i) => setTimeout(() => toast(n), i * 700)); return null; }
  document.querySelector(".pins-cele")?.remove();
  const n = news[0], v = await call("detail", n.id); if (!v || !v.earned) return null;
  const k = Math.min(n.tier ?? v.tier, v.tier), anim = ["burst", "together"].includes(opts.anim) ? opts.anim : "classic";
  const more = news.length - 1, pics = anim === "burst" ? {} : await stickers(), RM = reduced();
  const box = h("div", { className: `cele pins-cele anim-${anim}`, role: "dialog", "aria-modal": "true", "aria-label": T("New pin", "新徽章", "เข็มกลัดใหม่") });
  const inner = h("div", { className: "box" });
  // Classic: Milk bottom left, Love bottom right (the Done-for-today celebration's places)
  if (anim === "classic") { if (pics.milk) inner.append(h("img", { className: "cs left", src: pics.milk, alt: "" })); if (pics.love) inner.append(h("img", { className: "cs right", src: pics.love, alt: "" })); }
  if (anim === "together" && pics.together) inner.append(h("img", { className: "pc-two" + (RM ? " rm" : ""), src: pics.together, alt: "" }));
  if (anim === "burst") {
    const ms = await burstMotifs(v), style = doodleStyle(), b = h("div", { className: "pc-burst" + (RM ? " rm" : "") });
    // round the pin, an arc open at the bottom (±140° from the top) so nothing lands on the words under it
    ms.forEach((m, i) => { const th = ms.length < 2 ? 0 : (i / (ms.length - 1) - .5) * (Math.PI * 14 / 9);
      b.append(css(h("img", { src: `doodles/${style}/${encodeURIComponent(m)}.svg`, alt: "", "data-motif": m }), { "--dx": Math.round(Math.sin(th) * 165) + "px", "--dy": Math.round(-Math.cos(th) * 100) + "px", "--i": i })); });
    inner.append(b);
  }
  const stage = centrepiece(v, k);
  const say = saysAt(v, k), cnt = v.counter ? tx(cat()?.COUNTERS?.[v.counter]?.rule) : "";
  const nxt = k + 1 < v.tiers.length ? { tierId: v.tiers[k + 1], at: v.t[k + 1] } : null;
  const tile = (label, value, sub) => h("div", { className: "ct" }, h("span", { className: "muted small", textContent: label }), h("b", { textContent: value }), sub ? h("span", { className: "muted small", textContent: sub }) : null);
  inner.append(...[stage,
    h("span", { className: "pc-kicker", textContent: n.first || v.tiers.length === 1 || k === 0 ? T("A new pin for your board", "徽章板上多了一個新徽章", "เข็มกลัดใหม่สำหรับบอร์ดของคุณ") : KICK()[k] || T("Your pin went up a tier", "你的徽章升級了", "เข็มกลัดเลื่อนระดับแล้ว") }),
    h("h2", { textContent: nameOf(v) }),
    say ? h("p", { className: "pc-voice" }, quoted(tx(say)), whoWhere(say) ? h("span", { className: "muted", textContent: ` — ${whoWhere(say)}` }) : null) : null,
    v.flav ? h("p", { className: "muted pc-flav", textContent: tx(v.flav) }) : null,
    h("div", { className: "ctiles" },
      tile(cnt || T("So far", "目前", "ตอนนี้"), v.counter ? unit(v.counter, Math.max(v.value ?? 0, v.t[k] ?? 0)) : tierLabel(v, k)),
      tile(T("Tier", "等級", "ระดับ"), tierLabel(v, k)),
      tile(T("Next", "下一個", "ถัดไป"), nxt ? tierName(nxt.tierId) : T("All done", "全部完成", "ครบแล้ว"), nxt ? unit(v.counter, nxt.at) : "")),
    opts.step?.of > 1 ? h("p", { className: "muted small pc-step", textContent: T(`Pin ${opts.step.at} of ${opts.step.of}`, `第 ${opts.step.at} 個徽章，共 ${opts.step.of} 個`, `เข็มกลัดอันที่ ${opts.step.at} จาก ${opts.step.of}`) }) : null,
    more > 0 ? h("p", { className: "muted small", textContent: T(`…and ${more} more on your board`, `……徽章板上還有 ${more} 個新的`, `…และอีก ${more} อันบนบอร์ด`) }) : null,
    h("div", { className: "row-flex cbtns" },
      h("button", { type: "button", className: "btn primary big pc-go", textContent: T("Pin it to the board", "別到徽章板上", "ติดลงบอร์ด") }),
      h("button", { type: "button", className: "btn pc-later", textContent: opts.step && opts.step.at < opts.step.of ? T("Next pin", "下一個", "อันถัดไป") : T("Later", "晚點再看", "ไว้ทีหลัง") }))].filter(Boolean));   // (append() would write "null")
  box.append(inner);
  const close = () => box.remove();
  box.addEventListener("click", (e) => { if (e.target === box || e.target.closest(".pc-later")) close(); if (e.target.closest(".pc-go")) { close(); if (!opts.demo) goPins(v.id); } });
  box.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  document.body.append(box);
  requestAnimationFrame(() => fitBacks(box));
  whenGone(box, () => stage.hero?.destroy?.());
  box.querySelector(".pc-go").focus();
  setTimeout(() => box.classList.add("settled"), 2600);   // drop the animation layers once it has played
  if (!RM && anim === "classic" && opts.confetti !== false) confetti();
  return box;
}
function confetti() {
  const C = ["#f2c84b", "#ff8db6", "#7fd6c2", "#9ec9ff", "#ffffff"];
  for (let i = 0; i < 22; i++) setTimeout(() => {
    const c = css(h("div", { className: "conf pin-conf", "aria-hidden": "true" }), { left: Math.random() * 100 + "vw", "animation-duration": 1.9 + Math.random() * 1.5 + "s", "--c": C[i % 5] });
    document.body.append(c); setTimeout(() => c.remove(), 3800);
  }, i * 70);
}

/** The quiet note: the pin, its line, "See it". n: { id, tier, first } or { text }. */
export async function toast(n) {
  ensureCss(); await ensureCat();
  const t = h("div", { className: "pins-toast" + (reduced() ? " rm" : ""), role: "status" });
  if (n.id) {
    const v = await call("detail", n.id); if (!v) return;
    const k = Math.min(n.tier ?? v.tier, v.tier), sy = v.earned ? saysAt(v, k) : null;
    const see = h("button", { type: "button", className: "linkish", textContent: T("See it", "看看", "ดู") });
    see.addEventListener("click", () => { t.remove(); goPins(v.id); });
    t.append(pinArt(v, k), h("span", {}, h("b", { textContent: nameOf(v) }), " ",
      n.first || v.tiers.length === 1 ? T("is on your board", "放到徽章板上了", "อยู่บนบอร์ดแล้ว") : T(`got a ${tierLabel(v, k).toLowerCase()}`, `換上了${tierLabel(v, k)}`, `ได้${tierLabel(v, k)}`),
      sy ? h("span", { className: "pt-say", textContent: quoted(tx(sy)) }) : null), see);
  } else {
    t.append(h("span", { textContent: n.text }));
    if (n.go) { const b = h("button", { type: "button", className: "linkish", textContent: n.goLabel || T("See them", "去看看", "ไปดู") }); b.addEventListener("click", () => { t.remove(); n.go(); }); t.append(b); }
  }
  const old = [...document.querySelectorAll(".pins-toast")];
  old.forEach((x, i) => css(x, { translate: `0 ${-(old.length - i) * 64}px` }));
  document.body.append(t); setTimeout(() => t.classList.add("out"), 5200); setTimeout(() => t.remove(), 5800);
}

/**
 * A code worked: ONE Classic moment for everything it unlocked (never a moment per pin). The card says "Unlocked with
 * your code", the series and how many ("Bad Buddy · 9 pins"; "61 pins" for a code that gives everything), and lays the
 * pins out together, each at the tier it came at, its name underneath (the grid scrolls inside the card when there are
 * many); one confetti burst; "Pin them to the board" / "Later". r: { seriesId ("*": everything), tier, news: [{ id, tier }] }.
 * The queue plays it (codeReveal below) and marks every one of its pins seen when it closes.
 */
export async function reveal(r) {
  const news = (r?.news || []).filter((n) => n?.id);
  if (!news.length) return null;
  ensureCss(); await ensureCat();
  document.querySelector(".pins-cele")?.remove();
  const data = await load(); if (!data) return null;
  const pinsOf = news.map((n) => ({ n, v: data.byId.get(n.id) })).filter((x) => x.v && x.v.earned);
  if (!pinsOf.length) return null;
  const sr = r.seriesId && r.seriesId !== "*" ? SERIES().find((x) => x.id === r.seriesId) : null, N = pinsOf.length;
  const count = N === 1 ? T("1 pin", "1 個徽章", "เข็มกลัด 1 อัน") : T(`${N} pins`, `${N} 個徽章`, `เข็มกลัด ${N} อัน`);
  const title = sr ? `${tx(sr)} · ${count}` : count;
  const TN = { all: T("at every tier", "所有等級", "ทุกระดับ"), plain: T("at their first tier", "第一個等級", "ระดับแรก"), silver: tierName("silver"), gold: tierName("gold"), gem: tierName("gem") };
  const at = TN[r.tier] || TN.plain;
  const line = T(`On your board, ${at}.`, `都放上徽章板了（${at}）。`, `อยู่บนบอร์ดแล้ว ${at}`) + (r.tier === "all" ? "" : " " + T("Higher tiers still come with your work.", "更高的等級，還是要靠你的工作慢慢累積。", "ระดับที่สูงขึ้นยังได้จากงานของคุณ"));
  const pics = await stickers(), RM = reduced();
  const box = h("div", { className: "cele pins-cele pins-reveal anim-classic" + (RM ? " rm" : ""), role: "dialog", "aria-modal": "true", "aria-label": T("Unlocked with your code", "用兌換碼解鎖了", "ปลดล็อกด้วยโค้ดของคุณ") });
  const inner = h("div", { className: "box" });
  if (pics.together) inner.append(h("img", { className: "cs top", src: pics.together, alt: "" })); else box.classList.add("no-top");
  if (pics.milk) inner.append(h("img", { className: "cs left", src: pics.milk, alt: "" }));
  if (pics.love) inner.append(h("img", { className: "cs right", src: pics.love, alt: "" }));
  const grid = h("div", { className: "pr-grid", role: "list", tabIndex: 0, "aria-label": title });
  pinsOf.forEach(({ n, v }, i) => { const k = Math.min(n.tier ?? v.tier, v.tier);
    grid.append(css(h("div", { className: "pr-pin", role: "listitem", title: `${nameOf(v)} · ${tierLabel(v, k)}`, "data-pin": v.id, "data-tier": v.tiers[k] }, pinArt(v, k), h("span", { textContent: nameOf(v) })), { "--i": Math.min(i, 14) })); });
  inner.append(
    h("span", { className: "pc-kicker", textContent: T("Unlocked with your code", "用兌換碼解鎖了", "ปลดล็อกด้วยโค้ดของคุณ") }),
    h("h2", { textContent: title }),
    h("p", { className: "muted small pr-line", textContent: line }),
    grid,
    h("div", { className: "row-flex cbtns" },
      h("button", { type: "button", className: "btn primary big pc-go", textContent: T("Pin them to the board", "全部別到徽章板上", "ติดทั้งหมดลงบอร์ด") }),
      h("button", { type: "button", className: "btn pc-later", textContent: T("Later", "晚點再看", "ไว้ทีหลัง") })));
  box.append(inner);
  const close = () => box.remove();
  box.addEventListener("click", (e) => { if (e.target === box || e.target.closest(".pc-later")) close(); if (e.target.closest(".pc-go")) { close(); goPins(); } });
  box.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  document.body.append(box);
  box.querySelector(".pc-go").focus();
  setTimeout(() => box.classList.add("settled"), 2600);
  if (!RM) confetti();
  return box;
}

/** What a code's answer says, in words (the engine's reasons; the prototype's wording). */
export function codeMessage(r, data) {
  if (!r) return { ok: false, text: T("That code doesn't work. Check the letters?", "這組兌換碼不能用，要不要再檢查一下字母？", "โค้ดนี้ใช้ไม่ได้ ลองเช็กตัวอักษรอีกทีนะ") };
  if (r.ok) {
    const sr = SERIES().find((x) => x.id === r.seriesId), name = r.seriesId === "*" ? T("Everything", "全部", "ทั้งหมด") : tx(sr), n = (r.news || []).length;
    const at = { all: T("at every tier", "所有等級", "ทุกระดับ"), plain: T("at their first tier", "第一個等級", "ระดับแรก"), silver: tierName("silver"), gold: tierName("gold"), gem: tierName("gem") }[r.tier] || "";
    const tail = r.tier === "all" ? "" : " " + T("Higher tiers still come with your work.", "更高的等級，還是要靠你的工作慢慢累積。", "ระดับที่สูงขึ้นยังได้จากงานของคุณ");
    return { ok: true, text: T(`${name} unlocked: ${n} pins on your board, ${at}.${tail}`, `${name} 解鎖了：${n} 個徽章已放上徽章板（${at}）。${tail.trim()}`, `ปลดล็อก ${name} แล้ว: บอร์ดมีเข็มกลัด ${n} อัน ${at}${tail}`) };
  }
  return { ok: false, text: {
    format: T("That doesn't look like a code (MLWH-XXXX-XXXX).", "這看起來不像兌換碼（MLWH-XXXX-XXXX）。", "ดูไม่เหมือนโค้ด (MLWH-XXXX-XXXX)"),
    invalid: T("That code doesn't work. Check the letters?", "這組兌換碼不能用，要不要再檢查一下字母？", "โค้ดนี้ใช้ไม่ได้ ลองเช็กตัวอักษรอีกทีนะ"),
    expired: T("That code has expired.", "這組兌換碼已經過期了。", "โค้ดนี้หมดอายุแล้ว"),
    already: T("You've used this code already. The pins are on your board.", "這組兌換碼已經用過了，徽章都在你的徽章板上囉。", "ใช้โค้ดนี้ไปแล้ว เข็มกลัดอยู่บนบอร์ดแล้ว"),
    wait: T("A few too many tries. Have a short break and try again in a minute.", "試太多次了，休息一下，一分鐘後再試。", "ลองหลายครั้งไปหน่อย พักสักนิดแล้วลองใหม่ในอีกนาที"),
    unavailable: T("Codes can't be used in this copy of the app.", "這個版本的 App 還不能用兌換碼。", "แอปเวอร์ชันนี้ยังใช้โค้ดไม่ได้"),
  }[r.reason] || T("That code doesn't work. Check the letters?", "這組兌換碼不能用，要不要再檢查一下字母？", "โค้ดนี้ใช้ไม่ได้ ลองเช็กตัวอักษรอีกทีนะ") };
}
/** Enter a code: the engine checks it (5 tries a minute, offline); a code that works gets its one reveal, after any
 *  pin moments already waiting. → the message (at once, the reveal follows). */
export async function enterCode(raw) {
  const a = api(); if (!a) return codeMessage({ ok: false, reason: "unavailable" });
  await ensureCat();
  let r = null; try { r = await a.code(String(raw || "").trim()); } catch { r = null; }
  const m = codeMessage(r);
  if (r?.ok) { codeReveal(r); redrawPins(); }
  return m;
}

// ---- the tour comes first ----
// A moment that comes while a tour is on screen (or within a second of it being asked for: the first start opens the
// window's tour 0.4 s after the window) waits until the tour is gone (Done, Skip or Esc), then plays. Only the app's
// moments wait (pinsEvent, pinsWake); Settings › Pins "Show me" calls celebrate() itself and plays at once.
// (The queue lives in this module, so switching pages keeps it; nothing is marked seen until it plays.)
const tourUp = () => !!document.querySelector(".tour-block");
let held = 0;
async function afterTour(since = Date.now()) {
  held++;
  try {
    const grace = 1000 - (Date.now() - since);
    if (grace > 0) await new Promise((r) => setTimeout(r, grace));
    // (tour.js says "mlwh:tour-end"; a tour that hands back to the one it came from opens again at once, so look again;
    // and every second anyway, in case the tour went some other way)
    while (tourUp()) await new Promise((r) => { const t = setTimeout(r, 1000); addEventListener("mlwh:tour-end", () => { clearTimeout(t); setTimeout(r, 60); }, { once: true }); });
  } finally { held--; }
}
/** For the tests: a moment is waiting for the tour. */
export const momentHeld = () => held > 0;

// ---- the queue: every pin earned gets its own moment, one after another ----
// Pins often come together (a new install's welcome gift and its series pin; a day that completes several rules; a set
// reward right after its pin). Each one plays its own Classic moment; the next starts when the one on screen is closed
// (its button, Later/Next pin, Esc, or "Pin it to the board", which opens the board and the rest still follow). More than
// MANY in one go: a quick run instead, each moment stays QUICK ms and the next takes its place by itself (confetti on the
// first only; 10 pins ≈ 21 s), the last one stays until it's closed. A pin is marked seen (pins.js seen({ id, tier })) only
// once its moment has played, so a reload or a quit mid-queue brings the rest back next time (pinsWake).
const MANY = 4, QUICK = 2100, GAP = 600, QUICK_GAP = 200;
let queue = [], playing = false, woke = false;
const played = new Set();   // "id:tier" played in this window (the wake-up skips them: an event may have brought them first)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const gone = (el) => new Promise((r) => (el.isConnected ? whenGone(el, r) : r()));
/** Add news to the queue (one per pin: its highest tier) and play it. */
function enqueue(items) {
  for (const n of items || []) {
    if (!n?.id) continue;
    const o = queue.find((q) => !q.code && q.id === n.id);
    if (o) { o.tier = Math.max(o.tier, n.tier ?? 0); o.first = o.first || !!n.first; }
    else queue.push({ id: n.id, tier: n.tier ?? 0, first: !!n.first });
  }
  return play();
}
// A code's pins never go one by one: the whole unlock is one item, its reveal, played after whatever is already queued.
// (The window that entered the code hears it twice, from enterCode's answer and from the engine's "code" event: once.)
const codesQueued = new Set();
function codeReveal(r) {
  const news = (r?.news || []).filter((n) => n?.id).map((n) => ({ id: n.id, tier: n.tier ?? 0 }));
  if (!news.length) return;
  const key = r.code || news.map((n) => `${n.id}:${n.tier}`).join(",");
  if (codesQueued.has(key)) return;
  codesQueued.add(key);
  queue.push({ code: { seriesId: r.seriesId, tier: r.tier, news } });
  return play();
}
async function play() {
  if (playing) return;
  playing = true;
  try {
    let i = 0, of = 0;
    const pinsLeft = () => queue.filter((q) => !q.code).length;
    while (queue.length) {
      await afterTour(0);                                        // a tour opened mid-queue: after it
      while (document.querySelector(".pins-cele")) await sleep(300);   // a "Show me" on screen: after it
      if (tourUp()) continue;
      const n = queue.shift();
      if (n.code) {                                              // a code's one reveal; all its pins seen when it closes
        let box = null;
        try { box = await reveal(n.code); } catch (e) { console.error("pin code reveal:", e); }
        if (box) await gone(box);
        for (const x of n.code.news) { played.add(`${x.id}:${x.tier}`); await call("seen", { id: x.id, tier: x.tier }); }
        redrawPins();
        i = 0; of = 0;                                           // (pins after it count again from 1)
        if (queue.length) await sleep(GAP);
        continue;
      }
      of = Math.max(of, i + 1 + pinsLeft());
      const quick = of > MANY;
      let box = null;
      try { box = await celebrate([n], { step: of > 1 ? { at: i + 1, of } : null, confetti: !quick || i === 0 }); } catch (e) { console.error("pin moment:", e); }
      if (box) {
        // (a quick run moves on by itself to the next pin; the last pin, or one before a code's reveal, stays)
        if (quick && queue[0] && !queue[0].code) { await Promise.race([gone(box), sleep(QUICK)]); box.remove(); }
        else await gone(box);
      }
      played.add(`${n.id}:${n.tier}`);
      await call("seen", { id: n.id, tier: n.tier });
      redrawPins();
      i++;
      if (queue.length) await sleep(quick && !queue[0].code ? QUICK_GAP : GAP);
    }
  } finally { playing = false; }
}
/** A moment is on screen or waiting (for the tests, and for the Pins page: it leaves the queue's pins unseen). */
export const momentsPending = () => playing || queue.length > 0 || pending.length > 0 || held > 0;
/** The Pins page has been drawn: what it shows is seen, except the pins whose moments are still to play. */
export function pageSeen() {
  if (!woke || momentsPending()) return call("seen", "note");
  return call("seen");
}

// ---- what the app says (main.js → "command", "pins-event") ----
let pending = [], timer = 0;
/** app.js: host.onCommand → cmd === "pins-event" → pinsEvent(arg). */
export function pinsEvent(ev) {
  if (!ev || !ev.kind) return;
  if (ev.kind === "earned" || ev.kind === "tier-up") {
    pending.push({ id: ev.id, tier: ev.tier, first: ev.kind === "earned" });
    clearTimeout(timer);
    const since = Date.now();
    // (news that comes together is gathered for 0.6 s, so the queue knows how many: "Pin 1 of 3")
    timer = setTimeout(async () => { const news = pending; pending = []; if (!news.length) return; await afterTour(since); enqueue(news); }, 600);
  } else if (ev.kind === "backfill") {
    backfillNote(ev.n);
  } else if (ev.kind === "code" || ev.source === "code") {
    // a code's unlock: one reveal for all of it, after the moments already waiting (never per-pin moments)
    redrawPins();
    if (ev.news?.length) codeReveal(ev);
  } else if (["wear", "reset", "forgiven", "special-day"].includes(ev.kind)) { if (ev.kind === "reset") { played.clear(); codesQueued.clear(); } redrawPins(); }
}
function backfillNote(n) {
  if (!n) return;
  toast({ text: T(`${n} pins from your past work are on your board.`, `你過去的工作換來了 ${n} 個徽章，已經放上徽章板。`, `งานที่ผ่านมาของคุณได้เข็มกลัด ${n} อัน อยู่บนบอร์ดแล้ว`), go: () => goPins(), goLabel: T("See them", "去看看", "ไปดู") });
  call("seen", "note");
}
/** app.js, once at start: the moments that came while the window was closed (and the first start's back-fill), once. */
export async function pinsWake() {
  if (!api()) return;
  const s = await call("summary"); if (!s) { woke = true; return; }
  if (s.note?.kind === "backfill") backfillNote(s.note.n);
  else if (s.note) call("seen", "note");
  const unseen = s.unseen || [], old = (u) => u.code || (s.note?.kind === "backfill" && u.at <= (s.note.at || 0));
  // (a code's pins had their reveal, and the back-fill its note: seen; the rest get their moments)
  for (const u of unseen.filter(old)) await call("seen", { id: u.id, tier: u.tier });
  const fresh = unseen.filter((u) => !old(u) && !played.has(`${u.id}:${u.tier ?? 0}`)).map((u) => ({ id: u.id, tier: u.tier ?? 0, first: (u.tier ?? 0) === 0 }));
  woke = true;
  if (!fresh.length) return;
  await afterTour();
  enqueue(fresh);
}
