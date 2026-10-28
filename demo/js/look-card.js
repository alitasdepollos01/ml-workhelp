// Settings › Look › "Doodles" (the before/after page's Settings mock, Myra's OK on 27 Oct): the doodle layout,
// the doodle style, the wallpaper's strength (light and dark, for the style in use) and under the page top. (Y2K emo's
// badges were removed on 28 Oct.) Every change goes straight onto the page (look.js) and into the setting (settings.look).
// tab-settings.js shows it with lookCard() under the Style card.
import { lang } from "./i18n.js";
import { el, toast } from "./app-common.js";
import { currentLook, saveLook } from "./look.js";
import { styleName } from "./style-pick.js";

const RULES = window.MLWH_LOOK_RULES;
const T = (en, zh, th) => (lang === "zh" ? zh : lang === "th" ? th : en);
// the nine doodle styles' names (as in the placement tool)
const DS_NAME = {
  kawaii: ["Kawaii flat", "可愛扁平", "คาวาอิแบน"], "kawaii-soft": ["Kawaii soft", "柔和可愛", "คาวาอิละมุน"], "kawaii-pop": ["Kawaii pop", "普普可愛", "คาวาอิป๊อป"],
  sticker: ["Die-cut sticker", "割線貼紙", "สติกเกอร์ไดคัท"], plush: ["Chibi plush", "Q 版絨毛", "ตุ๊กตาจิบิ"], neon: ["Neon", "霓虹", "นีออน"],
  pixel: ["Pixel", "像素", "พิกเซล"], riso: ["Riso print", "孔版印刷", "ริโซพริ้นท์"], marker: ["Marker & crayon", "麥克筆蠟筆", "ปากกาเมจิกและสีเทียน"],
};
const dsName = (id) => T(...(DS_NAME[id] || [id, id, id]));
const dark = () => matchMedia("(prefers-color-scheme: dark)").matches;
const pct = (v) => (Math.round(v * 1000) / 10).toFixed(1);

/** A row of choices, each with an optional line under it. */
function choices(options, value, onPick, label) {
  const g = el("div", { className: "days-pick dd-seg", role: "radiogroup", "aria-label": label });
  for (const [v, t, sub] of options) {
    const b = el("button", { type: "button", className: v === value ? "on" : "", role: "radio", "aria-checked": String(v === value) }, el("span", { textContent: t }), sub ? el("small", { textContent: sub }) : null);
    b.addEventListener("click", () => { for (const x of g.children) { x.classList.toggle("on", x === b); x.setAttribute("aria-checked", String(x === b)); } onPick(v); });
    g.append(b);
  }
  return g;
}
const field = (label, hint, ...kids) => el("div", { className: "field dd-field" }, el("span", {}, el("span", { textContent: label }), hint ? el("small", { className: "muted", textContent: hint }) : null), ...kids);

/** The card. */
export function doodlesCard() {
  const sec = el("section", { className: "card doodles-card" });
  const draw = () => {
    const look = currentLook(), style = document.documentElement.dataset.style || "f", own = RULES.OWN_DOODLES[style] || "kawaii-soft";
    const save = (patch, quiet) => { saveLook(patch); if (!quiet) toast(T("Saved", "已儲存", "บันทึกแล้ว")); draw(); };
    const off = look.doodles === "off";
    // the doodle style: a whale in each style
    const whale = (st) => { const folder = (st === "marker" || st === "riso") && dark() ? st + "-dark" : st; const i = el("img", { src: `doodles/${folder}/whale.svg`, alt: "", className: "dd-whale" + (st === "pixel" ? " px" : "") }); i.draggable = false; return i; };
    const opts = el("div", { className: "dd-opts", role: "radiogroup", "aria-label": T("Doodle style", "塗鴉畫風", "สไตล์ดูเดิล") });
    for (const v of ["auto", ...RULES.DOODLE_STYLES]) {
      const b = el("button", { type: "button", role: "radio", "aria-checked": String(look.doodleStyle === v), className: look.doodleStyle === v ? "on" : "" },
        whale(v === "auto" ? own : v), el("span", {}, el("span", { textContent: v === "auto" ? T("Match the style", "跟著風格", "ตามสไตล์") : dsName(v) }),
          v === "auto" ? el("small", { textContent: dsName(own) }) : null));
      b.addEventListener("click", () => save({ doodleStyle: v }));
      opts.append(b);
    }
    // the wallpaper's strength, for this style, light and dark apart
    const bal = (mode) => RULES.balanced(style, mode), cur = (mode) => RULES.strength(look, style, mode);
    const sliders = el("div", { className: "dd-wstr" });
    let saveT = 0;
    for (const [mode, label] of [["light", T("Light", "淺色", "สว่าง")], ["dark", T("Dark", "深色", "มืด")]]) {
      const isBal = Math.abs(cur(mode) - bal(mode)) < 0.0005;
      const out = el("output", { textContent: pct(cur(mode)) + "%" });
      const r = el("input", { type: "range", min: "0", max: "30", step: "0.1", value: pct(cur(mode)), "aria-label": `${T("Wallpaper strength", "壁紙濃淡", "ความเข้มของวอลเปเปอร์")}, ${label}` });
      r.addEventListener("input", () => {
        out.textContent = (+r.value).toFixed(1) + "%";
        clearTimeout(saveT); saveT = setTimeout(() => { saveLook({ wallStrength: { [style]: { [mode]: +r.value / 100 } } }); }, 120);
      });
      r.addEventListener("change", () => { clearTimeout(saveT); save({ wallStrength: { [style]: { [mode]: +r.value / 100 } } }); });
      sliders.append(el("label", { className: "dd-sl" }, el("span", { textContent: label }), r, out, isBal ? el("small", { className: "muted dd-bal", textContent: T("balanced", "平衡值", "ค่าสมดุล") }) : null));
    }
    const reset = el("button", { type: "button", className: "btn small ghost", textContent: T("Reset to balanced", "回到平衡值", "กลับเป็นค่าสมดุล") });
    reset.disabled = !look.wallStrength[style];
    reset.addEventListener("click", () => save({ wallStrength: { [style]: null } }));
    sliders.append(reset);
    const sn = styleName(style);
    sec.replaceChildren(
      el("h3", { textContent: T("Doodles", "塗鴉", "ดูเดิล") }),
      field(T("Doodles", "塗鴉", "ดูเดิล"), "", choices([
        ["wall", T("Quiet wallpaper", "安靜的壁紙", "วอลเปเปอร์เบา ๆ"), T("A faint wallpaper with little easter eggs from the shows, and a doodle by each title; pick Off for a clean background", "淡淡的壁紙裡藏著小彩蛋，標題旁一個小塗鴉；想要乾淨的背景就選「關」", "วอลเปเปอร์จาง ๆ ที่ซ่อนของเซอร์ไพรส์เล็ก ๆ จากซีรีส์ กับดูเดิลข้างหัวข้อ ถ้าอยากได้พื้นหลังสะอาด ๆ ให้เลือกปิด")],
        ["corners", T("Corner stickers", "角落貼紙", "สติกเกอร์ตามมุม"), T("On the cards' corners and in the menu", "貼在卡片角落和選單上", "ติดตามมุมการ์ดและในเมนู")],
        ["off", T("Off", "關", "ปิด"), T("No doodles", "不要塗鴉", "ไม่มีดูเดิล")]], look.doodles, (v) => save({ doodles: v }), T("Doodles", "塗鴉", "ดูเดิล"))),
      el("div", { className: "dd-dim" + (off ? " off" : "") },
        field(T("Doodle style", "塗鴉畫風", "สไตล์ดูเดิล"), T("The wallpaper follows it too.", "壁紙也會跟著換。", "วอลเปเปอร์จะเปลี่ยนตามด้วย"), opts),
        el("div", { className: "dd-dim" + (look.doodles === "wall" ? "" : " off") },
          field(T("Wallpaper strength", "壁紙濃淡", "ความเข้มของวอลเปเปอร์"), T(`Changes ${sn} only: each style keeps its own strength, set apart for light and dark. Balanced: ${pct(bal("light"))}% / ${pct(bal("dark"))}%.`, `只改「${sn}」：每個風格各有自己的濃淡，淺色和深色也分開調。平衡值：${pct(bal("light"))}% / ${pct(bal("dark"))}%。`, `ปรับเฉพาะสไตล์ ${sn} แต่ละสไตล์มีค่าของตัวเอง และตั้งโหมดสว่างกับโหมดมืดแยกกัน ค่าสมดุล ${pct(bal("light"))}% / ${pct(bal("dark"))}%`), sliders),
          field(T("Wallpaper under the page top", "頁首下的壁紙", "วอลเปเปอร์ใต้ส่วนหัว"), "", choices([
            ["fade", T("Fade", "淡出", "จางลง"), T("Fades out behind the page top", "在頁首後面慢慢淡掉", "ค่อย ๆ จางหายใต้ส่วนหัว")],
            ["full", T("Full", "完整", "เต็ม"), T("Runs under the page top too", "頁首下面也有", "ต่อเนื่องใต้ส่วนหัวด้วย")]], look.wallHead, (v) => save({ wallHead: v }), T("Wallpaper under the page top", "頁首下的壁紙", "วอลเปเปอร์ใต้ส่วนหัว"))))));
  };
  draw();
  return sec;
}
