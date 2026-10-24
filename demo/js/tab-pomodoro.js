// The Pomodoro's parts for Today (today-now.js): its lengths (classic or your own), what it is,
// and the MilkLove video on a break. The timer itself is app/web/js/alarm.js, run by the desktop app.

import { L, el, host, work, state, deco, toast } from "./app-common.js";

const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

/** The Pomodoro's lengths: classic, or your own (each length right there to change). */
export function lengthsPicker(st, redraw) {
  const kind = st.pomoKind === "custom" ? "custom" : "classic", c = st.pomoCustom || {};
  const sum = (x) => L(`${x.focus} · ${x.rest} · ${x.long} after ${x.every} rounds`, `${x.focus} · ${x.rest} · 每 ${x.every} 輪休息 ${x.long}`);
  const classic = { focus: 25, rest: 5, long: 15, every: 4 };
  const open = lengthsOpen;
  const head = el("button", { type: "button", className: "linkish", "aria-expanded": String(open),
    textContent: (kind === "custom" ? L("My own ", "自訂 ") : L("Classic ", "經典 ")) + sum(kind === "custom" ? c : classic) + " ▾" });
  head.addEventListener("click", () => { lengthsOpen = !lengthsOpen; redraw(); });
  const box = el("div", { className: "lengths" }, head);
  if (!open) return box;
  const mode = (k, title, x) => {
    const b = el("button", { type: "button", className: "mode" + (kind === k ? " on" : ""), "aria-pressed": String(kind === k) }, el("b", { textContent: title }), el("small", { textContent: sum(x) }));
    b.addEventListener("click", () => { host.settingText("pomoKind", k); setTimeout(redraw, 150); });
    return b;
  };
  box.append(el("div", { className: "modes two" }, mode("classic", L("Classic", "經典番茄鐘"), classic), mode("custom", L("My own", "✏️ 自訂"), c)));
  if (kind === "custom") {
    const num = (key, v, lo, hi, label, unit) => {
      const i = el("input", { type: "number", min: lo, max: hi, value: v, "aria-label": label });
      i.addEventListener("change", () => { const n = Math.min(hi, Math.max(lo, Number(i.value) || lo)); i.value = n; work.setting(key, n); toast(L("Saved", "已儲存")); setTimeout(redraw, 150); });
      return el("label", {}, el("span", { className: "muted small", textContent: `${label}（${lo}–${hi}）` }), el("span", { className: "in" }, i, " " + unit));
    };
    box.append(el("div", { className: "custom-lens" },
      num("pomoFocus", c.focus, 5, 120, L("Focus", "專注"), L("min", "分鐘")),
      num("pomoRest", c.rest, 1, 60, L("Short break", "短休息"), L("min", "分鐘")),
      num("pomoLong", c.long, 1, 90, L("Long break", "長休息"), L("min", "分鐘")),
      num("pomoEvery", c.every, 2, 10, L("Long break every", "每幾輪長休息"), L("rounds", "輪"))));
  }
  return box;
}
let lengthsOpen = false;

/** "What's this?": the Pomodoro in a few words, opened when asked. */
export function pomoInfo() {
  const d = el("details", { className: "pomo-info" }, el("summary", { textContent: L("ⓘ What's a Pomodoro?", "ⓘ 番茄鐘是什麼？") }),
    el("p", { className: "muted small", textContent: L("The Pomodoro Technique: work in short, focused rounds with breaks in between. Classic: 25 minutes of focus, a 5-minute break, and a longer 15-minute break after every 4 rounds. Breaks are for standing up, the toilet, water and resting your eyes, so you can keep going all day.",
      "番茄工作法：把時間切成一段段專注，中間穿插休息。經典的做法是專注 25 分鐘、休息 5 分鐘，每 4 輪休息久一點（15 分鐘）。休息時站起來、上個廁所、喝點水、讓眼睛休息一下，一整天才有精神。") }));
  return d;
}

// ---- on a break: a GMMTV video with Milk and Love (break-videos.js in the desktop app) ------
// The same one stays up through the tab's redraws, until "another one" or the next break.

let video = null, videoFor = "", liveCard = null; // (liveCard: the one on screen, as the tab redraws now and then)
const breakKey = (st) => (st.onBreak ? `b${st.onBreak.since}` : st.pomoNow && st.pomoNow.phase !== "focus" ? `p${st.pomoNow.id}:${st.pomoNow.round}:${st.pomoNow.phase}` : "");
export function breakCard(st) {
  const key = breakKey(st);
  if (!key || !host?.breakVideo || st.breakVideos === false) return null;
  const card = el("section", { className: "card break-video", "aria-label": L("A video for your break", "休息時的影片") });
  liveCard = card;
  const btn = (label, fn, cls = "btn small") => { const b = el("button", { type: "button", className: cls, textContent: label }); b.addEventListener("click", fn); return b; };
  const show = (v) => {
    const c = card.isConnected || !liveCard?.isConnected ? card : liveCard; // (clicked just as the tab redrew: the new card)
    if (!v) { c.remove(); return; }
    video = v; videoFor = key;
    const open = () => host.breakVideo("open", v.id);
    const another = async () => show(await host.breakVideo("pick", v.id));
    const thumb = el("button", { type: "button", className: "thumb", "aria-label": L(`Watch “${v.title}” on YouTube`, `在 YouTube 看「${v.title}」`) },
      el("img", { src: `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`, alt: "" }), v.s ? el("span", { className: "len", textContent: mmss(v.s * 1000) }) : null, el("span", { className: "play", "aria-hidden": "true" }, el("span", { textContent: "▶" })));
    thumb.addEventListener("click", open);
    c.replaceChildren(el("div", { className: "bv-main" }, thumb,
      el("div", { className: "vt", textContent: v.title }),
      el("span", { className: "muted small", textContent: "GMMTV OFFICIAL" + (v.date ? " · " + v.date : "") }),
      el("div", { className: "row-flex" }, btn(L("Watch", "看影片"), open, "btn primary small"), btn(L("Another one", "換一個"), another),
        btn(L("Not this one", "不要這支"), async () => { show(await host.breakVideo("hide", v.id)); toast(L("It won't come up again", "這支不會再出現了")); }, "linkish")),
      el("span", { className: "muted small", textContent: L("Some videos may not be available in every country or region; if one won't play, try another.", "有些影片在部分國家或地區可能看不了；如果播不了，就按「換一個」。") })),
    el("div", { className: "bv-side" }, el("div", { className: "say", textContent: L("Take a break: MilkLove videos", "休息一下，看支 MilkLove 的影片吧") }), deco("app-pomo-break", "")));
  };
  if (video && videoFor === key) show(video);
  else host.breakVideo("pick").then(show).catch(() => card.remove());
  return card;
}
