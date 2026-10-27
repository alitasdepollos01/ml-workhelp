/* ML WorkHelp page (2026-10-27): the pictures follow the language and light/dark (Scrapbook / Concert night), the looks
   switcher, the series band and the pins board. No spoilers: only the 7 series pins and the always-visible set (the 12 wall
   motifs + camera + Ajarn Maewnam) are ever drawn; every other pin is a "?" silhouette. Uses the page's T() and lang. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const L = () => (typeof lang === "string" ? lang : "en");
  const dark = () => document.documentElement.dataset.theme === "dark" || document.documentElement.dataset.look === "stage";
  const S = { st: "i", dm: null };
  const NAMES = { f: ["Purikura", "拍貼機", "ตู้สติกเกอร์"], i: ["Y2K emo", "Y2K emo", "Y2K"], m: ["Whimsical", "Whimsical", "Whimsical"] };
  const SERIES = [
    ["sp-milklove", ["MilkLove", "MilkLove", "มิ้ลค์เลิฟ"]], ["sp-zero", ["Bad Buddy · Magic of Zero", "Bad Buddy · Magic of Zero", "แค่เพื่อนครับเพื่อน · Zero Photography"]],
    ["sp-235", ["23.5", "世界傾斜23.5度", "23.5 องศาที่โลกเอียง"]], ["sp-whale", ["Whale Store xoxo", "鯨魚雜貨舖", "คุณวาฬร้านชำ"]],
    ["sp-girl", ["Girl Rules", "女生規則：禁愛遊戲", "กฎหลัก…ห้ามรักเธอ"]], ["sp-ditto", ["DITTO", "DITTO", "Ditto ระฟ้าหล่นสวรรค์"]], ["sp-whimsical", ["Whimsical House", "Whimsical House", "Whimsical House"]],
  ];
  // the pins playground: the 7 series pins + three of the always-visible set, and two "?" (pins51 plain fronts and backs)
  const PLAY = ["sp-milklove", "sp-zero", "sp-235", "sp-whale", "?", "sp-girl", "sp-ditto", "sp-whimsical", "whale", "seal", "milk", "?"];
  const PN = {"sp-milklove": ["MilkLove · We shine on each other", "MilkLove・互相照亮", "มิ้ลค์เลิฟ · ฉายแสงให้กันและกัน"], "sp-zero": ["Zero Photography · Every moment", "Zero Photography・每一段時光", "Zero Photography · ทุกช่วงเวลา"],
    "sp-235": ["23.5 · Tilted your way", "23.5・向你傾斜", "23.5 · โลกเอียงไปทางเธอ"], "sp-whale": ["Whale Store xoxo · Thrive & survive", "鯨魚雜貨舖・愛要開花，店要撐住", "คุณวาฬร้านชำ · รักรุ่ง ร้านรอด"],
    "sp-girl": ["Girl Rules · The main rule", "女生規則・頭號規則", "กฎเก · กฎหลัก"], "sp-ditto": ["DITTO · Never leaves the sky", "DITTO・不離天空", "Ditto · ระฟ้าไม่ละฟ้า"],
    "sp-whimsical": ["Whimsical House · A home full of love", "Whimsical House・充滿愛的家", "Whimsical House · บ้านที่อบอวลไปด้วยความรัก"],
    whale: ["Someone awesome", "大功臣", "คนเก่ง"], seal: ["Oong!", "Oong～！", "อุ๋ง!"], milk: ["MUVMUV's milk", "MUVMUV 的牛奶", "นมของเมิฟเมิฟ"] };
  const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const keep = (h) => h.replace(/23\.5度/g, '<span class="nw">23.5度</span>');
  function pics() {
    const lg = L(), d = dark() ? "dark" : "light", dm = S.dm || d;
    const set = (id, src) => { const e = $(id); if (e && e.getAttribute("src") !== src) e.setAttribute("src", src); };
    set("mlToday", `assets/next/style-f-${d}-${lg}.jpg`);
    set("mlLook", `assets/next/style-${S.st}-${dm}-${lg}.jpg`);
    const look = $("mlLook"); if (look) look.alt = T(`The Today page in ${NAMES[S.st][0]}, ${dm}`, `「${NAMES[S.st][1]}」風格的「今天」頁面（${dm === "dark" ? "深色" : "淺色"}）`, `หน้าวันนี้ในสไตล์ ${NAMES[S.st][2]} (${dm === "dark" ? "มืด" : "สว่าง"})`);
    set("mlDq", `assets/next/doodles-quiet-${lg}.jpg`); set("mlDc", `assets/next/doodles-settings-${lg}.jpg`);
    const dq = $("mlDq"), dc = $("mlDc");
    if (dq) dq.alt = T("The quiet doodle wallpaper behind an empty Reminders page", "空空的提醒頁後面，淡淡的塗鴉壁紙", "วอลเปเปอร์ดูเดิลจาง ๆ หลังหน้าแจ้งเตือนที่ยังว่าง");
    if (dc) dc.alt = T("Settings › Look › Doodles: quiet wallpaper, corner stickers or off, and the drawing style", "設定 › 外觀 › 塗鴉：安靜的壁紙、角落貼紙或關閉，還有塗鴉的畫風", "การตั้งค่า › หน้าตา › ดูเดิล: วอลเปเปอร์เบา ๆ สติกเกอร์ตามมุม หรือปิด และสไตล์ของดูเดิล");
    set("mlWords", `assets/next/words-${d}-${lg}.jpg`);
    document.querySelectorAll("[data-nxpic]").forEach((el) => {
      const k = el.dataset.nxpic;
      if (k === "pins") el.innerHTML = ["sp-235", "sp-whale", "?", "sp-girl"].map((id) => (id === "?" ? '<i class="q">?</i>' : `<img loading="lazy" src="assets/pins/front/${id}.svg" alt="">`)).join("");
      else el.innerHTML = `<img src="${k === "looks" ? `assets/next/style-m-${d}-${lg}.jpg` : `assets/next/words-${d}-${lg}.jpg`}" alt="" loading="lazy">`;
    });
    set("mlMonth", `assets/next/month-${d}-${lg}.jpg`);
    document.querySelectorAll("[data-mlst]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mlst === S.st)));
    document.querySelectorAll("[data-mldm]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mldm === dm)));
  }
  function band() {
    const el = $("seriesBand"); if (!el) return;
    el.innerHTML = SERIES.map(([id, n]) => `<figure role="listitem"><img src="assets/next/pins/${id}.svg" alt="" loading="lazy"><figcaption>${keep(esc(T(...n)))}</figcaption></figure>`).join("");
    play();
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-mlst]"); if (a) { S.st = a.dataset.mlst; pics(); return; }
    const b = e.target.closest("[data-mldm]"); if (b) { S.dm = b.dataset.mldm; pics(); }
  });
  // ---- the pins playground: a mini Board; a pin opens big, leans to the pointer and turns over to its engraved back (assets/pins/pin3d.js)
  function play() {
    const b = $("pinBoard"); if (!b) return;
    b.innerHTML = PLAY.map((id) => (id === "?" ? `<span class="q" role="img" aria-label="${esc(T("A pin still to find", "還沒找到的徽章", "เข็มกลัดที่ยังไม่เจอ"))}">?</span>`
      : `<button type="button" data-pin="${id}" aria-label="${esc(T(...PN[id]))}"><img src="assets/pins/front/${id}.svg" alt="" loading="lazy"></button>`)).join("");
    if (openId) openPin(openId, true);
  }
  let openId = "";
  function openPin(id, again, kb) {
    const st = $("pinStage"), board = $("pinBoard"); if (!st || !window.Pin3D) return;
    openId = id;
    const name = T(...PN[id]), tier = T("Plain", "素面", "แบบเรียบ");
    st.innerHTML = `<div class="pg-hero"></div><b class="pg-name">${esc(name)}</b><div class="pg-btns"><button type="button" class="pg-flip"><i data-lucide="refresh-cw" class="ic"></i><span>${esc(T("Turn it over", "翻過來", "พลิกดู"))}</span></button><button type="button" class="pg-back"><i data-lucide="x" class="ic"></i><span>${esc(T("Back to the board", "回到徽章板", "กลับไปที่บอร์ด"))}</span></button></div>`;
    const p = Pin3D.make({ id, front: `assets/pins/front/${id}.svg`, back: `assets/pins/back/${id}.svg`, lines: [name, tier, ""], lang: L(), flip: "click", label: name, max: 18 });
    st.querySelector(".pg-hero").append(p); Pin3D.attach(st);
    st.hidden = false; board.setAttribute("aria-hidden", "true"); board.inert = true;
    if (!REDUCE && !again) { p.classList.add("pg-spin"); setTimeout(() => p.classList.remove("pg-spin"), 900); }
    st.querySelector(".pg-flip").addEventListener("click", () => Pin3D.flip(p));
    st.querySelector(".pg-back").addEventListener("click", closePin);
    if (window.lucide) lucide.createIcons();
    if (!again && kb) st.querySelector(".pg-flip").focus({ preventScroll: true });
  }
  function closePin() {
    const st = $("pinStage"), board = $("pinBoard"), id = openId; openId = "";
    st.hidden = true; st.innerHTML = ""; board.removeAttribute("aria-hidden"); board.inert = false;
    board.querySelector(`[data-pin="${id}"]`)?.focus({ preventScroll: true });
  }
  document.addEventListener("click", (e) => { const b = e.target.closest("#pinBoard [data-pin]"); if (b) openPin(b.dataset.pin, false, e.detail === 0); });   // (keyboard: focus moves into the card)
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && openId) closePin(); });

  // ---- folds ("more"): open and close smoothly (instantly with reduced motion); the section tracker re-measures after
  const retrack = () => { document.querySelectorAll(".subnav").forEach((n) => n.__redraw && n.__redraw()); window.dispatchEvent(new Event("scroll")); };
  document.addEventListener("toggle", (e) => { if (e.target.matches && e.target.matches("details")) requestAnimationFrame(retrack); }, true);
  document.addEventListener("click", (e) => {
    const sm = e.target.closest("details.ml-more > summary"); if (!sm || REDUCE || !sm.animate) return;
    const d = sm.parentElement; if (d.__anim) return;
    e.preventDefault();
    const shut = sm.offsetHeight, opening = !d.open;
    if (opening) d.open = true;
    const full = d.scrollHeight;
    d.style.overflow = "hidden";
    const a = d.animate([{ height: `${opening ? shut : full}px` }, { height: `${opening ? full : shut}px` }], { duration: Math.min(520, 220 + full / 8), easing: "cubic-bezier(.2, .8, .3, 1)" });
    d.__anim = a;
    a.onfinish = a.oncancel = () => { d.__anim = null; d.style.overflow = ""; if (!opening) d.open = false; retrack(); };
  });

  window.drawNext = () => { pics(); band(); };
  window.drawNext();
})();
