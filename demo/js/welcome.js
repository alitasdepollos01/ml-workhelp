// The desktop app's welcome window, one framed card: the language, which photos to start with
// (the full sticker library, downloaded once after agreeing to the disclaimer; or your own),
// how to keep time (the work count, the Pomodoro, or both), then a step-by-step tour
// with Muv, around the app's one window (pages that don't fit how you keep time are skipped):
// 13 pages: 12 with the work clock (the Pomodoro's page is left out), all 13 with the Pomodoro. Page 1 offers a backup to restore when a new
// install finds one (about-cards.js restoreOffer(): a box, not a choice the welcome makes).
// How to keep time: the work clock, or the Pomodoro ("both": its rounds are the day's work). Opened the first time the app starts, and
// from the menu ("Welcome and tour..."). The photos are copied by the app
// (main.js setup-*).

import { L, lang, translatePage } from "./i18n.js";
import { stylePicker } from "./style-pick.js";
import { labelLines, labelItems } from "./label.js";
import { restoreOffer } from "./about-cards.js";

const $ = (id) => document.getElementById(id);
const setup = window.MLHost?.setup;
const steps = [...document.querySelectorAll(".step")];
const PHOTO_STEP = steps.findIndex((s) => s.dataset.title === "Photos");
const KEEP_STEP = steps.findIndex((s) => s.dataset.title === "Keeping time");
const CONTACT_STEP = steps.findIndex((s) => s.dataset.title === "Updates");
let decoMap = {}; // (deco/deco.json: each spot's sticker, and whose photo it is)
let pk = { state: "idle" }; // the full library's download (main.js getPack)
// Opened only for the email (the app was set up before it was asked for): that page alone.
let ONLY = null;
try { ONLY = JSON.parse(decodeURIComponent(location.hash.slice(1)) || "{}").only || null; } catch { /* none */ }
const okEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || "").trim());
let contactDone = false; // the email's been given (sent, or kept to send)
addEventListener("hashchange", () => location.reload()); // (asked for something else while open: e.g. only the email page)
const host = window.MLHost;
let at = 0, info = null, busy = false, firstTime = false;
let st = {}; // the app's settings and work clock (keep, label1, label2…)
const keepChoice = () => document.querySelector("input[name=keep]:checked")?.value || null;
const keep = () => keepChoice() || st.keep || "work";
// Pages that don't fit how you keep time are skipped (the Pomodoro's page with the work clock),
// the Pomodoro page with "work count only".
const shown = () => (ONLY === "contact" ? [CONTACT_STEP] : ONLY === "photos" ? [PHOTO_STEP] : steps.map((s, k) => k).filter((k) => steps[k].dataset.skip !== keep()));

const total = (c) => (c ? c.milk + c.love + c.together + (c.others || 0) : 0);
const says = (c) => L(`${total(c)} stickers: ${c.milk} Milk, ${c.love} Love, ${c.together} together${c.others ? `, ${c.others} others` : ""}`,
  `${total(c)} 張貼圖：Milk ${c.milk}、Love ${c.love}、同框 ${c.together}${c.others ? `、其他 ${c.others}` : ""}`);
const choice = () => document.querySelector("input[name=lib]:checked")?.value || null;
// The photos are fan photos: the full library needs the disclaimer accepted.
const needsConsent = (c) => c === "full" || c === "starter";
const haveFull = () => info?.library === "full" || pk.state === "done";
/** The full library is on its way (or here, or copied from inside the app): the page can be left. */
const fullUnderway = () => haveFull() || ["downloading", "unpacking"].includes(pk.state);

/** Whose photos (and drawings) are on this page: the frame's bottom-right corner. Milk and Love by name. */
const NAME = { alitasdepollo: "alitasdepollos" };
function cornerCredit() {
  const step = steps[at], photos = [], drawn = { on: false };
  for (const img of step.querySelectorAll("img[data-spot], img[data-by]")) {
    if (!img.isConnected || img.offsetParent === null) continue;
    for (const t of [].concat(img.dataset.by || decoMap[img.dataset.spot]?.by || [])) {
      if (t === "wanwannjeab") drawn.on = true;
      else if (t !== "other" && t !== "commercial" && !photos.includes(NAME[t] || t)) photos.push(NAME[t] || t);
    }
  }
  const out = [];
  if (photos.length) out.push(L(`${photos.length > 1 ? "Photos" : "Photo"}: ${photos.join(" · ")}`, `照片：${photos.join(" · ")}`));
  if (drawn.on) out.push(L("Drawings: @wanwannjeab", "插畫：@wanwannjeab"));
  $("pcr").textContent = out.join("  ·  ");
}

function show(i) {
  at = Math.max(0, Math.min(steps.length - 1, i));
  if (steps[at].dataset.skip === keep()) at = Math.min(steps.length - 1, at + 1);
  const list = shown(), pos = list.indexOf(at);
  document.body.classList.remove("keep-work", "keep-pomo", "keep-both");
  document.body.classList.add("keep-" + keep());
  steps.forEach((s, k) => s.classList.toggle("on", k === at));
  [...$("dots").children].forEach((d, k) => { d.className = (k === at ? "on" : k < at ? "done" : "") + (list.includes(k) ? "" : " skip"); });
  $("where").textContent = L(`${pos + 1} of ${list.length}`, `${pos + 1} / ${list.length}`);
  $("wtitle").textContent = L(steps[at].dataset.title, steps[at].dataset.zhTitle);
  requestAnimationFrame(cornerCredit); // (once the page shows: only the pictures you can see)
  $("back").disabled = pos === 0 || busy;
  if (steps[at].classList.contains("s4b")) fillLabels();
  if (steps[at].classList.contains("s11d")) thankYou(); // (fresh each time: the names pop in again)
  $("next").textContent = pos === list.length - 1 ? L("Finish", "完成")
    : ONLY === "photos" ? L("Done", "完成") : at === PHOTO_STEP && !info?.setupDone ? L("Continue", "繼續") : at === CONTACT_STEP && !contactDone ? L("Send and go on", "送出並繼續") : L("Next", "下一步");
  if (at === CONTACT_STEP) setTimeout(() => $("contact-email")?.focus(), 50);
  update();
  steps[at].querySelector("h1")?.focus?.();
}

/** Next waits for a choice the first time (and for the disclaimer to be accepted, for either photo set). */
function update() {
  const c = choice();
  $("consent").hidden = c !== "full" || haveFull();
  $("dl-box").hidden = c !== "full";
  // The photo page: "your own", or the full library on its way (or here already); set up before (from the menu): either.
  const photoOk = c === "own" ? true : c === "full" ? fullUnderway() : !!info?.setupDone;
  $("next").disabled = busy || (at === PHOTO_STEP && !photoOk) || (at === KEEP_STEP && !keepChoice())
    || (at === CONTACT_STEP && !contactDone && !okEmail($("contact-email")?.value)); // (the email is needed to go on)
  $("hint").textContent = at === PHOTO_STEP && !photoOk ? (c === "full" ? L("Agree, then download the photos (or pick your own)", "同意後下載照片（或選自己的照片）") : L("Pick one to go on", "選一個再繼續"))
    : at === KEEP_STEP && !keepChoice() ? L("Pick one to go on", "選一個再繼續") : pos0() === 0 ? L("Everything here can be changed later in Settings", "這些之後都能在「設定」裡改") : "";
  packUi();
}
const pos0 = () => shown().indexOf(at);

/** The download: its button (after the disclaimer), then how far it's got. */
function packUi() {
  const box = $("dl-box"), btn = $("dl"), on = $("dl-on");
  const mb = Math.round((pk.size || info?.pack?.size || 0) / 1e6);
  btn.textContent = mb ? L(`Download the photos (${mb} MB)`, `下載照片（${mb} MB）`) : L("Download the photos", "下載照片");
  btn.disabled = !$("agree").checked || fullUnderway() || busy;
  btn.hidden = fullUnderway();
  on.hidden = pk.state === "idle" && !busy;
  box.classList.toggle("done", pk.state === "done");
  box.classList.toggle("bad", pk.state === "error");
  const pct = pk.state === "done" || pk.state === "unpacking" ? 100 : pk.size ? Math.min(100, Math.round((pk.got / pk.size) * 100)) : 0;
  $("dl-bar").style.width = pct + "%";
  if (pk.state === "downloading") { $("dl-say").textContent = L("Downloading the photos…", "正在下載照片⋯"); $("dl-much").textContent = L(`${Math.round(pk.got / 1e6)} of ${mb} MB · you can keep going, it carries on`, `${Math.round(pk.got / 1e6)} / ${mb} MB · 可以繼續往下，下載不會停`); }
  else if (pk.state === "unpacking") { $("dl-say").textContent = L("Putting them in place…", "正在放進 App 裡⋯"); $("dl-much").textContent = ""; }
  else if (pk.state === "done") { const n = total(pk.stickers); $("dl-say").textContent = n ? L(`Done: ${says(pk.stickers)} are ready.`, `完成：${says(pk.stickers)}都準備好了。`) : L("Done: the photos are ready.", "完成：照片都準備好了。"); $("dl-much").textContent = ""; }
  else if (pk.state === "error") { $("dl-say").textContent = pk.error || L("Download failed.", "下載失敗。"); $("dl-much").textContent = ""; btn.hidden = false; btn.disabled = !$("agree").checked; btn.textContent = L("Try again", "再試一次"); }
  else if (busy) { $("dl-say").textContent = L("Copying the photos… this can take a moment.", "正在複製照片⋯稍等一下。"); $("dl-much").textContent = ""; }
}

/** The full library: downloaded (or copied, from a copy of the app that has it inside). */
async function getFull() {
  if (!$("agree").checked) return;
  const r = await setup?.pack?.(true).catch(() => null);
  if (r?.ok) { pk = { state: "downloading", got: 0, size: info?.pack?.size || 0 }; update(); return; }
  // (the photos are inside this copy of the app: copied now)
  busy = true; update();
  const c = await setup?.choose("full", true).catch((e) => ({ ok: false, error: e.message }));
  busy = false;
  if (c?.ok) { info.setupDone = true; info.library = "full"; pk = { state: "done", stickers: c.stickers }; }
  else pk = { state: "error", error: c?.error || "" };
  update();
}

async function next() {
  if (at === PHOTO_STEP) {
    const c = choice();
    // Your own: nothing to add (the full library goes by its own button, getFull). Set up before: nothing changes.
    if (c === "own" && !info.setupDone) {
      busy = true;
      update();
      $("lib-status").textContent = "";
      const r = await setup.choose(c, $("agree").checked).catch((e) => ({ ok: false, error: e.message }));
      busy = false;
      if (!r?.ok) {
        $("lib-status").textContent = L("That didn't work", "好像沒有成功") + (r?.error ? `: ${r.error}` : L(".", "。"));
        update();
        return;
      }
      info.setupDone = true;
      info.library = c;
    }
    if (ONLY === "photos") return window.close();
  }
  if (at === KEEP_STEP && keepChoice()) {
    host?.settingText?.("keep", keepChoice());
    st.keep = keepChoice();
    // Away from the computer a lot: with the Pomodoro, every round opens the focus screen.
    if ($("away-work")?.checked) host?.settingText?.("focusScreen", JSON.stringify({ auto: keepChoice() === "both" }));
    for (const k of ["label1", "label2"]) if (!labelItems(st.keep, st.thai !== false).some(([v]) => v === st[k])) st[k] = "auto";
  }
  if (at === CONTACT_STEP && !contactDone) {
    // The email: kept by the app, and sent to the sign-up list (now, or once there's a connection).
    const email = $("contact-email").value.trim(), msg = $("contact-msg");
    busy = true; update(); msg.className = "contact-msg"; msg.textContent = L("Sending…", "送出中⋯");
    const r = await (host?.setup?.contact ? host.setup.contact(email) : Promise.resolve({ ok: true, state: "saved" })).catch(() => ({ ok: false }));
    busy = false;
    if (!r?.ok) { msg.className = "contact-msg bad"; msg.textContent = L("That doesn't look like an email, e.g. you@example.com", "看起來不像 email，例如 you@example.com"); update(); return; }
    contactDone = true;
    msg.className = "contact-msg ok";
    msg.textContent = r.state === "sent" ? L("✓ Thank you! We've sent you an email: please click Confirm in it.", "✓ 謝謝！確認信已經寄出，請到信箱點「確認」。")
      : L("✓ Thank you! Saved: it'll be sent as soon as we can.", "✓ 謝謝！已經記下來了，連上網路就會送出。");
    update(); show(at);
    await new Promise((ok) => setTimeout(ok, 1200)); // (time to read it)
  }
  const list = shown(), pos = list.indexOf(at);
  if (ONLY === "contact") return window.close();
  if (pos === list.length - 1) {
    // (the buddy comes out only when asked: page 4's "Bring it out", not at the end by itself)
    window.MLHost?.openTool?.("today", { tour: true }); // ...and Muv shows you around the window
    return window.close();
  }
  show(list[pos + 1]);
}

/** Page 4: what shows under the buddy (the options that fit how you keep time), and how it looks. */
function fillLabels() {
  $("thai").checked = st.thai !== false;
  const k = keep(), items = labelItems(k, st.thai !== false);
  $("keep-says").textContent = L(`Picked for how you keep time: ${k === "work" ? "the work clock" : "the Pomodoro"}.`, `依照你選的計時方式：${k === "work" ? "工作時鐘" : "番茄鐘"}。`);
  for (const id of ["label1", "label2"]) {
    const sel = $(id);
    sel.replaceChildren(...items.map(([v, t]) => new Option(t, v)));
    sel.value = items.some(([v]) => v === st[id]) ? st[id] : "auto";
  }
  preview();
}
function preview() {
  const t = Date.now();
  const w = { ...st, keep: keep(), label1: $("label1").value, label2: $("label2").value, name: st.name || L("Thesis", "論文"), stretch: 25 * 60e3, today: 3 * 3600e3 + 20 * 60e3,
    started: true, onBreak: null, rounds: st.rounds || 5, pomoNow: keep() === "work" ? null : { phase: "focus", endsAt: t + (18 * 60 + 42) * 1000, round: 2, every: 4 },
    reminders: (st.reminders || []).length ? st.reminders : [{ text: L("Call the bank", "打給銀行"), at: t + 85 * 60e3 }] };
  const [l1, l2] = labelLines(w, "", () => "น้ำ · " + L("water", "水"));
  const box = $("pv-label");
  box.replaceChildren(...[[l1, "l1"], [l2, "l2"]].filter(([x]) => x).map(([x, c]) => Object.assign(document.createElement("span"), { className: c, textContent: x })));
  box.hidden = !l1 && !l2;
}

/** Page 8: connect Apple Reminders / Apple Calendar now (or later, in Settings). */
async function connectButtons() {
  if (info?.os !== "mac" || !host?.apple) { document.querySelectorAll(".mac-only").forEach((e) => { e.hidden = true; }); return; }
  for (const [kind, api] of [["apple", host.apple], ["calendar", host.calendar]]) {
    const box = $("conn-" + kind), btn = $("connect-" + kind), state = box.querySelector(".state");
    const say = (a) => {
      const on = a?.access === "full" && a.on;
      btn.hidden = on;
      state.textContent = on ? L("Connected ✓", "已連結 ✓") : ["denied", "restricted"].includes(a?.access) ? L("Not allowed: you can allow it later in System Settings, then connect in Settings.", "還沒允許：之後可以到「系統設定」打開權限，再到「設定」連結。") : "";
    };
    api("status").then(say).catch(() => {});
    btn.addEventListener("click", async () => { btn.disabled = true; say(await api("connect").catch(() => null)); btn.disabled = false; });
  }
}

/**
 * The last page: everyone behind the photos and drawings, the same card each, popping in one by one;
 * the ones who gave us permission marked ✓. Hearts float up.
 */
// (everyone who said yes: their profile picture on the card, app/shared/avatars; a ✓ only when the picture is off)
const ALLOWED = ["Blumoon", "Lyrac", "NGMin", "otter", "KIU", "PKYU", "wanwannjeab"];
const CAMERA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
async function thankYou() {
  let c = null;
  try { c = await host?.photoCredits?.("shipped"); } catch { /* none */ }
  const names = $("thank-names"), hearts = document.querySelector(".thanks .hearts");
  hearts.replaceChildren(...["💚", "💖", "🤍", "💗", "💚", "💖", "✨"].map((h, i) => Object.assign(document.createElement("span"), { textContent: h, style: `left:${8 + i * 13}%;animation-delay:${i * 0.5}s` })));
  const people = c?.people || {
    Blumoon: { handle: "@blumoonfoto" }, Lyrac: { handle: "@loveminiheartph" }, NGMin: { handle: "@ngmin" }, otter: { handle: "@Miiiichstabe" }, wanwannjeab: { handle: "@wanwannjeab" },
    PKYU: { handle: "@pee_pumkin" }, GMMTV: { handle: "@GMMTV" }, Milk: { handle: "@panlyyy" }, Love: { handle: "@loverrukk" }, MilkPansaFamily: { handle: "@milkfamily__" }, KIU: { handle: "@kiu_628ML" }, Sflove0523: { handle: "@sflove0523" }, alitasdepollo: { handle: "@alitasdepollos0" } };
  const order = [...ALLOWED, ...(c?.order || Object.keys(people)).filter((k) => !ALLOWED.includes(k) && !["commercial", "other", "me"].includes(k) && people[k] && !people[k].mine)];
  if (people.alitasdepollo && !order.includes("alitasdepollo")) order.push("alitasdepollo"); // (the app's own photos and drawings)
  const SHORT = { Milk: "Milk", Love: "Love", alitasdepollo: "alitasdepollos", wanwannjeab: "wanwannjeab" };
  const what = (k) => k === "wanwannjeab" ? L("Cartoon Muv", "卡通 Muv") : k === "GMMTV" ? L("Official photos", "官方照片") : k === "Milk" || k === "Love" ? L("Her posts", "她的貼文") : L("Photos", "照片");
  names.replaceChildren(...order.map((k, i) => {
    const p = people[k] || {}, card = document.createElement("div");
    card.className = "ty-card";
    card.style.animationDelay = `${0.15 + i * 0.09}s`;
    if (ALLOWED.includes(k)) card.classList.add("said-yes");
    if (ALLOWED.includes(k) && !p.avatar) card.append(Object.assign(document.createElement("span"), { className: "ok", textContent: "✓", title: L("Gave us permission", "已同意我們使用") }));
    if (p.avatar) {
      card.append(Object.assign(document.createElement("img"), { className: "ty-pic", src: p.avatar, alt: "" }));
      if (k === "wanwannjeab") { const m = Object.assign(document.createElement("span"), { className: "muvs small" }); for (const f of ["muv-heart", "muv-baby", "muv-plain"]) m.append(Object.assign(document.createElement("img"), { src: `art/${f}.png`, alt: "" })); card.append(m); }
    } else if (k === "wanwannjeab") {
      const m = Object.assign(document.createElement("span"), { className: "muvs" });
      for (const f of ["muv-heart", "muv-baby", "muv-plain"]) m.append(Object.assign(document.createElement("img"), { src: `art/${f}.png`, alt: "" }));
      card.append(m);
    } else card.insertAdjacentHTML("beforeend", CAMERA);
    card.append(Object.assign(document.createElement("b"), { textContent: SHORT[k] || p.name || k }));
    if (p.handle) card.append(Object.assign(document.createElement("em"), { textContent: p.handle }));
    card.append(Object.assign(document.createElement("span"), { textContent: what(k) }));
    return card;
  }));
  // How to reach us (to be removed, or credited).
  const k = c?.contact, note = $("thank-note");
  if (k && note && !note.querySelector("a")) {
    const a = (href, text) => Object.assign(document.createElement("a"), { href, textContent: text, target: "_blank", rel: "noopener" });
    note.append(" ", a(`mailto:${k.mail}`, k.mail), L(" or ", " 或在 X："), a(k.xUrl, k.x), L(".", "。"));
  }
}

/** The pictures: each spot's sticker from deco/deco.json (a spot with none is left out). */
async function decorate() {
  let map = {};
  try { map = await (await fetch("deco/deco.json")).json(); } catch { /* no pictures, then */ }
  decoMap = map;
  for (const img of document.querySelectorAll("img[data-spot]")) {
    const f = map[img.dataset.spot]?.cartoon, size = Number(map[img.dataset.spot]?.size) || 100;
    if (f) img.src = "deco/" + f; else img.remove();
    // (each picture fits its column: the stickers' own sizes are for the app's pages)
  }
}

/** The pictures of the app in this language (art/welcome-<name>-<en|zh|th>.jpg). */
function pics() { for (const img of document.querySelectorAll("img[data-pic]")) img.src = `art/welcome-${img.dataset.pic}-${lang}.jpg`; }

/** Page 1: a new install that finds a backup offers it (null: nothing to offer, or there's data here already). */
let offerRun = 0;
async function placeOffer() {
  const run = ++offerRun;
  const box = await restoreOffer().catch(() => null);
  if (run !== offerRun) return false; // (asked again meanwhile: the newer one places it)
  document.querySelector(".step.s1 .pd-offer")?.remove();
  if (box) document.querySelector(".step.s1 .col .kicker")?.after(box);
  return !!box;
}

/** The Pins page says how many pins there are (the catalogue can grow without a new version). */
async function pinTotal() {
  const n = (await host?.pins?.call?.("summary").catch(() => null))?.total;
  if (n > 0) for (const s of document.querySelectorAll(".pin-total")) s.textContent = String(n);
}

async function start() {
  translatePage();
  decorate();
  pics();
  for (let k = 0; k < steps.length; k++) {
    const li = document.createElement("li");
    li.title = L(steps[k].dataset.title, steps[k].dataset.zhTitle);
    $("dots").append(li);
  }
  steps.forEach((s) => { const h = s.querySelector("h1"); if (h) h.tabIndex = -1; });
  // The colour theme: the swatches change every window at once.
  const SWATCH = { matcha: ["#86c79b", "#f3aac0"], mint: ["#6ed6aa", "#ffa6c4"], rose: ["#f0a9bf", "#93cfa9"],
    lavender: ["#b6a5e6", "#ffc3a3"], sky: ["#8fbfee", "#ffe083"], classic: ["#1f2340", "#e8508a"] };
  const th = window.MLHost?.themes?.();
  if (!th) $("themes-row").hidden = true;
  if (th) {
    for (const t of th.themes) {
      const b = Object.assign(document.createElement("button"), { type: "button", title: t.name });
      b.setAttribute("role", "radio");
      b.setAttribute("aria-label", t.name);
      b.dataset.themeId = t.id;
      b.style.setProperty("--a", SWATCH[t.id]?.[0] || "#ccc");
      b.style.setProperty("--b", SWATCH[t.id]?.[1] || "#999");
      b.addEventListener("click", () => window.MLHost.setTheme(t.id));
      $("themes").append(b);
    }
    const mark = (id) => $("themes").querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.themeId === id)));
    mark(th.theme);
    window.MLHost.onCommand?.((cmd, arg) => { if (cmd === "theme") mark(arg); });
  }
  // The style: eight little cards; picking one changes every window at once.
  if (window.MLHost?.setStyle) { $("style-pick").append(stylePicker()); $("style-pick").hidden = false; }
  // The language: a choice reloads the window in it (and every other window).
  for (const b of document.querySelectorAll("[data-lang]")) {
    b.setAttribute("aria-checked", String(b.dataset.lang === lang));
    b.addEventListener("click", () => { if (b.dataset.lang !== lang) window.MLHost?.setLang?.(b.dataset.lang); });
  }
  info = setup ? await setup.info() : { os: "mac", seeds: {}, existing: { milk: 0, love: 0, together: 0 } };
  try { st = (await host?.work?.status()) || {}; } catch { st = {}; }
  // Page 1: light or dark (every window at once).
  if (st.appearance && host?.settingText) {
    const ap = $("appearance");
    $("appearance-row").hidden = false;
    const mark = (v) => ap.querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.appearance === v)));
    mark(st.appearance);
    ap.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { host.settingText("appearance", b.dataset.appearance); st.appearance = b.dataset.appearance; mark(b.dataset.appearance); }));
  }
  thankYou();
  pinTotal();
  if (!info.setupDone) placeOffer();
  // Already chosen (the tour opened again): that way of keeping time is picked.
  if (info.setupDone && st.keep) { const r = document.querySelector(`input[name=keep][value=${st.keep}]`); if (r) r.checked = true; }
  document.body.classList.toggle("os-is-win", info.os === "win");
  firstTime = !info.setupDone;

  // The full library: how big it is; already here (or on its way)?
  pk = info.pack?.state && info.pack.state !== "idle" ? info.pack : { state: "idle", size: info.pack?.size || 0 };
  const full = info.seeds?.full;
  $("n-full").textContent = [full && total(full) ? says(full) : "", info.pack?.size ? L(`about ${Math.round(info.pack.size / 1e6)} MB`, `大約 ${Math.round(info.pack.size / 1e6)} MB`) : ""].filter(Boolean).join(" · ");
  $("c-full").querySelector("input").disabled = !(full && total(full));
  if (info.library === "full") { $("c-full").querySelector("input").checked = true; pk = { state: "done", stickers: info.existing }; }
  if (total(info.existing) && info.library !== "full") {
    $("existing").hidden = false;
    $("existing").textContent = L(`You already have ${says(info.existing)} in ${info.folder}. They stay; whatever you pick is added next to them.`,
      `你在 ${info.folder} 已經有 ${says(info.existing)} 了。這些都會保留，你選的會一起加進來。`);
  }
  if (info.setupDone && info.library !== "full") {
    const was = L("your own photos", "你自己的照片"); // (an old "starter" library reads as your own: the starter set isn't offered any more)
    $("lib-status").textContent = L(`You started with ${was}. Pick the full library to add it, or just go on.`, `你一開始選的是${was}。可以加上完整貼圖庫，或直接繼續。`);
  }
  setup?.onPack?.((p) => { pk = p; if (p.state === "done") { info.library = "full"; info.setupDone = true; } update(); });
  $("dl").addEventListener("click", getFull);

  document.querySelectorAll("input[name=lib]").forEach((r) => r.addEventListener("change", update));
  document.querySelectorAll("input[name=keep]").forEach((r) => r.addEventListener("change", () => { update(); show(at); }));
  $("away-work")?.addEventListener("change", () => document.body.classList.toggle("away-on", $("away-work").checked));
  $("thai").addEventListener("change", () => { st.thai = $("thai").checked; host?.settingText?.("thai", st.thai ? "on" : "off"); fillLabels(); });
  for (const id of ["label1", "label2"]) $(id).addEventListener("change", () => { host?.settingText?.(id, $(id).value); st[id] = $(id).value; preview(); });
  if ($("pace")) { $("pace").value = st.deskPace || "calm"; $("pace").addEventListener("change", () => { host?.settingText?.("deskPace", $("pace").value); st.deskPace = $("pace").value; }); }
  connectButtons();
  // The email: given before (the welcome again from the menu)? Then it's there, and the page can be passed.
  if (info.contact?.email) { $("contact-email").value = info.contact.email; contactDone = true; }
  $("contact-email").addEventListener("input", () => {
    if (contactDone) { contactDone = false; $("next").textContent = L("Send and go on", "送出並繼續"); }
    $("contact-email").classList.remove("bad"); $("contact-msg").textContent = ""; update();
  });
  $("contact-email").addEventListener("blur", () => { const v = $("contact-email").value.trim(); const bad = !!v && !okEmail(v); $("contact-email").classList.toggle("bad", bad); if (bad) { $("contact-msg").className = "contact-msg bad"; $("contact-msg").textContent = L("That doesn't look like an email, e.g. you@example.com", "看起來不像 email，例如 you@example.com"); } });
  $("contact-email").addEventListener("keydown", (e) => { if (e.key === "Enter" && !$("next").disabled) next(); });
  if (ONLY === "contact") document.body.classList.add("only-contact");
  if (ONLY === "photos") document.body.classList.add("only-photos");
  $("agree").addEventListener("change", update);
  $("next").addEventListener("click", next);
  const back = () => { const list = shown(); show(list[Math.max(0, list.indexOf(at) - 1)]); };
  $("back").addEventListener("click", back);
  $("bring").addEventListener("click", () => { setup?.bringBuddy(); $("brought").hidden = false; });
  $("open-maker").addEventListener("click", () => window.MLHost?.openTool?.("stickers"));
  document.addEventListener("keydown", (e) => {
    if (e.target.closest("input, button, select")) return;
    if (e.key === "ArrowRight" && !$("next").disabled) next();
    if (e.key === "ArrowLeft" && !$("back").disabled) back();
  });
  show(ONLY === "contact" ? CONTACT_STEP : ONLY === "photos" ? PHOTO_STEP : 0);
}

// For the self-test.
window.__mlwhWelcome = { show, step: () => at, steps: steps.length, shown, decorate, pack: () => pk, offer: placeOffer };
start();
