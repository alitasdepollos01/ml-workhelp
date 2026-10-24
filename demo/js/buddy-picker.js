// Which stickers the buddies use: every sticker by set, click to leave one out or put it back
// (Settings › Desktop buddy, and the top of the Stickers tab).

import { L, el, host, modal, toast } from "./app-common.js";

/** Which stickers the buddies use: a count, and a picker (every sticker, by set; click to leave one out or put it back). */
function buddyStickers(row) {
  const count = el("span", { className: "muted", textContent: "…" });
  const open = el("button", { type: "button", className: "btn small", textContent: L("Choose…", "選擇⋯") });
  let lib = null;
  const keyOf = (set, s) => `${set}/${decodeURIComponent(s.url.split("/").pop())}`;
  const SETS = [["milk", "Milk"], ["love", "Love"], ["together", L("Together", "同框")], ["others", L("Others", "其他")]];
  const showCount = () => {
    const off = new Set(lib.buddyOff || []), all = SETS.flatMap(([k]) => (lib.stickers?.[k] || []).map((s) => keyOf(k, s)));
    const on = all.filter((k) => !off.has(k)).length;
    count.textContent = L(`${on} of ${all.length} in use`, `用了 ${on} / ${all.length} 張`);
  };
  host.library().then((l) => { lib = l; showCount(); }).catch(() => { count.textContent = ""; });
  open.addEventListener("click", () => {
    if (!lib) return;
    const off = new Set(lib.buddyOff || []);
    let set = "milk";
    const { box, close } = modal(L("Stickers the buddies use", "夥伴用的貼圖"));
    box.classList.add("buddy-picker");
    const tabs = el("div", { className: "days-pick" }), grid = el("div", { className: "bp-grid" }), note = el("span", { className: "muted" });
    const tabsOnly = () => tabs.replaceChildren(...SETS.map(([k, t]) => {
      const n = (lib.stickers?.[k] || []).length, nOn = (lib.stickers?.[k] || []).filter((s) => !off.has(keyOf(k, s))).length;
      const b = el("button", { type: "button", className: set === k ? "on" : "", textContent: `${t} ${nOn}/${n}` });
      b.addEventListener("click", () => { set = k; draw(); grid.scrollTop = 0; });
      return b;
    }));
    const draw = () => {
      const list = lib.stickers?.[set] || [];
      tabsOnly();
      grid.replaceChildren(...list.map((s) => {
        const k = keyOf(set, s);
        const b = el("button", { type: "button", className: "bp-st" + (off.has(k) ? " off" : ""), "aria-pressed": String(!off.has(k)), title: off.has(k) ? L("Left out: click to use it", "沒在用：點一下就會用") : L("In use: click to leave it out", "使用中：點一下就不用") },
          el("img", { src: s.url, alt: "", loading: "lazy" }), el("i", { textContent: off.has(k) ? "" : "✓" }));
        b.addEventListener("click", () => { if (off.has(k)) off.delete(k); else off.add(k); b.classList.toggle("off", off.has(k)); b.setAttribute("aria-pressed", String(!off.has(k))); b.querySelector("i").textContent = off.has(k) ? "" : "✓"; tabsOnly(); });
        return b;
      }));
      note.textContent = (lib.stickers?.[set] || []).every((s) => off.has(keyOf(set, s))) ? L("All left out: the buddy uses them all after all.", "全部都不選的話，夥伴還是會全部都用。") : "";
    };
    const all = el("button", { type: "button", className: "btn small", textContent: L("Use them all", "全選") });
    all.addEventListener("click", () => { for (const s of lib.stickers?.[set] || []) off.delete(keyOf(set, s)); draw(); });
    const none = el("button", { type: "button", className: "btn small", textContent: L("Leave them all out", "全不選") });
    none.addEventListener("click", () => { for (const s of lib.stickers?.[set] || []) off.add(keyOf(set, s)); draw(); });
    const save = el("button", { type: "button", className: "btn primary", textContent: L("Save", "儲存") });
    save.addEventListener("click", () => { lib.buddyOff = [...off]; host.setBuddyOff(lib.buddyOff); showCount(); toast(L("Saved: the buddies start again with these", "已儲存：夥伴會改用這些貼圖")); close(); });
    box.append(el("p", { className: "muted", textContent: L("Click a sticker to leave it out of the buddies, or to put it back. They still show in Stickers and Photo credits.", "點一張貼圖，夥伴就不會用它（再點一次就恢復）。在「貼圖」和「照片來源」裡還是看得到。") }),
      el("div", { className: "spread" }, tabs, el("div", { className: "row-flex" }, all, none)), grid,
      el("div", { className: "spread" }, note, save));
    draw();
  });
  return row(count, open);
}

/** Settings › Desktop buddy: a line. */
export const buddyStickersField = () => buddyStickers((count, open) => el("div", { className: "field" }, el("span", { textContent: L("Stickers the buddies use", "夥伴用的貼圖") }), el("div", { className: "row-flex" }, count, open)));

/** Stickers tab: a card at the top. */
export const buddyStickersCard = () => buddyStickers((count, open) => {
  const thumbs = el("span", { className: "bp-thumbs", "aria-hidden": "true" });
  host.library().then((l) => thumbs.replaceChildren(...["milk", "love", "together"].map((k) => (l.stickers?.[k] || [])[Math.floor(Math.random() * (l.stickers?.[k] || []).length)])
    .filter(Boolean).map((x) => el("img", { src: x.url, alt: "" })))).catch(() => {});
  return el("div", { className: "buddy-pick-card" }, thumbs,
    el("div", { className: "bp-t" }, el("b", { textContent: L("Stickers your desktop buddies use", "桌面夥伴用的貼圖") }), count), open);
});


