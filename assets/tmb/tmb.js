/* Thai Mascot Buddy page (2026-10-27, "Inside the editor"): the editor window, the edge walker, the special moves,
   the word card and the break pop-up. The mascots are PRE-RENDERED raster clips (assets/tmb/clips/*.webp: one strip
   per mascot x cartoon/pixel x move, recorded from the extension's own rig by tools/record-rig.js and packed by
   tools/pack-rig.py); no vector art and no rig code ship with the page. A clip's strip loads only when it's first played.
   Uses the page's T() and lang. Nothing moves while it's off screen, the tab is hidden or the page isn't shown;
   with reduced motion every mascot is a still picture (its first frame) and nobody walks. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FPS = 30;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (l) => l[Math.floor(Math.random() * l.length)];
  const DPR = () => window.devicePixelRatio || 1;
  // the mascots (names, owners, special moves, costumes: as in the extension's data.json)
  const MS = {
    muvmuv: { name: "MuvMuv", sp: ["Milk sip", "喝一口牛奶", "จิบนม"], cos: ["fanmeet", "Fan-meet robe and headset", "見面會長袍和耳麥", "เสื้อคลุมแฟนมีตกับไมค์เฮดเซ็ต"] },
    lunar: { name: "Lunar", sp: ["Egg hop and heart eyes", "蛋殼跳跳、愛心眼", "กระโดดออกจากเปลือกไข่ ตาเป็นรูปหัวใจ"], cos: ["easter", "Easter bunny ears", "復活節兔耳朵", "หูกระต่ายอีสเตอร์"] },
    any: { name: "Any", sp: ["Durian smoothie", "榴槤冰沙", "สมูทตี้ทุเรียน"] },
    jewel: { name: "Jewel", sp: ["Roller fix and bow flick", "整理髮捲、甩甩蝴蝶結", "จัดโรลม้วนผม แล้วสะบัดโบว์"] },
    vimmy: { name: "Vimmy", sp: ["Bee buzz", "小蜜蜂嗡嗡飛", "ผึ้งน้อยบินหึ่ง ๆ"] },
    wesley: { name: "Wesley", sp: ["Egg wobble", "蛋蛋搖一搖", "ไข่โยกเยก"] },
    goldie_brown: { name: "Goldie", sp: ["Warm hug", "暖暖的抱抱", "กอดอุ่น ๆ"], own: ["LingLing Kwong", "LingLing Kwong", "LingLing Kwong", "ll"] },
    lolo: { name: "LOLO", sp: ["Drumstick bite", "咬一口雞腿", "งับน่องไก่"], own: ["Channel 3", "Channel 3", "ช่อง 3", "c3"] },
  };
  const ORDER = ["muvmuv", "lunar", "any", "jewel", "vimmy", "wesley", "goldie_brown", "lolo"];
  const owner = (id) => MS[id].own || ["GMMTV", "GMMTV", "GMMTV", ""];
  const NAME = (id) => MS[id].name;
  const special = (id) => T(...MS[id].sp);
  const L = () => (typeof lang === "string" ? lang : "en");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const G = (h) => (typeof glue === "function" ? glue(h) : h); // (the page's: no lonely last character in 中文 / ไทย)
  const icons = () => { try { window.lucide && lucide.createIcons(); } catch { /* fine */ } };

  const st = { style: "cartoon" };
  try { const s = localStorage.getItem("tmb-style"); if (s === "pixel" || s === "cartoon") st.style = s; } catch { /* fine */ }
  if (new URLSearchParams(location.search).get("style") === "pixel") st.style = "pixel";

  // ------------------------------------------------------------ the clips (clips.json: per mascot x style the frame box and each move)
  let CL = null;
  const strips = new Map();   // url -> Promise (loaded once)
  const load = (url) => { if (!strips.has(url)) strips.set(url, new Promise((res) => { const i = new Image(); i.onload = () => res(true); i.onerror = () => res(false); i.src = url; })); return strips.get(url); };
  const clipUrl = (key, style, clip) => `assets/tmb/clips/${key}-${style}-${clip}.webp`;
  const ONEOFF = { special: 1, wave: 1, celebrate: 1, worried: 1, thumbs: 1 };

  // ------------------------------------------------------------ one figure: the extension's box (40 x 45 cartoon / 44 x 48 pixel, at k)
  const all = new Set();
  class Fig {
    constructor(host, id, o = {}) {
      this.host = host; this.o = o; this.k0 = o.k || 2; this.costume = o.costume || "";
      this.el = document.createElement(o.button ? "button" : "div");
      this.el.className = "tf" + (o.button ? " tf-btn" : "");
      if (o.button) { this.el.type = "button"; this.el.style.border = "0"; this.el.style.background = "transparent"; this.el.style.padding = "0"; }
      this.el.innerHTML = '<div class="tf-pet"><div class="tf-img"></div></div>';
      host.appendChild(this.el);
      this.pet = this.el.querySelector(".tf-pet"); this.img = this.el.querySelector(".tf-img");
      this.x = 0; this.y = 0; this.rot = 0; this.dir = 1;
      this.base = "idle"; this.clip = ""; this.f = 0; this.busyUntil = 0; this.req = 0;
      this.set(id);
      all.add(this);
    }
    get key() { return this.costume ? `${this.id}-${this.costume}` : this.id; }
    get k() { const k = this.k0 * (st.style === "pixel" ? 1.08 : 1); return st.style === "pixel" ? Math.max(1, Math.round(k * DPR())) / DPR() : k; }
    get w() { return (st.style === "pixel" ? 44 : 40) * this.k; }
    get h() { return (st.style === "pixel" ? 48 : 45) * this.k; }
    get busy() { return performance.now() < this.busyUntil; }
    set(id, costume) { this.id = id; if (costume !== undefined) this.costume = costume; this.size(); this.label(); if (this.clip) this.show(this.base, true); }   // (the first strip loads on the first tick, once it's on screen)
    label() { if (this.o.button) this.el.setAttribute("aria-label", `${NAME(this.id)}: ${special(this.id)}`); }
    size() {
      this.pet.style.width = `${this.w}px`; this.pet.style.height = `${this.h}px`; this.el.style.width = `${this.w}px`; this.el.style.height = `${this.h}px`;
      const e = CL && CL[this.key] && CL[this.key][st.style]; if (!e) return;
      const s = this.k / CL.k, im = this.img.style;
      im.left = `${-e.ox * s}px`; im.top = `${-e.oy * s}px`; im.width = `${e.w * s}px`; im.height = `${e.h * s}px`;
      this.img.classList.toggle("px", st.style === "pixel");
    }
    restyle() { this.size(); if (this.clip) this.show(this.clip, true); }
    wear(c) { this.costume = c; this.size(); this.clip = ""; this.req = 0; }
    entry() { return CL && CL[this.key] && CL[this.key][st.style]; }
    // shows a clip (from its first frame); a one-off plays once and then goes back to the base
    async show(name, force) {
      const e = this.entry(); if (!e) return false;
      if (!e.clips[name]) name = e.clips.idle ? "idle" : Object.keys(e.clips)[0];
      if (!force && name === this.clip) return true;
      const url = clipUrl(this.key, st.style, name), req = ++this.req;
      await load(url); if (req !== this.req) return true;
      const c = e.clips[name];
      this.clip = name; this.f = 0; this.n = c.n; this.fps = c.fps;
      this.img.style.backgroundImage = `url("${url}")`;
      this.img.style.backgroundSize = `${c.n * 100}% 100%`;
      this.frame(0);
      if (ONEOFF[name]) this.busyUntil = performance.now() + (c.n / c.fps) * 1000; else this.busyUntil = 0;
      return true;
    }
    frame(i) { this.img.style.backgroundPosition = `${this.n > 1 ? (i / (this.n - 1)) * 100 : 0}% 0`; }
    play(n) {
      if (REDUCE) return false;
      if (n === "hop") { this.el.classList.remove("hop"); void this.el.offsetWidth; this.el.classList.add("hop"); return true; }
      if (n === "walk" || n === "idle" || n === "sit" || n === "sleep") { this.base = n; this.show(n); return true; }
      this.show(n, true); this.busyUntil = performance.now() + 4000; // (until it's loaded and known)
      return true;
    }
    // a tick of the page's 30 fps loop: next frame of the clip; a one-off that's done goes back to the base
    tick(moving) {
      if (!this.clip) { if (!this.req) this.show(REDUCE ? "idle" : moving ? "walk" : this.base === "walk" ? "idle" : this.base); return; }
      if (REDUCE) return;
      const want = this.busy ? this.clip : moving ? "walk" : this.base === "walk" ? "idle" : this.base;
      if (want !== this.clip) { this.show(want); return; }
      this.f += this.fps / FPS;
      if (this.f >= this.n) { if (ONEOFF[this.clip]) { this.busyUntil = 0; this.show(moving ? "walk" : this.base === "walk" ? "idle" : this.base); return; } this.f %= this.n; }
      this.frame(Math.floor(this.f));
    }
    place() {
      this.el.style.transform = `translate(${Math.round(this.x)}px, ${Math.round(this.y)}px) rotate(${this.rot}deg)`;
      this.pet.style.transform = this.dir < 0 ? "scaleX(-1)" : "";
    }
  }
  // a word card near a figure, inside its stage
  function card(stage, fig, html, ms = 2800) {
    stage.querySelectorAll(".tcard").forEach((c) => c.remove());
    const c = document.createElement("div");
    c.className = "tcard"; c.innerHTML = html;
    stage.appendChild(c);
    const sw = stage.clientWidth, sh = stage.clientHeight, cw = c.offsetWidth, ch = c.offsetHeight;
    const r = fig.el.getBoundingClientRect(), s = stage.getBoundingClientRect(), k = sw ? s.width / sw : 1;
    const fx = (r.left - s.left) / k + r.width / k / 2, fy = (r.top - s.top) / k;
    c.style.left = `${Math.max(4, Math.min(sw - cw - 4, fx - cw / 2))}px`;
    c.style.top = `${Math.max(4, Math.min(sh - ch - 4, fy - ch - 6 > 4 ? fy - ch - 6 : fy + r.height / k + 6))}px`;
    clearTimeout(stage.__cardT); stage.__cardT = setTimeout(() => c.remove(), ms);
  }
  const wordHtml = (w) => `<b class="th">${esc(w[0])}</b><span class="rom">${esc(w[1])}</span><span class="en">${esc(T(w[2], w[3], w[2]))}</span>`;

  // ------------------------------------------------------------ the ticker: only scenes that are on screen
  const scenes = [];
  function scene(el, tick) {
    const s = { el, tick, seen: false, on: () => s.seen && el.offsetParent !== null && !document.hidden };
    if ("IntersectionObserver" in window) new IntersectionObserver((es) => { s.seen = es.some((e) => e.isIntersecting); kick(); }, { rootMargin: "80px" }).observe(el); else s.seen = true;
    scenes.push(s);
    return s;
  }
  // (frames only while a scene is on screen: none at all on the ML page or scrolled past them; a scene coming into view starts it)
  let last = 0, acc = 0, raf = 0, going = false;
  const kick = () => { if (going && !raf && scenes.some((s) => s.on())) raf = requestAnimationFrame(loop); };
  document.addEventListener("visibilitychange", kick);
  function loop(t) {
    raf = 0;
    if (!scenes.some((s) => s.on())) { last = 0; return; }
    raf = requestAnimationFrame(loop);
    if (!last) last = t;
    acc += Math.min(200, t - last); last = t;
    if (acc < 1000 / FPS) return;
    acc %= 1000 / FPS;
    for (const s of scenes) if (s.on()) s.tick();
  }

  // ------------------------------------------------------------ the edge walker (the buddy section): all four edges, head pointing in
  const WK = { fig: null, s: 0, pause: 0, id: "muvmuv" };
  function walker() {
    const box = $("wkEd"); if (!box) return;
    const f = WK.fig = new Fig(box, WK.id, { k: 1.55, button: true });
    f.base = "walk";
    f.el.addEventListener("click", () => { const w = pick(WORDS); f.play("wave"); card(box, f, wordHtml(w)); WK.pause = 70; });
    const pos = () => {
      const W = box.clientWidth, H = box.clientHeight, w = f.w, h = f.h;
      const a = W - w, b = H - w, P = 2 * a + 2 * b;
      let s = ((WK.s % P) + P) % P, cx, cy, rot;
      if (REDUCE) { s = a / 2; }
      if (s < a) { cx = w / 2 + s; cy = H - h / 2; rot = 0; }
      else if ((s -= a) < b) { cx = W - h / 2; cy = H - w / 2 - s; rot = -90; }
      else if ((s -= b) < a) { cx = W - w / 2 - s; cy = h / 2; rot = 180; }
      else { s -= a; cx = h / 2; cy = w / 2 + s; rot = 90; }
      f.x = cx - w / 2; f.y = cy - h / 2; f.rot = rot; f.dir = 1; f.place();
    };
    WK.s = 40; pos();
    new ResizeObserver(pos).observe(box);
    scene(box, () => {
      let moving = false;
      if (WK.pause > 0) WK.pause--;
      else if (!REDUCE && !f.busy && (f.base === "walk")) {
        WK.s += 1.5; moving = true;
        if (Math.random() < 0.004) { WK.pause = Math.round(rand(30, 80)); if (Math.random() < 0.6) f.play(pick(["wave", "thumbs", "special"])); }
      }
      pos(); f.tick(moving);
    });
    const pickEl = $("wkPick");
    pickEl.innerHTML = ORDER.map((id) => `<button type="button" data-wk="${id}" aria-pressed="${id === WK.id}" title="${esc(NAME(id))}" aria-label="${esc(NAME(id))}"><img src="assets/tmb/clips/${id}.png" alt="" loading="lazy"></button>`).join("");
    pickEl.addEventListener("click", (e) => {
      const b = e.target.closest("[data-wk]"); if (!b) return;
      WK.id = b.dataset.wk; pickEl.querySelectorAll("[data-wk]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      f.base = "walk"; f.set(WK.id, ""); pos(); f.play("wave"); WK.pause = 50; drawLabels();
    });
  }
  // what it does when… (the extension's words.js REACTIONS: the Thai word and its meanings)
  const RX = [
    ["save", "save", ["You save a file", "存檔時", "เมื่อบันทึกไฟล์"], "hop", ["บันทึก", "ban-thúek", "To save; a note", "存檔、記下來"]],
    ["testsPass", "check-check", ["Tests pass", "測試通過", "เทสต์ผ่าน"], "celebrate", ["เก่งมาก", "gèng mâak", "Great job", "好厲害"]],
    ["testsFail", "circle-x", ["Tests or a build fail", "測試或建置失敗", "เทสต์หรือบิลด์ไม่ผ่าน"], "worried", ["ไม่เป็นไรนะ", "mâi bpen rai ná", "It's okay", "沒關係喔"]],
    ["commit", "git-commit-horizontal", ["You commit with Git", "用 Git commit", "commit ด้วย Git"], "celebrate", ["เยี่ยมเลย", "yîam loei", "Excellent!", "太棒了！"]],
    ["errors", "triangle-alert", ["Errors pile up", "錯誤越來越多", "error เยอะขึ้น"], "worried", ["ใจเย็น", "jai-yen", "Calm, patient", "冷靜、慢慢來"]],
    ["errorsCleared", "badge-check", ["The errors are gone", "錯誤都解決了", "error หายหมดแล้ว"], "thumbs", ["ทำได้ดีมาก", "tham dâai dii mâak", "Great job", "做得很好"]],
    ["typingStreak", "keyboard", ["40 min of typing", "連續打字 40 分鐘", "พิมพ์ติดกัน 40 นาที"], "sit", ["พักผ่อน", "phák-phàwn", "To rest, relax", "休息一下"]],
    ["lateNight", "moon", ["Still typing after 23:00", "23:00 後還在打字", "ยังพิมพ์อยู่หลัง 23:00"], "sleep", ["ง่วง", "ngûang", "Sleepy", "想睡"]],
  ];
  function drawRx() {
    const el = $("rxList"); if (!el) return;
    el.innerHTML = RX.map(([k, ic, lab, , w]) => `<button type="button" data-rx="${k}"><i data-lucide="${ic}" class="ic"></i><span>${esc(T(...lab))}<small>${esc(w[0])} · ${esc(T(w[2], w[3], w[2]))}</small></span></button>`).join("");
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-rx]"); if (!b || !WK.fig) return;
    const r = RX.find((x) => x[0] === b.dataset.rx), f = WK.fig, box = $("wkEd");
    if (r[3] === "sit" || r[3] === "sleep") { f.play(r[3]); WK.pause = 110; setTimeout(() => { f.play("walk"); }, 3600); }
    else { f.play(r[3]); WK.pause = r[3] === "hop" ? 25 : 75; }
    card(box, f, wordHtml(r[4]), 3000);
  });

  // ------------------------------------------------------------ specials and costumes
  const SP = {};
  function specials() {
    const grid = $("spGrid"); if (!grid) return;
    grid.innerHTML = ORDER.map((id) => {
      const c = MS[id].cos;
      return `<article class="print sp-card"><button type="button" class="sp-st" data-sp="${id}"><span class="play"><i data-lucide="play" class="ic"></i><span data-t="play"></span></span></button>
        <h3>${esc(NAME(id))}<span class="own ${owner(id)[3]}" data-own="${id}"></span></h3><p class="mv" data-mv="${id}"></p>
        ${c ? `<button type="button" class="sp-cos" data-cos="${id}" data-c="${c[0]}" aria-pressed="false"><i data-lucide="shirt" class="ic"></i><span></span></button>` : ""}</article>`;
    }).join("");
    grid.querySelectorAll("[data-sp]").forEach((b) => {
      const id = b.dataset.sp, f = SP[id] = new Fig(b, id, { k: 2.3 });
      const put = () => { f.x = (b.clientWidth - f.w) / 2; f.y = b.clientHeight - f.h - 6; f.place(); };
      put(); new ResizeObserver(put).observe(b);
      b.addEventListener("click", () => { f.play("special"); });
      scene(b, () => f.tick(false));
    });
    grid.addEventListener("click", (e) => {
      const b = e.target.closest("[data-cos]"); if (!b) return;
      const on = b.getAttribute("aria-pressed") !== "true", f = SP[b.dataset.cos];
      b.setAttribute("aria-pressed", String(on)); f.wear(on ? b.dataset.c : ""); if (!REDUCE) setTimeout(() => f.play("special"), 50);
    });
  }
  function drawSpecials() {
    document.querySelectorAll("[data-mv]").forEach((p) => { const id = p.dataset.mv; p.innerHTML = `${esc(T("Special move: ", "招牌動作：", "ท่าประจำตัว: "))}<b>${G(esc(special(id)))}</b>`; });
    document.querySelectorAll("[data-own]").forEach((s) => { const o = owner(s.dataset.own); s.textContent = T(o[0], o[1], o[2]); });
    document.querySelectorAll(".sp-st [data-t=play]").forEach((s) => { s.textContent = REDUCE ? "" : T("Play", "播放", "เล่น"); });
    document.querySelectorAll(".sp-st .play").forEach((s) => { s.hidden = REDUCE; });
    document.querySelectorAll("[data-sp]").forEach((b) => b.setAttribute("aria-label", `${NAME(b.dataset.sp)}: ${T("play its special move", "播放招牌動作", "เล่นท่าประจำตัว")}, ${special(b.dataset.sp)}`));
    document.querySelectorAll("[data-cos]").forEach((b) => {
      const c = MS[b.dataset.cos].cos;
      b.querySelector("span").innerHTML = G(esc(`${T("Costume: ", "服裝：", "ชุด: ")}${T(c[1], c[2], c[3])}`));
    });
  }

  // ------------------------------------------------------------ who's who
  function drawWho() {
    const row = $("whoRow"); if (!row) return;
    row.innerHTML = ORDER.map((id) => { const o = owner(id); return `<figure><img src="assets/tmb/clips/${id}.png" alt="${esc(NAME(id))}" loading="lazy"><figcaption>${esc(NAME(id))}</figcaption><span class="own ${o[3]}">${esc(T(o[0], o[1], o[2]))}</span></figure>`; }).join("");
  }

  // ------------------------------------------------------------ the panel: fresh renders of 1.2.1 (tools/panel-shots.js)
  const SCENES = [["office", "Office", "辦公室", "ออฟฟิศ"], ["cafe", "Café", "咖啡廳", "คาเฟ่"], ["wat_arun", "Wat Arun", "鄭王廟", "วัดอรุณ"],
    ["songkran", "Songkran", "潑水節", "สงกรานต์"], ["stage", "Fanmeet", "粉絲見面會", "แฟนมีต"], ["loykrathong", "Loy Krathong", "水燈節", "ลอยกระทง"]];
  const PV = { scene: "office", size: "" };
  const VS = { scene: "office", word: 0, x: 160, dir: 1, pause: 0 };
  const vsDark = () => document.documentElement.dataset.vs === "dark";
  const panelSrc = (name) => `assets/tmb/panel/${name}-${vsDark() ? "dark" : "light"}-${L() === "zh" ? "zh" : "en"}.jpg`;
  function drawPanel() {
    const img = $("pvImg"); if (!img) return;
    img.src = panelSrc(PV.size ? `size-${PV.size}` : PV.scene);
    $("pvScenes").innerHTML = SCENES.map(([id, en, zh, th]) => `<button type="button" data-pv="${id}" aria-pressed="${!PV.size && PV.scene === id}">${esc(T(en, zh, th))}</button>`).join("")
      + `<span>${esc(T("+ 8 more", "還有 8 個", "อีก 8 ฉาก"))}</span>`;
    document.querySelectorAll("[data-pvsize]").forEach((b) => b.setAttribute("aria-pressed", String((PV.size || "default") === b.dataset.pvsize && (PV.size || PV.scene === "office"))));
    const v = $("vsPanel"); if (v) v.src = panelSrc(VS.scene);
    const vt = $("vtPanel"); if (vt) vt.src = panelSrc(VS.scene);   // (phones: the close-up on the first card)
  }
  document.addEventListener("click", (e) => {
    const s = e.target.closest("[data-pv]"); if (s) { PV.scene = s.dataset.pv; PV.size = ""; drawPanel(); return; }
    const z = e.target.closest("[data-pvsize]"); if (z) { PV.size = z.dataset.pvsize === "default" ? "" : z.dataset.pvsize; PV.scene = "office"; drawPanel(); }
  });

  // ------------------------------------------------------------ the editor window (the hero)
  const VSWORDS = [["ประชุม", "bprà-chum"], ["ทำงาน", "tham-ngaan"], ["พักผ่อน", "phák-phàwn"], ["เก่งมาก", "gèng mâak"], ["คิดถึง", "khít-thǔeng"]];
  function editor() {
    const fit = $("vsFit"), win = $("vsWin"); if (!fit) return;
    const scale = () => { win.style.setProperty("--s", (fit.clientWidth / (win.offsetWidth || 1000)).toFixed(4)); };   // (the window's own size is in tmb.css / design.css)
    scale(); new ResizeObserver(scale).observe(fit);
    win.querySelectorAll("[data-ic]").forEach((s) => { s.innerHTML = `<i data-lucide="${s.dataset.ic}"></i>`; });
    const edge = $("vsEdge"), f = new Fig(edge, "lunar", { k: 1.9 });
    f.base = "walk";
    const pop = $("vsPop"), pf = new Fig($("vsPopFig"), "muvmuv", { k: 1.75 });
    pf.x = 2; pf.y = 84 - pf.h; pf.place();
    let popAt = performance.now() + 1400, popOn = false;   // (the pop-up rises soon after you arrive)
    const showPop = (on) => { popOn = on; pop.classList.toggle("up", on); if (on) setTimeout(() => pf.play("wave"), 500); };
    scene(fit, () => {
      const now = performance.now();
      let moving = false;
      if (VS.pause > 0) VS.pause--;
      else if (!REDUCE && !f.busy) {
        VS.x += 1.3 * VS.dir; moving = true;
        const max = edge.clientWidth - f.w - 8;
        if (VS.x > max) { VS.x = max; VS.dir = -1; } if (VS.x < 70) { VS.x = 70; VS.dir = 1; }
        if (Math.random() < 0.005) { VS.pause = Math.round(rand(30, 70)); if (Math.random() < 0.5) f.play(pick(["wave", "thumbs", "special"])); }
      }
      f.x = VS.x; f.y = edge.clientHeight - f.h; f.dir = VS.dir; f.place(); f.tick(moving);
      if (!REDUCE && now > popAt) { showPop(!popOn); popAt = now + (popOn ? 6500 : 11000); }
      pf.tick(false);
    });
    if (REDUCE) showPop(true);
    const hot = (n, on) => win.querySelectorAll(`.hot[data-hot="${n}"]`).forEach((h) => h.classList.toggle("lit", on));
    document.querySelectorAll(".vs-card2").forEach((c) => {
      const n = c.dataset.show;
      ["mouseenter", "focus"].forEach((ev) => c.addEventListener(ev, () => hot(n, true)));
      ["mouseleave", "blur"].forEach((ev) => c.addEventListener(ev, () => hot(n, false)));
      c.addEventListener("click", () => {
        if (n === "1") { const i = SCENES.findIndex((s) => s[0] === VS.scene); VS.scene = SCENES[(i + 1) % SCENES.length][0]; $("vsPanel").src = panelSrc(VS.scene); const vt = $("vtPanel"); if (vt) vt.src = panelSrc(VS.scene); }
        if (n === "2") { f.play("special"); VS.pause = 90; }
        if (n === "3") { VS.word = (VS.word + 1) % VSWORDS.length; $("vsWord").textContent = VSWORDS[VS.word].join(" "); const vw = $("vtWord"); if (vw) vw.textContent = VSWORDS[VS.word].join(" "); }
        if ((n === "2" || n === "4") && !REDUCE) { const t = c.querySelector(".vs-thumb"); if (t) { t.classList.remove("go"); void t.offsetWidth; t.classList.add("go"); } }
        if (n === "4") { showPop(true); popAt = performance.now() + 7000; }
        hot(n, true); setTimeout(() => { if (document.activeElement !== c) hot(n, false); }, 1600);
      });
    });
  }

  // ------------------------------------------------------------ Thai words: the card, quiz mode
  const WORDS = [["ทำงาน", "tham-ngaan", "To work", "工作", ["Beginner", "初級", "ระดับเริ่มต้น"]], ["ประชุม", "bprà-chum", "Meeting / To meet", "開會", ["Intermediate", "中級", "ระดับกลาง"]],
    ["คิดถึง", "khít-thǔeng", "To miss (someone)", "想念", ["Elementary", "基礎", "ระดับพื้นฐาน"]], ["หวานน้อย", "wǎan nói", "Less sweet, please", "少糖就好", ["Café scene", "咖啡廳場景", "ฉากคาเฟ่"]],
    ["ฝนตก", "fǒn dtòk", "It's raining", "下雨了", ["Elementary", "基礎", "ระดับพื้นฐาน"]], ["ดีใจ", "dii-jai", "Glad / Happy", "開心", ["Elementary", "基礎", "ระดับพื้นฐาน"]],
    ["เหนื่อย", "nùeai", "Tired", "好累", ["Beginner", "初級", "ระดับเริ่มต้น"]], ["กรี๊ด", "gríit", "To scream (with excitement)", "尖叫（太興奮了）", ["Fanmeet scene", "見面會場景", "ฉากแฟนมีต"]]];
  const WC = { i: 0, quiz: false };
  function drawWord() {
    const el = $("wCard"); if (!el) return;
    const w = WORDS[WC.i];
    el.classList.toggle("quiz", WC.quiz); el.classList.remove("open");
    el.innerHTML = `<div role="button" tabindex="0" aria-label="${esc(T("Thai word card", "泰文單字卡", "การ์ดคำไทย"))}"><b class="th" lang="th">${esc(w[0])}</b><span class="rom">${esc(w[1])}</span><span class="en">${esc(T(w[2], w[3], w[2]))}</span><span class="lv">${esc(T(...w[4]))}</span></div>`;
  }
  $("wNext")?.addEventListener("click", () => { WC.i = (WC.i + 1) % WORDS.length; drawWord(); });
  $("wQuiz")?.addEventListener("click", (e) => { WC.quiz = !WC.quiz; e.currentTarget.setAttribute("aria-pressed", String(WC.quiz)); drawWord(); });
  $("wCard")?.addEventListener("click", () => { const el = $("wCard"); if (WC.quiz && !el.classList.contains("open")) el.classList.add("open"); else { WC.i = (WC.i + 1) % WORDS.length; drawWord(); } });
  $("wCard")?.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("wCard").click(); } });

  // ------------------------------------------------------------ the Pomodoro and the break pop-up
  function pomodoro() {
    const box = $("pomo"); if (!box) return;
    const f = new Fig($("pomoFig"), "goldie_brown", { k: 1.45 }); f.x = 2; f.y = 72 - f.h; f.place();
    let left = 25 * 60 - 1, shown = false;
    const t = $("pomoT");
    setInterval(() => { if (document.hidden || box.offsetParent === null) return; left = left > 0 ? left - 1 : 25 * 60; t.textContent = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`; }, 1000);
    const show = (on) => { box.classList.toggle("up", on); $("pomoCard").hidden = !on; if (on) setTimeout(() => f.play("wave"), 450); };
    scene(box, () => { f.tick(false); if (!shown) { shown = true; setTimeout(() => show(true), 900); } });
    $("popBtn")?.addEventListener("click", () => { const on = !box.classList.contains("up"); show(on); });
  }

  // ------------------------------------------------------------ language, theme, style
  function drawLabels() {
    for (const el of document.querySelectorAll("#p-tmb [data-zh-aria], #p-tmb [data-zh-alt]")) {
      for (const at of ["aria", "alt"]) {
        const zh = el.dataset[`zh${at === "aria" ? "Aria" : "Alt"}`]; if (zh == null) continue;
        const attr = at === "aria" ? "aria-label" : "alt", key = at === "aria" ? "enAria" : "enAlt";
        if (el.dataset[key] == null) el.dataset[key] = el.getAttribute(attr) || "";
        el.setAttribute(attr, T(el.dataset[key], zh, el.dataset[`th${at === "aria" ? "Aria" : "Alt"}`] || el.dataset[key]));
      }
    }
    all.forEach((f) => f.label());
  }
  function drawStyle() { document.querySelectorAll("[data-tmbstyle]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tmbstyle === st.style))); }
  document.addEventListener("click", (e) => {
    const s = e.target.closest("[data-tmbstyle]");
    if (s) { st.style = s.dataset.tmbstyle; try { localStorage.setItem("tmb-style", st.style); } catch { /* fine */ } all.forEach((f) => f.restyle()); drawStyle(); window.dispatchEvent(new Event("resize")); }
  });
  window.tmbTheme = () => {
    const h = document.documentElement;
    h.dataset.vs = h.dataset.theme === "dark" || h.dataset.look === "stage" ? "dark" : "light";
    drawPanel();
  };
  window.drawTmb = () => { drawRx(); drawSpecials(); drawWho(); drawPanel(); drawWord(); drawLabels(); drawStyle(); icons(); };

  // ------------------------------------------------------------ start (after the clip index has loaded)
  fetch("assets/tmb/clips/clips.json").then((r) => r.json()).then((j) => {
    CL = j;
    specials(); walker(); editor(); pomodoro();
    window.tmbTheme(); window.drawTmb();
    going = true; kick();
  }).catch((e) => { console.warn("Thai Mascot Buddy clips didn't load", e); window.tmbTheme(); window.drawTmb(); });
})();
