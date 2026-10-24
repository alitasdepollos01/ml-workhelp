// The focus screen clock's look: colours (the middle and the ring), the middle plain or filled, where
// it sits (9 places), its size and opacity, and what's behind it (dark or soft cream). For the Pomodoro's ring and
// the work clock alike. The choices are built here once, for the focus screen's gear button and for
// Settings › Keeping time › Focus screen.

import { L, el, host } from "./app-common.js";

// [id, name, { ring, track, inner (the middle's dark), digits (the middle's colour), ink (numbers on a filled middle) }]
const THEME_PAIRS = { matcha: ["#86c79b", "#f3aac0"], mint: ["#6ed6aa", "#ffa6c4"], rose: ["#f0a9bf", "#93cfa9"], lavender: ["#b6a5e6", "#ffc3a3"], sky: ["#8fbfee", "#ffe083"], classic: ["#9aa3e6", "#e8508a"] };
export const LOOKS = () => [
  ["mintpink", L("Mint & pink", "薄荷與粉紅"), { ring: "#f7b8cf", track: "#3a3236", inner: "#101614", digits: "#b5ead7", ink: "#1c3a2c" }],
  ["tomato", L("Tomato", "番茄"), { ring: "#e0675a", track: "#2b302d", inner: "#0e1311", digits: "#e8ece9", ink: "#1a1f1c" }],
  ["lavpeach", L("Lavender & peach", "薰衣草與蜜桃"), { ring: "#ffc8a8", track: "#3a3434", inner: "#13121a", digits: "#cbbcf2", ink: "#2b2147" }],
  ["skylemon", L("Sky & lemon", "天空與檸檬"), { ring: "#fde58a", track: "#36362c", inner: "#0f1418", digits: "#a9d3f5", ink: "#17324a" }],
  ["sakura", L("Sakura & mint", "櫻花與薄荷"), { ring: "#b5ead7", track: "#2f3a35", inner: "#171214", digits: "#f7b8cf", ink: "#4a1f31" }],
  ["theme", L("Like my theme", "跟我的主題"), null],
];
export const PLACES = () => [L("Top left", "左上"), L("Top centre", "上方中間"), L("Top right", "右上"), L("Centre left", "左邊中間"), L("Centre", "正中間"),
  L("Centre right", "右邊中間"), L("Bottom left", "左下"), L("Bottom centre", "下方中間"), L("Bottom right", "右下")];
export const LOOK_DEFAULTS = { look: "mintpink", middle: "digits", place: 4, size: 100, opacity: 100, backdrop: "dark" };

/** The colours of a look ("theme": the app's colour theme's two colours). */
export function lookColours(id) {
  const found = LOOKS().find((x) => x[0] === id);
  if (found?.[2]) return found[2];
  if (id === "theme") {
    const th = host?.themes?.(), [a, b] = THEME_PAIRS[th?.theme] || THEME_PAIRS.matcha;
    return { ring: b, track: "#33302f", inner: "#101413", digits: a, ink: "#1b2420" };
  }
  return LOOKS()[0][2];
}

/** Put a look on the focus screen (its CSS reads these). */
export function applyLook(box, o) {
  const c = lookColours(o.look), soft = o.backdrop === "soft", filled = o.middle === "filled";
  const set = (k, v) => box.style.setProperty(k, v);
  set("--fs-ring", c.ring); set("--fs-ring-brk", c.digits);
  set("--fs-track", soft ? "rgba(60, 40, 30, .12)" : c.track);
  set("--fs-inner", filled ? c.digits : soft ? "#fffaf6" : c.inner);
  set("--fs-digits", filled || soft ? c.ink : c.digits);
  set("--fs-size", String(Math.max(50, Math.min(160, Number(o.size) || 100)) / 100));
  set("--fs-clock-op", String(Math.max(30, Math.min(100, Number(o.opacity) || 100)) / 100));
  const p = Math.max(0, Math.min(8, Number(o.place ?? 4))), al = ["flex-start", "center", "flex-end"];
  set("--fs-h", al[p % 3]); set("--fs-v", al[Math.floor(p / 3)]); set("--fs-align", ["left", "center", "right"][p % 3]);
  box.classList.toggle("soft", soft); box.classList.toggle("filled", filled);
}

/**
 * The controls: colours, the middle, where, size, behind it. `o` the options now, `save(patch)` keeps a
 * change, `live(patch)` shows one while dragging (the size). `cls`: "dark" in the focus screen.
 */
export function lookControls(o, save, live = save) {
  const seg = (key, items) => el("div", { className: "cl-seg" }, items.map(([v, t]) => {
    const b = el("button", { type: "button", className: o[key] === v ? "on" : "", textContent: t, "aria-pressed": String(o[key] === v) });
    b.addEventListener("click", (e) => { e.stopPropagation(); save({ [key]: v }); });
    return b;
  }));
  const sw = el("div", { className: "cl-swatches" }, LOOKS().map(([id, name]) => {
    const c = lookColours(id), b = el("button", { type: "button", className: "cl-sw" + (o.look === id ? " on" : ""), title: name, "aria-pressed": String(o.look === id) },
      el("span", { className: "ball", "aria-hidden": "true" }), el("span", { className: "nm", textContent: name }));
    b.firstChild.style.setProperty("--r", c.ring); b.firstChild.style.setProperty("--d", c.digits);
    b.addEventListener("click", (e) => { e.stopPropagation(); save({ look: id }); });
    return b;
  }));
  const places = PLACES();
  const pos = el("div", { className: "cl-pos", role: "radiogroup", "aria-label": L("Where the clock sits", "時鐘的位置") }, places.map((name, i) => {
    const b = el("button", { type: "button", className: Number(o.place ?? 4) === i ? "on" : "", title: name, "aria-label": name, role: "radio", "aria-checked": String(Number(o.place ?? 4) === i) });
    b.addEventListener("click", (e) => { e.stopPropagation(); save({ place: i }); });
    return b;
  }));
  const size = el("input", { type: "range", min: "50", max: "160", step: "10", value: String(o.size || 100), "aria-label": L("Clock size", "時鐘大小") });
  const sv = el("span", { className: "cl-v", textContent: `${o.size || 100}%` });
  size.addEventListener("input", () => { sv.textContent = size.value + "%"; live({ size: Number(size.value) }); });
  size.addEventListener("change", () => save({ size: Number(size.value) }));
  const op = el("input", { type: "range", min: "30", max: "100", step: "5", value: String(o.opacity || 100), "aria-label": L("Clock opacity", "時鐘不透明度") });
  const ov = el("span", { className: "cl-v", textContent: `${o.opacity || 100}%` });
  op.addEventListener("input", () => { ov.textContent = op.value + "%"; live({ opacity: Number(op.value) }); });
  op.addEventListener("change", () => save({ opacity: Number(op.value) }));
  const row = (label, ...c) => el("div", { className: "cl-row" }, el("span", { className: "lbl", textContent: label }), ...c);
  return el("div", { className: "cl-look" },
    row(L("Colours", "顏色"), sw),
    row(L("The middle", "中間"), seg("middle", [["digits", L("Coloured numbers", "彩色數字")], ["filled", L("Filled circle", "填滿的圓")]])),
    row(L("Where", "位置"), el("div", { className: "cl-where" }, pos, el("span", { className: "cl-v", textContent: places[Number(o.place ?? 4)] }))),
    row(L("Size", "大小"), el("div", { className: "cl-size" }, size, sv)),
    row(L("Opacity: lower to see more of what's behind", "不透明度：調低可以看到更多後面的畫面"), el("div", { className: "cl-size" }, op, ov)),
    row(L("Background", "背景"), seg("backdrop", [["dark", L("Dark", "深色")], ["soft", L("Soft cream", "柔和米色")]])));
}
