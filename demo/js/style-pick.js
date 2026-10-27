// The Style picker (Settings › Look): ten little cards, each a tiny drawing of that style (skins.css, and
// skins-new.css for the two new ones); picking one changes every window at once (host.setStyle).
// The two new styles' display names (Myra, 27 Oct): "Y2K emo" (id i) and "Whimsical" (id m) in English and 中文,
// "Y2K" and "Whimsical" in ไทย (Latin letters, never translated). Ids and folders (sk8er/) stay as they are.

const L = (en, zh, th) => (document.documentElement.lang === "zh-Hant" || window.MLHost?.lang === "zh" ? zh : window.MLHost?.lang === "th" ? (th || en) : en);
const NAMES = {
  a: ["Sticker Book", "貼紙手帳", "สมุดสติกเกอร์"], b: ["Milk Tea Clay", "奶茶黏土", "ดินปั้นชานม"], c: ["Clean Pastel", "清爽粉彩", "พาสเทลสะอาดตา"],
  d: ["Fan Zine Pop", "應援小誌", "แฟนซีนป๊อป"], e: ["Concert Night", "演唱會之夜", "คืนคอนเสิร์ต"], f: ["Purikura", "拍貼機", "ตู้สติกเกอร์"],
  g: ["Retro Desktop", "復古桌面", "เดสก์ท็อปย้อนยุค"], h: ["Fan Magazine", "粉絲雜誌", "นิตยสารแฟนคลับ"],
  i: ["Y2K emo", "Y2K emo", "Y2K"], m: ["Whimsical", "Whimsical", "Whimsical"],
};
/** A style's display name in the page's language (the 10 ids above). */
export const styleName = (id) => (NAMES[id] ? L(...NAMES[id]) : id);

/** The cards; onPick(id) after the host has been told (to redraw a page, say). */
export function stylePicker(onPick) {
  const host = window.MLHost;
  const now = host?.styles?.().style || "f";
  const box = document.createElement("div");
  box.className = "stylecards";
  box.setAttribute("role", "radiogroup");
  box.setAttribute("aria-label", L("Style", "風格", "สไตล์"));
  for (const id of Object.keys(NAMES)) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "stylecard";
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", String(id === now));
    const mini = document.createElement("span"); mini.className = "mini"; mini.dataset.mini = id;
    const name = document.createElement("b"); name.textContent = L(...NAMES[id]);
    b.append(mini, name);
    if (id === "f") { const d = document.createElement("small"); d.textContent = L("default", "預設", "ค่าเริ่มต้น"); b.append(d); }
    b.addEventListener("click", () => {
      host?.setStyle?.(id);
      document.documentElement.dataset.style = id;
      box.querySelectorAll(".stylecard").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
      onPick?.(id);
    });
    box.append(b);
  }
  return box;
}
