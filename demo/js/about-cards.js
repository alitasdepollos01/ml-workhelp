// Settings › About & updates: the "Updates" card and the "Backup & restore" card, and the welcome window's offer to
// restore a backup found on a new install. Built from the approved prototype (proto/settings/app/js/proto-cards.js:
// its layout, behaviour and words in English, 繁中 and ไทย), on the app's side: main.js does the work (backup.js,
// content-updates.js) through MLHost.backup / MLHost.content (preload.js), and the macOS save / open windows are the
// real ones. tab-settings.js shows the cards (updatesCard(), yourDataCard()); welcome.js shows restoreOffer().
// Without those host calls (the website's demo, VS Code) the cards aren't shown: each returns null.

import { el, host, toast, LOC, clock, L, state, hm } from "./app-common.js";

const lang = host?.lang === "zh" || host?.lang === "th" ? host.lang : "en";
/** The three languages side by side, as in the prototype (Thai written out here, not looked up). */
const T = (en, zh, th) => (lang === "zh" ? zh : lang === "th" ? th : en);
const DAY = 864e5;
export const hasBackup = () => typeof host?.backup === "function";
export const hasContent = () => typeof host?.content === "function";

// (the cards' styles: one file, loaded once, by this module, so app.html and welcome.html need nothing)
if (typeof document !== "undefined" && !document.querySelector("link[data-about-cards]")) {
  const link = document.createElement("link");
  link.rel = "stylesheet"; link.href = new URL("../about-cards.css", import.meta.url).href; link.dataset.aboutCards = "1";
  document.head.append(link);
}

// ---- small helpers -------------------------------------------------------------------------------------------------
const mb = (b) => (b >= 100e6 ? `${Math.round(b / 1e6)} MB` : `${(b / 1e6).toFixed(1)} MB`);
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
const date = (t, o = {}) => new Date(t).toLocaleDateString(LOC, { day: "numeric", month: "short", ...o });
const longDate = (t) => new Date(t).toLocaleDateString(LOC, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
/** "today" / "yesterday" / "26 Oct" */
const day = (t) => (sameDay(t, Date.now()) ? T("today", "今天", "วันนี้") : sameDay(t, Date.now() - DAY) ? T("yesterday", "昨天", "เมื่อวาน") : date(t));
const saved = () => toast(L("Saved", "已儲存"));

function btn(label, fn, cls = "") {
  const b = el("button", { type: "button", className: ("btn small " + cls).trim(), textContent: label });
  b.addEventListener("click", fn);
  return b;
}
const row = (label, sub, ...ctrl) => el("div", { className: "field pd-field" },
  el("span", { className: "pd-lbl" }, el("span", { textContent: label }), sub ? el("small", { className: "muted", textContent: sub }) : null),
  el("span", { className: "inline" }, ...ctrl));
function sw(on, onChange, label) {
  const b = el("button", { type: "button", className: "switch" + (on ? " on" : ""), role: "switch", "aria-checked": String(!!on), "aria-label": label });
  b.addEventListener("click", () => onChange(!on));
  return b;
}
/** The app's segmented choice (.days-pick); arrow keys move along it. */
function seg(options, value, onChange, label) {
  const g = el("div", { className: "days-pick pd-seg", role: "radiogroup", "aria-label": label });
  const pick = (b, v) => { for (const x of g.children) { x.classList.toggle("on", x === b); x.setAttribute("aria-checked", String(x === b)); x.tabIndex = x === b ? 0 : -1; } onChange(v); };
  g.append(...options.map(([v, t]) => {
    const b = el("button", { type: "button", className: v === value ? "on" : "", textContent: t, role: "radio", "aria-checked": String(v === value), tabIndex: v === value ? 0 : -1, "data-k": "seg-" + v });
    b.addEventListener("click", () => pick(b, v));
    b.addEventListener("keydown", (e) => {
      const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!d) return;
      e.preventDefault(); const kids = [...g.children], i = (kids.indexOf(b) + d + kids.length) % kids.length; kids[i].focus(); kids[i].click();
    });
    return b;
  }));
  return g;
}
const keyed = (node, k) => { node.dataset.k = k; return node; };
/** A card that draws itself again when `refresh()` is called or its news comes (and keeps the focus where it was). */
function liveCard(cls, load, paint, listen) {
  const card = el("section", { className: "card " + cls });
  let data = null;
  const draw = () => {
    if (!data) return;
    const k = document.activeElement && card.contains(document.activeElement) ? document.activeElement.dataset.k : null;
    card.replaceChildren(...paint(data, refresh).flat().filter(Boolean));
    if (k) card.querySelector(`[data-k="${k}"]`)?.focus();
  };
  async function refresh(d) { data = d || (await load()); draw(); }
  const off = listen?.((d) => { if (!card.isConnected && card.childElementCount) return off?.(); data = d; draw(); });
  refresh();
  return card;
}

// (news from main.js: the content state, the backup state; preload adds a listener each time, so one here)
const contentSubs = new Set(), backupSubs = new Set();
if (typeof host?.onContent === "function") host.onContent((s) => contentSubs.forEach((f) => f(s)));
if (typeof host?.onBackup === "function") host.onBackup((s) => backupSubs.forEach((f) => f(s)));
const sub = (set) => (f) => { set.add(f); return () => set.delete(f); };

// ---- dialogs: the app's own (.pd-dlg), also on the welcome window ----------------------------------------------------
function dialog(title) {
  const back = el("div", { className: "pd-dlg-back" });
  const id = "pd-t" + Math.random().toString(36).slice(2, 7);
  const box = el("div", { className: "pd-dlg", role: "dialog", "aria-modal": "true", "aria-labelledby": id });
  const head = el("div", { className: "box-head" }, el("b", { id, textContent: title }));
  const body = el("div", { className: "pd-dlg-body" });
  box.append(head, body); back.append(box);
  const prev = document.activeElement;
  const close = () => { back.remove(); document.removeEventListener("keydown", key, true); if (prev?.isConnected) prev.focus(); else document.querySelector("main")?.focus(); };
  const key = (e) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onEsc(); }
    if (e.key === "Tab") { // (the focus stays in the dialog)
      const f = [...box.querySelectorAll("button, input, select, [tabindex='0']")].filter((x) => !x.disabled && x.offsetParent);
      if (!f.length) return; const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  };
  let onEsc = close;
  document.addEventListener("keydown", key, true);
  document.body.append(back);
  const focusFirst = () => requestAnimationFrame(() => (box.querySelector("[autofocus]") || box.querySelector("input, .btn.primary, button"))?.focus());
  return { box, body, close, setEsc: (f) => { onEsc = f; }, focusFirst, setTitle: (t) => { head.querySelector("b").textContent = t; } };
}
/** append (or replace with) the given parts, leaving out the empty ones */
const fill = (box, replace, ...kids) => { const k = kids.flat().filter((x) => x != null && x !== false); if (replace) box.replaceChildren(...k); else box.append(...k); };
const actions = (...b) => el("div", { className: "pd-actions" }, ...b);
const busy = (text) => el("p", { className: "pd-busy", role: "status" }, el("i", { className: "pd-spin", "aria-hidden": "true" }), text);
const fileRow = (f) => el("span", { className: "pd-file" }, el("span", { className: "pd-zip", "aria-hidden": "true", textContent: "ZIP" }),
  el("span", {}, el("b", { textContent: f.name }), el("small", { className: "muted", textContent: [f.where, f.size ? mb(f.size) : null, f.at ? date(f.at, { year: "numeric" }) : null].filter(Boolean).join(" · ") })));

/** A file that can't be restored: why, in words. */
const whyNot = (error) => ({
  "not-backup": T("That file isn't an ML WorkHelp backup.", "這個檔案不是 ML WorkHelp 的備份。", "ไฟล์นี้ไม่ใช่ไฟล์สำรองของ ML WorkHelp"),
  damaged: T("This backup is damaged, so nothing was changed.", "這份備份檔損壞了，所以什麼都沒有改。", "ไฟล์สำรองนี้เสียหาย จึงไม่ได้เปลี่ยนอะไรเลย"),
  newer: T("This backup is from a newer ML WorkHelp. Update the app first, then restore it.", "這份備份是用比較新的 ML WorkHelp 做的。請先更新 App，再還原。", "ไฟล์สำรองนี้มาจาก ML WorkHelp เวอร์ชันที่ใหม่กว่า อัปเดตแอปก่อนแล้วค่อยกู้คืน"),
  safety: T("Couldn't save a copy of what's here now, so nothing was changed.", "沒辦法先把現在的資料另存一份，所以什麼都沒有改。", "บันทึกสำเนาของข้อมูลตอนนี้ไม่ได้ จึงไม่ได้เปลี่ยนอะไรเลย"),
}[error] || T("Couldn't read that file. If it's in iCloud Drive, wait for it to download and try again.", "讀不到這個檔案。如果它在 iCloud 雲碟裡，等它下載好再試一次。", "อ่านไฟล์นี้ไม่ได้ ถ้าอยู่ใน iCloud Drive รอให้ดาวน์โหลดเสร็จแล้วลองอีกครั้ง"));

// ---- what a backup holds, as a list ---------------------------------------------------------------------------------
function contentsList(c, { showDates = true } = {}) {
  const li = (k, v) => el("li", {}, el("span", { textContent: k }), el("b", { textContent: v }));
  return el("ul", { className: "pd-inc" },
    li(T("Work log", "工作紀錄", "บันทึกการทำงาน"), c.days ? T(`${c.days} days`, `${c.days} 天`, `${c.days} วัน`) + (showDates && c.from ? ` (${date(c.from)} – ${date(c.at)})` : "") : T("nothing yet", "還沒有", "ยังไม่มี")),
    li(T("Reminders & events", "提醒與活動", "การเตือนและกิจกรรม"), String(c.reminders || 0)),
    li(T("Settings & look", "設定與外觀", "การตั้งค่าและหน้าตา"), "✓"),
    li(T("Pins & codes", "徽章與兌換碼", "เข็มกลัดและโค้ด"), T(`${c.pins || 0} pins · ${c.codes || 0} codes`, `${c.pins || 0} 個徽章 · ${c.codes || 0} 組兌換碼`, `เข็มกลัด ${c.pins || 0} อัน · โค้ด ${c.codes || 0} อัน`)),
    li(T("Your own photos & stickers", "你自己的照片與貼圖", "รูปและสติกเกอร์ของคุณเอง"), T(`${c.photos || 0} photos · ${c.stickers || 0} stickers`, `${c.photos || 0} 張照片 · ${c.stickers || 0} 張貼圖`, `${c.photos || 0} รูป · สติกเกอร์ ${c.stickers || 0} ชิ้น`)));
}

// =====================================================================================================================
// "Updates"
// =====================================================================================================================
export function updatesCard() {
  if (!hasContent()) return null;
  let checking = false;
  return liveCard("updates-card", () => host.content("state"), (c, refresh) => {
    const st = state.st || {}, up = st.update;
    const isBusy = checking || c.checking || !!c.dl;
    const getNow = async () => { await host.content("get"); refresh(); };
    const checkNow = async () => {
      if (checking) return;
      checking = true; refresh(c);
      const s = await host.content("check");
      checking = false; refresh(s);
      const u = state.st?.update;
      toast(s.offer ? T(`New photos available (${mb(s.offer.size)})`, `有新照片（${mb(s.offer.size)}）`, `มีรูปใหม่ (${mb(s.offer.size)})`)
        : u ? T(`ML WorkHelp ${u.version} is ready to download`, `ML WorkHelp ${u.version} 可以下載了`, `ML WorkHelp ${u.version} พร้อมให้ดาวน์โหลดแล้ว`)
          : T("Everything's up to date", "都是最新的", "ทุกอย่างเป็นปัจจุบันแล้ว"));
    };
    // the app itself: its version, and a new one with the red dot
    const ver = row("ML WorkHelp", null, el("b", { textContent: st.version || "" }),
      up ? el("span", { className: "pd-newver" }, el("i", { className: "nav-dot", "aria-hidden": "true" }), T("a new version is ready:", "新版本好了：", "มีเวอร์ชันใหม่แล้ว:")) : el("span", { className: "muted", textContent: T("the newest version", "已是最新版本", "เป็นเวอร์ชันล่าสุดแล้ว") }),
      up ? keyed(btn(T(`Download ${up.version}`, `下載 ${up.version}`, `ดาวน์โหลด ${up.version}`), () => { host.settingText("openPage", "download"); toast(T("Opening the download page…", "正在打開下載頁面⋯", "กำลังเปิดหน้าดาวน์โหลด…")); }, "primary"), "dl-app") : null);
    const notes = up ? (lang === "zh" ? up.notes?.zh : lang === "th" ? up.notes?.th : null) || up.notes?.en || "" : "";
    const verNote = up ? el("p", { className: "muted small pd-note", textContent: (notes ? notes + " " : "") + T("Install it over this one: your work, settings and photos stay.", "直接裝在這個版本上就好，你的紀錄、設定和照片都會留著。", "ติดตั้งทับเวอร์ชันนี้ได้เลย งาน การตั้งค่า และรูปของคุณยังอยู่ครบ") }) : null;
    // photos and stickers
    const p = c.offer;
    let status;
    if (checking || c.checking) status = el("span", { className: "muted pd-busy", role: "status" }, el("i", { className: "pd-spin", "aria-hidden": "true" }), T("Checking…", "檢查中⋯", "กำลังตรวจ…"));
    else if (c.dl) status = el("span", { className: "pd-prog", role: "status" }, el("progress", { max: c.dl.size || 1, value: c.dl.got, "aria-label": T("Downloading the new photos", "正在下載新照片", "กำลังดาวน์โหลดรูปใหม่") }),
      el("span", { className: "muted", textContent: T(`${Math.round(c.dl.got / 1e6)} of ${mb(c.dl.size)}`, `${Math.round(c.dl.got / 1e6)} / ${mb(c.dl.size)}`, `${Math.round(c.dl.got / 1e6)} จาก ${mb(c.dl.size)}`) }));
    else if (p) status = el("b", { className: "pd-new", textContent: T(`New photos available (${mb(p.size)})`, `有新照片（${mb(p.size)}）`, `มีรูปใหม่ (${mb(p.size)})`) });
    else status = el("span", { className: "muted", title: c.checkedAt ? clock(c.checkedAt) : "", textContent: c.checkedAt ? T(`Checked ${day(c.checkedAt)} · everything up to date`, `${day(c.checkedAt)}檢查過 · 都是最新的`, `ตรวจแล้ว${day(c.checkedAt)} · ทุกอย่างเป็นปัจจุบัน`) : "" });
    const packLine = p && !c.dl ? el("p", { className: "muted small pd-note", textContent: p.stickers != null
      ? T(`${p.photos} new photos and ${p.stickers} stickers, for the focus screen, the buddy and Stickers.`, `${p.photos} 張新照片和 ${p.stickers} 張貼圖，專注全螢幕、桌面夥伴和「貼圖」都用得到。`, `รูปใหม่ ${p.photos} รูปกับสติกเกอร์ ${p.stickers} ชิ้น ใช้ได้ทั้งหน้าจอโฟกัส เพื่อนบนเดสก์ท็อป และหน้าสติกเกอร์`)
      : T(`${p.photos} new photos, for the focus screen, the buddy and Stickers.`, `${p.photos} 張新照片，專注全螢幕、桌面夥伴和「貼圖」都用得到。`, `รูปใหม่ ${p.photos} รูป ใช้ได้ทั้งหน้าจอโฟกัส เพื่อนบนเดสก์ท็อป และหน้าสติกเกอร์`) }) : null;
    const got = c.got;
    const gotLine = got && !p && !c.dl ? el("p", { className: "muted small pd-note", textContent: T(`Last pack: ${day(got.at)}, ${got.photos} photos and ${got.stickers} stickers ✓`, `上一包：${day(got.at)}，${got.photos} 張照片和 ${got.stickers} 張貼圖 ✓`, `ชุดล่าสุด: ${day(got.at)} ${got.photos} รูป สติกเกอร์ ${got.stickers} ชิ้น ✓`) }) : null;
    const btns = el("div", { className: "row-flex pd-btns" },
      p && !c.dl ? keyed(btn(T("Get them now", "現在下載", "รับเลยตอนนี้"), getNow, "primary"), "get") : null,
      c.dl ? keyed(btn(T("Cancel", "取消", "ยกเลิก"), async () => { refresh(await host.content("cancel")); toast(T("Stopped. You can get them later.", "停下來了，之後再下載也可以。", "หยุดแล้ว ไว้ค่อยรับทีหลังได้")); }), "cancel") : null,
      keyed(btn(T("Check now", "現在檢查", "ตรวจตอนนี้"), checkNow), "check"));
    btns.querySelector('[data-k="check"]').disabled = isBusy;
    // the setting
    const name = T("New photos and stickers", "新的照片和貼圖", "รูปและสติกเกอร์ใหม่");
    const mode = row(name, null, seg([["ask", T("Ask me", "先問我", "ถามฉันก่อน")], ["auto", T("Download automatically", "自動下載", "ดาวน์โหลดเอง")], ["never", T("Never", "不要", "ไม่ต้อง")]], c.mode, async (v) => {
      const s = await host.content("mode", { mode: v });
      if (v === "auto" && p && !c.dl) toast(T("Saved · downloading them in the background", "已儲存 · 在背景下載中", "บันทึกแล้ว · กำลังดาวน์โหลดเบื้องหลัง")); else saved();
      refresh(s);
    }, name));
    const modeNote = el("p", { className: "muted small pd-note", textContent: {
      ask: T("When a big pack is ready, your buddy asks first. Packs are often 100 MB or more.", "有大的更新包時，桌面夥伴會先問你。更新包常常有 100 MB 以上。", "ถ้ามีชุดใหญ่มา เพื่อนบนเดสก์ท็อปจะถามก่อน ชุดหนึ่งมักใหญ่ 100 MB ขึ้นไป"),
      auto: T("Big packs download in the background while the app is open, and show up when they're ready.", "App 開著的時候會在背景下載大的更新包，好了就會出現。", "ชุดใหญ่จะดาวน์โหลดเบื้องหลังตอนที่แอปเปิดอยู่ เสร็จแล้วก็โผล่มาเอง"),
      never: T("Nothing big is downloaded, and no one asks. You can still get a pack here any time.", "不會下載大檔案，也不會再問你。想要的時候，隨時可以在這裡下載。", "จะไม่ดาวน์โหลดไฟล์ใหญ่และไม่ถามอีก แต่ถ้าอยากได้ ก็กดรับที่นี่ได้ทุกเมื่อ"),
    }[c.mode] || "" });
    const sm = c.small || {}, n = sm.counts || {};
    const quiet = el("p", { className: "pd-quiet" }, el("span", { className: "pd-tick", "aria-hidden": "true", textContent: "✓" }),
      el("span", { textContent: T("Small updates (photo credits, pins, words) are applied quietly.", "小更新（照片來源、徽章、單字）會自動悄悄套用。", "อัปเดตเล็ก ๆ (เครดิตรูป เข็มกลัด คำศัพท์) จะลงให้เงียบ ๆ เอง") + (sm.at ? " " + T(
        `Last: ${day(sm.at)}, ${n.credits || 0} credit fixes, ${n.pins || 0} new pins and ${n.words || 0} new words.`,
        `上一次：${day(sm.at)}，修正 ${n.credits || 0} 筆照片來源，新增 ${n.pins || 0} 個徽章和 ${n.words || 0} 個單字。`,
        `ครั้งล่าสุด: ${day(sm.at)} แก้เครดิต ${n.credits || 0} รายการ เข็มกลัดใหม่ ${n.pins || 0} อัน คำใหม่ ${n.words || 0} คำ`) : "") }));
    const dailyLabel = T("Look for updates once a day", "每天檢查一次更新", "ตรวจหาอัปเดตวันละครั้ง");
    const daily = keyed(el("input", { type: "checkbox", checked: st.updateCheck !== false, "aria-label": dailyLabel }), "daily");
    daily.addEventListener("change", () => { host.settingText("updateCheck", daily.checked ? "on" : "off"); saved(); });
    return [
      el("h3", { textContent: T("Updates", "更新", "อัปเดต") }),
      ver, verNote,
      el("hr", { className: "pd-hr" }),
      row(T("Photos and stickers", "照片與貼圖", "รูปและสติกเกอร์"), null, status), packLine, gotLine, btns,
      mode, modeNote, quiet,
      el("hr", { className: "pd-hr" }),
      row(dailyLabel, null, daily),
      el("p", { className: "muted small pd-note", textContent: T("It only reads two small files on the app's page (GitHub); nothing about you or your work is sent.", "只會讀取 App 網頁（GitHub）上的兩個小檔案，不會傳送任何關於你或你工作的資料。", "แค่อ่านไฟล์เล็ก ๆ สองไฟล์จากหน้าเว็บของแอป (GitHub) ไม่มีการส่งข้อมูลใด ๆ เกี่ยวกับคุณหรืองานของคุณ") }),
    ];
  }, sub(contentSubs));
}

// =====================================================================================================================
// "Backup & restore"
// =====================================================================================================================
let backingUp = false;
const backupDialogs = () => ({ title: T("Save the backup", "儲存備份", "บันทึกไฟล์สำรอง"), button: T("Save", "儲存", "บันทึก") });
async function backUpNow(refresh) {
  backingUp = true; refresh?.();
  let r;
  try { r = await host.backup("now", backupDialogs()); } finally { backingUp = false; }
  refresh?.();
  if (r?.ok) toast(T(`Backed up · ${mb(r.size)}`, `備份好了 · ${mb(r.size)}`, `สำรองเรียบร้อย · ${mb(r.size)}`));
  else if (r && !r.canceled) toast(T("Couldn't back up: ", "沒辦法備份：", "สำรองข้อมูลไม่ได้: ") + (r.message || r.error || ""));
  return r;
}
const folderDialog = () => ({ title: T("Choose a folder for the weekly backups", "選一個放每週備份的資料夾", "เลือกโฟลเดอร์เก็บไฟล์สำรองรายสัปดาห์"), button: T("Choose", "選擇", "เลือก") });
async function weekly(on, refresh) {
  const r = await host.backup("weekly", { on, ...folderDialog() });
  if (!r?.ok) return refresh();
  refresh(r.state);
  if (!on) toast(T("Weekly backups are off. The files already made stay.", "每週備份關掉了，已經做好的備份檔會留著。", "ปิดการสำรองรายสัปดาห์แล้ว ไฟล์ที่ทำไว้ยังอยู่"));
  else { const d = date(r.state.nextAt, { weekday: "short" }); toast(T(`On · next backup ${d}`, `已開啟 · 下次備份：${d}`, `เปิดแล้ว · สำรองครั้งถัดไป ${d}`)); }
}
async function restore() {
  const f = await host.backup("pick", { title: T("Choose a backup file", "選一個備份檔", "เลือกไฟล์สำรอง"), button: T("Open", "打開", "เปิด") });
  if (!f || f.canceled) return;
  if (!f.ok) { toast(whyNot(f.error)); return; }
  restoreDialog(f);
}
/** What's in a backup, and the question; Settings and the welcome window (restoreOffer). */
export async function restoreDialog(f, { after = null, fresh = false } = {}) {
  const here = fresh ? null : await host.backup("contents");
  const wiped = fresh || !here || !(here.days || here.reminders || here.photos || here.stickers || here.pins);
  const d = dialog(T("Restore this backup?", "要還原這份備份嗎？", "กู้คืนไฟล์สำรองนี้ไหม?"));
  const today = state.st?.today ? hm(state.st.today) : null;
  fill(d.body, false,
    el("p", { className: "pd-file-line" }, fileRow(f)),
    el("p", { className: "muted small", textContent: T(`Made on ${longDate(f.at)}, ${clock(f.at)}, with ML WorkHelp ${f.version}.`, `${longDate(f.at)} ${clock(f.at)} 用 ML WorkHelp ${f.version} 做的。`, `ทำเมื่อ ${longDate(f.at)} ${clock(f.at)} ด้วย ML WorkHelp ${f.version}`) }),
    contentsList(f.contents || {}),
    wiped ? null : el("p", { className: "pd-warn", textContent: today
      ? T(`It replaces what's in the app now, including today's ${today} of work. A copy of what's here now is saved first, just in case.`, `它會取代 App 裡現在的資料，包括今天工作的 ${today}。保險起見，會先把現在的資料另存一份。`, `ข้อมูลในแอปตอนนี้จะถูกแทนที่ทั้งหมด รวมถึงงานวันนี้ ${today} แต่จะเก็บสำเนาของตอนนี้ไว้ก่อนเผื่อไว้`)
      : T("It replaces what's in the app now. A copy of what's here now is saved first, just in case.", "它會取代 App 裡現在的資料。保險起見，會先把現在的資料另存一份。", "ข้อมูลในแอปตอนนี้จะถูกแทนที่ทั้งหมด แต่จะเก็บสำเนาของตอนนี้ไว้ก่อนเผื่อไว้") }),
    actions(btn(T("Cancel", "取消", "ยกเลิก"), d.close), btn(T("Restore", "還原", "กู้คืน"), go, "primary")));
  d.focusFirst();
  async function go() {
    d.setEsc(() => {});
    fill(d.body, true, busy(T("Putting everything back…", "正在全部放回去⋯", "กำลังนำทุกอย่างกลับมา…")));
    const r = await host.backup("restore", { id: f.id, safetyName: T("ML WorkHelp before restoring", "ML WorkHelp 還原前的資料", "ML WorkHelp ก่อนกู้คืน") });
    d.setEsc(d.close);
    if (!r?.ok) {
      fill(d.body, true, el("p", { className: "pd-err", role: "alert", textContent: whyNot(r?.error) }), actions(btn(T("OK", "好", "ตกลง"), d.close, "primary")));
      return d.focusFirst();
    }
    const c = f.contents || {};
    // (the app starts again to take it in: when this is closed, or by itself a little later)
    const done = () => { d.close(); after?.run?.(); host.backup("relaunch"); };
    d.setTitle(T("All back", "全部回來了", "กลับมาครบแล้ว"));
    d.setEsc(done);
    fill(d.body, true,
      el("p", { className: "pd-ok", textContent: T(`Everything is back as it was on ${date(f.at)}: ${c.days || 0} days of work, ${c.pins || 0} pins, ${c.photos || 0} of your own photos, and your settings.`, `全部回到 ${date(f.at)} 的樣子了：${c.days || 0} 天的工作紀錄、${c.pins || 0} 個徽章、${c.photos || 0} 張你自己的照片，還有你的設定。`, `ทุกอย่างกลับมาเหมือนวันที่ ${date(f.at)}: งาน ${c.days || 0} วัน เข็มกลัด ${c.pins || 0} อัน รูปของคุณ ${c.photos || 0} รูป และการตั้งค่าของคุณ`) }),
      r.safety ? el("p", { className: "muted small", textContent: T(`The copy from before is in ${r.safety.where}.`, `還原前的那份在 ${r.safety.where}。`, `สำเนาก่อนกู้คืนอยู่ที่ ${r.safety.where}`) }) : null,
      actions(btn(after ? after.label : T("OK", "好", "ตกลง"), done, "primary")));
    d.focusFirst();
  }
}

const WORD = { en: "DELETE", zh: "刪除", th: "ลบ" }[lang];
function deleteFlow(s, refresh) {
  const c = s.contents || {};
  const d = dialog(T("Delete everything?", "要全部刪除嗎？", "ลบทั้งหมดไหม?"));
  const holdHelp = T("Type the word, then click. Or press and hold the button (mouse, Space or Enter) for 3 seconds.", "輸入後按一下；或用滑鼠、空白鍵或 Enter 按住按鈕 3 秒。", "พิมพ์คำแล้วคลิก หรือกดปุ่มค้างไว้ 3 วินาที (เมาส์ Space หรือ Enter)");
  const step1 = () => {
    d.setEsc(d.close);
    fill(d.body, true,
      el("p", { textContent: T("This deletes from this Mac:", "這會從這台 Mac 刪除：", "สิ่งที่จะถูกลบจาก Mac เครื่องนี้:") }),
      contentsList({ ...c, at: Date.now() }, { showDates: false }),
      el("p", { className: "pd-keep" }, el("b", { textContent: T("What stays: ", "會留下的：", "สิ่งที่ยังอยู่: ") }),
        T("the photos and stickers that came with the app, and any backup files you saved (they're yours, in your folders).", "App 附的照片和貼圖，還有你存好的備份檔（它們在你自己的資料夾裡）。", "รูปและสติกเกอร์ที่มากับแอป และไฟล์สำรองที่คุณบันทึกไว้ (อยู่ในโฟลเดอร์ของคุณเอง)")),
      s.last ? el("p", { className: "muted small", textContent: T(`Your last backup: ${day(s.last.at)}, ${mb(s.last.size)}.`, `你最近一次備份：${day(s.last.at)}，${mb(s.last.size)}。`, `สำรองล่าสุด: ${day(s.last.at)} ${mb(s.last.size)}`) })
        : el("p", { className: "pd-warn" }, T("You have no backup yet. Once it's deleted, it can't come back.", "你還沒有備份。刪掉之後就救不回來了。", "คุณยังไม่มีไฟล์สำรอง ลบแล้วจะเอากลับมาไม่ได้"), " ",
          btn(T("Back up first…", "先備份⋯", "สำรองก่อน…"), async () => { d.close(); await backUpNow(refresh); })),
      actions(btn(T("Cancel", "取消", "ยกเลิก"), d.close), btn(T("Next ›", "下一步 ›", "ถัดไป ›"), step2, "danger-fill")));
    d.focusFirst();
  };
  const step2 = () => {
    const input = el("input", { type: "text", className: "pd-type", autocomplete: "off", spellcheck: false, "aria-label": T(`Type ${WORD} to confirm`, `輸入「${WORD}」來確認`, `พิมพ์ "${WORD}" เพื่อยืนยัน`), placeholder: WORD });
    const hold = el("button", { type: "button", className: "btn small danger-fill pd-hold", "aria-describedby": "pd-hold-help" }, el("span", { className: "pd-hold-fill", "aria-hidden": "true" }), el("span", { className: "pd-hold-t", textContent: T("Delete everything", "全部刪除", "ลบทั้งหมด") }));
    const help = el("p", { id: "pd-hold-help", className: "muted small", role: "status", textContent: holdHelp });
    const typed = () => [WORD, "DELETE"].includes(input.value.trim().toUpperCase()) || input.value.trim() === WORD;
    input.addEventListener("input", () => hold.classList.toggle("ready", typed()));
    input.addEventListener("keydown", (e) => { if (e.key === "Enter" && typed()) wipe(); });
    // press and hold: 3 s, the button fills up; let go early and it empties
    let t0 = 0, raf = 0, held = false;
    const fillTo = (p) => hold.style.setProperty("--hold", String(p));
    const tick = () => { const p = Math.min(1, (performance.now() - t0) / 3000); fillTo(p); if (p >= 1) { held = true; stop(); wipe(); } else raf = requestAnimationFrame(tick); };
    const startHold = () => { if (raf || held) return; if (typed()) return wipe(); t0 = performance.now(); raf = requestAnimationFrame(tick); help.textContent = T("Keep holding…", "繼續按住⋯", "กดค้างไว้…"); };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; if (!held) { fillTo(0); help.textContent = holdHelp; } };
    hold.addEventListener("pointerdown", (e) => { e.preventDefault(); hold.focus(); try { hold.setPointerCapture(e.pointerId); } catch { /* (no real pointer) */ } startHold(); });
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture", "blur"]) hold.addEventListener(ev, stop);
    hold.addEventListener("keydown", (e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); startHold(); } else if (e.key === " " || e.key === "Enter") e.preventDefault(); });
    hold.addEventListener("keyup", (e) => { if (e.key === " " || e.key === "Enter") stop(); });
    d.setEsc(d.close);
    fill(d.body, true,
      el("p", { textContent: T(`To be sure, type ${WORD} below, or press and hold the button for 3 seconds.`, `為了確定，請在下面輸入「${WORD}」，或按住按鈕 3 秒。`, `เพื่อความแน่ใจ พิมพ์ "${WORD}" ด้านล่าง หรือกดปุ่มค้างไว้ 3 วินาที`) }),
      input, help,
      actions(btn(T("‹ Back", "‹ 上一步", "‹ ย้อนกลับ"), step1), btn(T("Cancel", "取消", "ยกเลิก"), d.close), hold));
    requestAnimationFrame(() => input.focus());
  };
  let wiping = false;
  const wipe = async () => {
    if (wiping) return; wiping = true;
    d.setEsc(() => {});
    fill(d.body, true, busy(T("Deleting…", "刪除中⋯", "กำลังลบ…")));
    const r = await host.backup("delete", { confirm: true });
    if (!r?.ok) { d.setEsc(d.close); fill(d.body, true, el("p", { className: "pd-err", role: "alert", textContent: r?.message || r?.error || "" }), actions(btn(T("Close", "關閉", "ปิด"), d.close))); return; }
    // (the app starts again as new, with the welcome: when this is closed, or by itself in a few seconds)
    const again = () => { d.close(); host.backup("relaunch"); };
    d.setTitle(T("Everything's deleted", "全部刪除了", "ลบทั้งหมดแล้ว"));
    d.setEsc(again);
    fill(d.body, true,
      el("p", { textContent: T("ML WorkHelp now starts as new. The photos and stickers that came with it are still here.", "ML WorkHelp 現在會像新裝的一樣重新開始。App 附的照片和貼圖都還在。", "ML WorkHelp จะเริ่มใหม่เหมือนเพิ่งติดตั้ง รูปและสติกเกอร์ที่มากับแอปยังอยู่ครบ") }),
      actions(btn(T("Close", "關閉", "ปิด"), again), btn(T("Start fresh (welcome)", "重新開始（歡迎畫面）", "เริ่มใหม่ (หน้าต้อนรับ)"), again, "primary")));
    d.focusFirst();
  };
  step1();
}

/** Backup & restore › Reset pins (track B1's pins.js does it: MLHost.pins.reset; the row shows only when it's there). */
function resetPins(s) {
  const c = s.contents || {};
  const d = dialog(T("Reset your pins?", "要重設徽章嗎？", "รีเซ็ตเข็มกลัดไหม?"));
  fill(d.body, false,
    el("p", { textContent: T(`Your ${c.pins || 0} pins come off the board, and the ${c.codes || 0} codes you used can be used again. From today you earn them again as you work.`, `你的 ${c.pins || 0} 個徽章會從徽章板拿下來，用過的 ${c.codes || 0} 組兌換碼可以再用一次。從今天起，邊工作邊重新收集。`, `เข็มกลัด ${c.pins || 0} อันจะถูกเอาออกจากบอร์ด และโค้ด ${c.codes || 0} อันที่ใช้ไปแล้วจะใช้ได้อีกครั้ง ตั้งแต่วันนี้ไปจะได้เข็มกลัดใหม่ระหว่างทำงาน`) }),
    el("p", { className: "pd-keep", textContent: T("Your work log, settings and photos stay.", "工作紀錄、設定和照片都會留著。", "บันทึกการทำงาน การตั้งค่า และรูปยังอยู่ครบ") }),
    s.last ? el("p", { className: "muted small", textContent: T(`Your last backup (${day(s.last.at)}) still has them, if you ever want them back.`, `想要拿回來的話，你上次的備份（${day(s.last.at)}）裡還有。`, `ถ้าอยากได้คืน ไฟล์สำรองล่าสุด (${day(s.last.at)}) ยังมีอยู่`) }) : null,
    actions(btn(T("Cancel", "取消", "ยกเลิก"), d.close), btn(T("Reset pins", "重設徽章", "รีเซ็ตเข็มกลัด"), async () => {
      await host.pins.reset();
      d.close(); toast(T("Pins reset. The first one is a day of work away.", "徽章重設好了，工作一天就能拿到第一個。", "รีเซ็ตแล้ว ทำงานหนึ่งวันก็ได้อันแรก"));
    }, "danger-fill")));
  d.focusFirst();
}

export function yourDataCard() {
  if (!hasBackup()) return null;
  return liveCard("data-card", () => host.backup("state"), (b, refresh) => {
    const last = b.last;
    const lastLine = backingUp ? el("span", { className: "muted pd-busy", role: "status" }, el("i", { className: "pd-spin", "aria-hidden": "true" }), T("Backing up…", "備份中⋯", "กำลังสำรอง…"))
      : last ? el("span", { className: "muted", textContent: T(`Last backup: ${day(last.at)} ${clock(last.at)} · ${mb(last.size)}`, `上次備份：${day(last.at)} ${clock(last.at)} · ${mb(last.size)}`, `สำรองล่าสุด: ${day(last.at)} ${clock(last.at)} · ${mb(last.size)}`) })
        : el("span", { className: "muted", textContent: T("No backup yet.", "還沒有備份過。", "ยังไม่เคยสำรองข้อมูล") });
    const backNow = keyed(btn(T("Back up now…", "立即備份⋯", "สำรองตอนนี้…"), () => backUpNow(() => refresh()), "primary"), "backup");
    backNow.disabled = backingUp;
    const weeklyName = T("Back up every week", "每週自動備份", "สำรองข้อมูลทุกสัปดาห์");
    const weeklyBox = b.auto ? el("div", { className: "pd-sub" },
      el("div", { className: "row-flex" }, el("span", { className: "muted", textContent: T("To", "存到", "เก็บไว้ที่") }), el("b", { textContent: b.where }),
        keyed(btn(T("Change…", "更改⋯", "เปลี่ยน…"), async () => { const r = await host.backup("folder", folderDialog()); if (r?.ok) { refresh(r.state); saved(); } }), "folder")),
      el("div", { className: "muted small", textContent: T(`Next: ${date(b.nextAt, { weekday: "short" })} · keeps the last ${b.keep}; older ones are removed.`, `下一次：${date(b.nextAt, { weekday: "short" })} · 保留最近 ${b.keep} 份，更舊的會刪掉。`, `ครั้งถัดไป: ${date(b.nextAt, { weekday: "short" })} · เก็บไว้ ${b.keep} ไฟล์ล่าสุด ไฟล์ที่เก่ากว่านั้นจะถูกลบ`) }),
      el("div", { className: "muted small", textContent: T("If the app isn't open that day, it backs up the next time it is.", "那天沒開 App 的話，下次打開時就會備份。", "ถ้าวันนั้นไม่ได้เปิดแอป จะสำรองตอนที่เปิดครั้งถัดไป") }))
      : null;
    return [
      el("h3", { textContent: T("Backup & restore", "備份與還原", "สำรองและกู้คืน") }),
      el("p", { className: "muted small pd-note", textContent: T("Your work log, settings, pins and own photos live only on this Mac. A backup puts them all in one file you can keep anywhere.", "你的工作紀錄、設定、徽章和自己的照片都只存在這台 Mac 上。備份會把它們全部放進一個檔案，想放哪裡都可以。", "บันทึกการทำงาน การตั้งค่า เข็มกลัด และรูปของคุณเอง อยู่แค่ใน Mac เครื่องนี้ การสำรองข้อมูลจะรวมทุกอย่างไว้ในไฟล์เดียว เก็บไว้ที่ไหนก็ได้") }),
      row(T("Backup", "備份", "ไฟล์สำรอง"), null, lastLine, backNow),
      last && !backingUp ? el("div", { className: "muted small pd-where" }, el("span", { textContent: `${last.name} · ${last.where}` }), " ",
        last.there ? keyed(btn(T("Show in Finder", "在 Finder 中顯示", "แสดงใน Finder"), () => host.backup("show"), "pd-link"), "finder") : null) : null,
      el("details", { className: "pd-what" }, el("summary", { textContent: T("What's in a backup", "備份裡有什麼", "ในไฟล์สำรองมีอะไรบ้าง") }),
        contentsList({ ...(b.contents || {}), at: Date.now() }),
        el("p", { className: "muted small", textContent: T("One .zip file. The photos and stickers that came with the app aren't in it: they come back with the app.", "就是一個 .zip 檔。App 附的照片和貼圖不會放進去，重新安裝 App 就會回來。", "เป็นไฟล์ .zip ไฟล์เดียว รูปและสติกเกอร์ที่มากับแอปไม่ได้อยู่ในนั้น ติดตั้งแอปใหม่ก็ได้คืนมาเอง") })),
      el("hr", { className: "pd-hr" }),
      row(weeklyName, b.auto ? null : T("Off. Turn it on and pick a folder, iCloud Drive for example.", "目前關閉。打開後選一個資料夾，例如 iCloud Drive。", "ปิดอยู่ เปิดแล้วเลือกโฟลเดอร์ เช่น iCloud Drive"),
        keyed(sw(b.auto, (on) => weekly(on, refresh), weeklyName), "weekly")),
      weeklyBox,
      el("hr", { className: "pd-hr" }),
      row(T("Restore from a backup", "從備份還原", "กู้คืนจากไฟล์สำรอง"), T("Puts back everything from a backup file.", "把備份檔裡的東西全部放回來。", "นำทุกอย่างจากไฟล์สำรองกลับมา"),
        keyed(btn(T("Restore from a backup…", "從備份還原⋯", "กู้คืนจากไฟล์สำรอง…"), restore), "restore")),
      typeof host.pins?.reset === "function" ? el("div", { className: "pd-reset" }, row(T("Reset pins", "重設徽章", "รีเซ็ตเข็มกลัด"), T("Clears all your pins. You earn them again from today; your work log stays.", "清空你所有的徽章，從今天起重新收集；工作紀錄會留著。", "ล้างเข็มกลัดทั้งหมด แล้วเริ่มสะสมใหม่ตั้งแต่วันนี้ บันทึกการทำงานยังอยู่ครบ"),
        keyed(btn(T("Reset pins…", "重設徽章⋯", "รีเซ็ตเข็มกลัด…"), () => resetPins(b)), "resetpins"))) : null,
      row(T("Delete everything", "全部刪除", "ลบทั้งหมด"), T("Your work log, settings, pins and own photos. Asks twice.", "工作紀錄、設定、徽章和自己的照片。會問你兩次。", "บันทึกการทำงาน การตั้งค่า เข็มกลัด และรูปของคุณเอง ระบบจะถามสองครั้ง"),
        keyed(btn(T("Delete everything…", "全部刪除⋯", "ลบทั้งหมด…"), () => deleteFlow(b, refresh), "danger"), "delete")),
    ];
  }, sub(backupSubs));
}

/** The About group's line on the Settings home page (the prototype's aboutSum): what it has, and what it says now. */
export function aboutHas() {
  return T("Version, updates, backup & restore, notices, tours, start at login, uninstall", "版本、更新、備份與還原、通知、導覽、登入時打開、解除安裝", "เวอร์ชัน อัปเดต สำรองและกู้คืน การแจ้งเตือน ทัวร์ เปิดตอนล็อกอิน ถอนการติดตั้ง");
}

// =====================================================================================================================
// The welcome window: a new install that finds a backup in the usual folders offers it (not a welcome choice: a box
// on the first page, as the :8847 prototype has it). Resolves the box, or null when there's nothing to offer.
// =====================================================================================================================
export async function restoreOffer() {
  if (!hasBackup()) return null;
  const f = await host.backup("offer");
  if (!f?.ok) return null;
  const box = el("section", { className: "pd-offer", "aria-labelledby": "pd-offer-h" });
  const what = el("div", { hidden: true }, contentsList(f.contents || {}, { showDates: false }));
  const toggle = btn(T("What's in it?", "裡面有什麼？", "ข้างในมีอะไร?"), () => { what.hidden = !what.hidden; toggle.setAttribute("aria-expanded", String(!what.hidden)); });
  toggle.classList.remove("small");
  toggle.setAttribute("aria-expanded", "false");
  const mbOne = (b) => `${(b / 1e6).toFixed(1)} MB`;
  const restoreIt = btn(T("Restore it", "還原", "กู้คืน"), () => restoreDialog(f, { fresh: true, after: { label: T("Open ML WorkHelp", "打開 ML WorkHelp", "เปิด ML WorkHelp") } }), "primary");
  restoreIt.classList.remove("small");
  const no = btn(T("No thanks, start fresh", "不用了，從頭開始", "ไม่เป็นไร เริ่มใหม่"), () => { box.remove(); document.querySelector(".step h1")?.focus?.(); }, "plain");
  no.classList.remove("small");
  box.append(
    el("h2", { id: "pd-offer-h", textContent: T(`We found a backup from ${date(f.at)}. Restore it?`, `找到一份 ${date(f.at)} 的備份，要還原嗎？`, `เจอไฟล์สำรองจากวันที่ ${date(f.at)} จะกู้คืนไหม?`) }),
    el("p", { className: "muted", textContent: `${f.name} · ${f.where} · ${mbOne(f.size)}` }),
    el("p", { textContent: T("Your work log, settings, pins and own photos all come back, and you can skip the rest of this welcome.", "工作紀錄、設定、徽章和自己的照片都會回來，後面的歡迎步驟也可以直接跳過。", "บันทึกการทำงาน การตั้งค่า เข็มกลัด และรูปของคุณจะกลับมาครบ แล้วข้ามขั้นตอนต้อนรับที่เหลือได้เลย") }),
    el("div", { className: "row" }, restoreIt, toggle, no),
    what);
  return box;
}
