// The two lines under the desktop buddy, shared by the buddy (desk-buddy.js) and the
// preview in Settings → Desktop buddy (tab-settings.js).

import { L } from "./i18n.js";

const clockTime = (ms) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
function duration(ms) {
  const m = Math.floor(ms / 60e3);
  return m < 60 ? L(`${m} min`, `${m} 分鐘`) : L(`${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`, `${Math.floor(m / 60)} 小時 ${m % 60} 分`);
}

/**
 * The two lines under the desktop buddy (Settings → Desktop buddy: label1, label2), each one of
 * auto, task, today, pomo, rounds, next, focus, clock, word, none. "auto" shows what matters
 * now: first the Pomodoro countdown, a break, "not started yet", or the task and today; then
 * the next reminder or event in the coming two hours, else today's total (or rounds).
 */
export function labelLines(w, status = "", word = () => "") {
  const t = Date.now(), keep = w.keep || "work";
  const goal = w.goal ? ` / ${w.goal}h` : "";
  const name = w.name ? (w.name.length > 22 ? w.name.slice(0, 21) + "…" : w.name) : L("Worked", "已工作");
  const p = w.pomoNow;
  const left = p ? Math.max(0, p.pausedLeft ?? p.endsAt - t) : 0;
  const mmss = (ms) => { const sec = Math.ceil(ms / 1000); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`; };
  const pomo = !p ? "" : (p.pausedLeft != null ? "⏸ " : "") + (p.phase === "focus"
    // (which round of the set before the long break: round 7 with every 4 is 3 of 4)
    ? L(`🍅 Focus ${mmss(left)} · round ${((p.round - 1) % (p.every || 4)) + 1} of ${p.every || 4}`, `🍅 專注 ${mmss(left)} · 第 ${((p.round - 1) % (p.every || 4)) + 1}/${p.every || 4} 輪`)
    : L(`☕ Break ${mmss(left)} · then round ${p.round + 1}`, `☕ 休息 ${mmss(left)} · 接著第 ${p.round + 1} 輪`));
  const rounds = L(`🍅 ${w.rounds || 0} round${w.rounds === 1 ? "" : "s"} today`, `🍅 今天 ${w.rounds || 0} 輪`);
  const waiting = keep !== "pomo" && w.dayStart === "ask" && !w.started;
  const notYet = w.offToday ? L("Not counting today", "今天不計時") : L("Not started yet", "還沒開始");
  let brk = "";
  if (w.onBreak) {
    const kind = (w.breakTypes || []).find((b) => b.id === w.onBreak.kind);
    const what = kind && kind.id !== "other" ? `${kind.emoji} ${L(kind.label, kind.zh).replace(/ ?[(（].*[)）]$/, "")}` : L("☕ On a break", "☕ 休息中");
    brk = `${what} ${duration(t - w.onBreak.since)}` + (w.onBreak.until ? (w.onBreak.over ? L(" · over", " · 時間到") : L(` · until ${clockTime(w.onBreak.until)}`, ` · 到 ${clockTime(w.onBreak.until)}`)) : "");
  }
  const task = waiting ? notYet : `${name} ${duration(w.stretch)}`;
  const today = waiting ? notYet : L(`Today ${duration(w.today)}${goal}`, `今天 ${duration(w.today)}${goal}`);
  const nx = (w.reminders || []).find((r) => !r.fired && r.at - t < 2 * 3600e3);
  const next = nx ? `${nx.kind === "event" ? "📅" : "⏰"} ${clockTime(nx.start || nx.at)} ${nx.text}` : "";
  const items = { task, today, pomo: pomo || rounds, rounds, next, focus: w.focus ? `🌟 ${w.focus}` : "", clock: clockTime(t), word: word(), none: "" };
  // (an alarm that isn't the Pomodoro: its countdown goes on the second line)
  const other = status && !p ? status : "";
  const auto1 = () => {
    if (brk) return brk;
    if (pomo) return pomo;
    if (keep === "pomo") return rounds;
    if (waiting) return notYet;
    return `${name} ${duration(w.stretch)}` + (w.today > w.stretch + 60e3 || goal ? L(` · today ${duration(w.today)}${goal}`, ` · 今天 ${duration(w.today)}${goal}`) : "");
  };
  const auto2 = () => {
    if (other) return other;
    if (pomo && keep === "both" && p.phase === "focus") return `${name} · ` + L(`today ${duration(w.today)}`, `今天 ${duration(w.today)}`);
    if (next) return next;
    if (keep === "pomo") return pomo ? rounds : "";
    return brk || pomo ? today : "";
  };
  const line = (k, n) => (k === "auto" || !k ? (n === 1 ? auto1() : auto2()) : items[k] ?? "");
  const a = line(w.label1, 1), b = line(w.label2, 2);
  return [a, b === a ? "" : b];
}


/** What the lines under the desktop buddy can show, for this way of keeping time (main.js LABEL_ITEMS). */
export function labelItems(keep, thai = true) {
  const all = [["auto", L("Automatic (what matters right now)", "自動（顯示現在最重要的）")], ["task", L("What I'm working on, and for how long", "正在做的事，和做了多久")], ["today", L("Today's work total (and goal)", "今天總工作時間（和目標）")],
    ["pomo", L("The Pomodoro countdown", "番茄鐘倒數")], ["rounds", L("Pomodoro rounds done today", "今天完成幾輪番茄鐘")], ["next", L("The next reminder or event", "下一個提醒或活動")],
    ["focus", L("Today's focus", "本日主題")], ["clock", L("The time", "現在時間")], ["word", L("A Thai word", "一個泰文單字")], ["none", L("Nothing", "不顯示")]];
  const work = ["task", "today"], pomo = ["pomo", "rounds"];
  return all.filter(([v]) => !(keep === "pomo" && work.includes(v)) && !(keep === "work" && pomo.includes(v)) && (thai || v !== "word"));
}
