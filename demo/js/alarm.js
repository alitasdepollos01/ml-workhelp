// One alarm at a time: a countdown ("remind me in 25 min"), a clock time
// ("at 14:30"), or a repeating focus timer (25 min focus, 5 min break, and a
// longer break every 4th round). Countdowns and focus timers can be paused
// (state.pausedLeft holds what was left), and a focus timer can skip ahead.
// When a focus timer's break runs out, the next round waits (state.waiting)
// until you say "Back to work" (skip) or take 5 more minutes (moreRest);
// state.autoNext (Settings: "Start the next round by itself") goes straight on.
//
// The alarm is saved through the host, so it survives a reload and every open
// view (panel, buddy window, another tab) sees the same one.

import { record } from "./stats.js";
import { L } from "./i18n.js";

const KEY = "alarm";
const SNOOZE_MIN = 5;
const CHIME_FOR_MS = 60e3; // stop chiming after a minute; the banner stays

export function formatLeft(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return (h ? h + ":" : "") + mm + ":" + String(sec).padStart(2, "0");
}

export function formatClock(ms) {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ---- chime (Web Audio, so there's no sound file to ship) -------------------

let audio = null;

/** Browsers only allow sound after a click; call this from one. */
export function unlockSound() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!audio) audio = new Ctx();
    if (audio.state === "suspended") audio.resume();
  } catch {
    audio = null;
  }
}

function bell(at, freq, loud = 1) {
  const osc = audio.createOscillator(), gain = audio.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.001, 0.22 * loud), at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.4);
  osc.connect(gain).connect(audio.destination);
  osc.start(at);
  osc.stop(at + 1.5);
}

function chime(loud = 1) {
  if (!audio) unlockSound();
  if (!audio) return;
  // (still waking up: ring once it's ready, rather than not at all)
  if (audio.state !== "running") { audio.resume().then(() => { if (audio.state === "running") chime(loud); }).catch(() => {}); return; }
  const t = audio.currentTime + 0.05;
  bell(t, 880, loud);
  bell(t + 0.28, 1174.7, loud);
  bell(t + 0.56, 1568, loud);
}

// A reminder's or event's sound (Settings): the chime, Milk and Love calling each other (sounds/), or none.
export const REMINDER_SOUNDS = [
  ["ding", "The chime", "內建的叮"],
  ["pmew-1", "“พี่มิว!”", "「พี่มิว！」"], // ("pmew-2" was dropped: too much crowd and echo to clean; a saved "pmew-2" rings the chime)
  ["nonglove", "“น้องเลิฟ”", "「น้องเลิฟ」"],
  ["marimba", "Marimba", "木琴"],
  ["sparkle", "Sparkle", "亮晶晶"],
  ["pink", "“P'Ink!”", "「P'Ink！」"],
  ["pa", "“Pa!”", "「Pa！」"],
  ["ohooh", "“Ohooh!”", "「Ohooh！」"],
  ["pmilk-rak-love", "“P'Milk rak Love”", "「P'Milk rak Love」"],
  ["yachong", "“Cavity”", "「蛀牙」"], // (id/file stay "yachong": saved settings keep working)
  ["shasha", "“Shasha”", "「Shasha」"],
  ["ongsa", "“Ongsa”", "「Ongsa」"],
  ["sun", "“Sun”", "「Sun」"],
  ["pmilk-1", "“P'Milk 1”", "「P'Milk 1」"],
  ["muv-chant", "“Muv chant”", "「Muv 應援」"],
  ["gengmak", "“Gengmak”", "「Gengmak」"],
  ["off", "No sound", "不出聲"],
];
let playing = null;
/** Play one of REMINDER_SOUNDS at a volume (0–100). */
export function playSound(name, volume = 70) {
  const loud = Math.max(0, Math.min(100, Number(volume) || 0)) / 100;
  if (name === "off" || !loud) return;
  if (name === "ding" || !REMINDER_SOUNDS.some(([k]) => k === name)) { unlockSound(); chime(loud); return; }
  try { playing?.pause(); } catch { /* done already */ }
  playing = new Audio(`sounds/${name}.mp3`);
  playing.volume = loud;
  playing.play().catch(() => { unlockSound(); chime(loud); }); // (can't play it: the chime instead)
}

// ---- the alarm ---------------------------------------------------------------

export class Alarm {
  /**
   * @param host     the host adapter (storage + notifications)
   * @param onChange called with the current state (or null) whenever it changes
   */
  constructor(host, onChange) {
    this.host = host;
    this.onChange = onChange;
    this.state = host.load(KEY, null);
    this.chimeTimer = 0;
    setInterval(() => this.tick(), 1000);
    document.addEventListener("visibilitychange", () => this.tick());
    // Another tab or window changed the alarm.
    addEventListener("storage", (e) => {
      if (e.key && e.key.endsWith(":" + KEY)) {
        this.state = this.host.load(KEY, null);
        if (!this.state?.ringing) this.quiet();
        this.onChange(this.state);
      }
    });
    queueMicrotask(() => { this.onChange(this.state); this.tick(); });
  }

  save(state) {
    this.state = state;
    this.host.save(KEY, state);
    this.onChange(state);
  }

  /** The alarm changed somewhere else (VS Code and the desktop app share one). */
  adopt(state) {
    if (JSON.stringify(state) === JSON.stringify(this.state)) return;
    if (!state?.ringing) this.quiet();
    this.save(state ?? null);
  }

  start(kind, endsAt, label, extra = {}) {
    unlockSound();
    this.host.askToNotify?.();
    this.quiet();
    this.save({ id: Date.now(), kind, endsAt, label: label || "", ringing: false, ...extra });
  }

  /** Remind me in `min` minutes. */
  inMinutes(min, label) {
    this.start("timer", Date.now() + min * 60e3, label);
  }

  /** Remind me at "HH:MM" (today, or tomorrow if that's already passed). */
  atTime(hhmm, label) {
    const [h, m] = hhmm.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
    this.start("at", d.getTime(), label);
  }

  /**
   * Focus for `focus` minutes, break for `rest`, and repeat; every `every`th break lasts `longRest` (0 = never).
   * autoNext: the next round starts by itself when a break ends (else it waits for you).
   */
  focusTimer(focus, rest, label, longRest = 0, every = 4, autoNext = false) {
    this.start("focus", Date.now() + focus * 60e3, label, { phase: "focus", focus, rest, longRest, every, round: 1, autoNext: !!autoNext });
  }

  /** The setting changed while a timer runs (a round waiting now goes on if it's turned on). */
  setAutoNext(on) {
    const s = this.state;
    if (s?.kind !== "focus" || !!s.autoNext === !!on) return;
    if (on && s.waiting) { this.quiet(); return this.save(this.nextPhase({ ...s, autoNext: true }, false)); }
    this.save({ ...s, autoNext: !!on });
  }

  /** A break that's over and waiting: rest `min` minutes more, then it asks again. */
  moreRest(min = SNOOZE_MIN) {
    const s = this.state;
    if (s?.kind !== "focus" || s.phase === "focus") return;
    this.quiet();
    const { waiting, pausedLeft, ...rest } = s;
    this.save({ ...rest, ringing: false, endsAt: Date.now() + min * 60e3 });
  }

  /** Milliseconds left, paused or not. */
  static left(s) {
    return s.pausedLeft ?? s.endsAt - Date.now();
  }

  /** Countdowns and focus timers only: a clock-time alarm can't be paused. */
  static canPause(s) {
    return !!s && !s.ringing && !s.waiting && s.kind !== "at";
  }

  pause() {
    const s = this.state;
    if (!Alarm.canPause(s) || s.pausedLeft != null) return;
    this.save({ ...s, pausedLeft: Math.max(1000, s.endsAt - Date.now()) });
  }

  resume() {
    const s = this.state;
    if (s?.pausedLeft == null) return;
    const { pausedLeft, ...rest } = s;
    this.save({ ...rest, endsAt: Date.now() + pausedLeft });
  }

  /** Focus timer: end this phase now and start the next one, without ringing. */
  skip() {
    const s = this.state;
    if (s?.kind !== "focus") return;
    this.quiet();
    this.save(this.nextPhase(s, false));
  }

  /** The phase after this one; a finished focus phase goes into today's tally. */
  nextPhase(s, ringing) {
    if (s.phase === "focus") {
      const left = Math.max(0, Alarm.left(s));
      const done = left < 1000;
      record(this.host, {
        rounds: done ? 1 : 0,
        focusMin: Math.max(0, s.focus * 60e3 - left) / 60e3,
        once: `${s.id}:${s.round}`,
      });
    }
    const toBreak = s.phase === "focus";
    const long = toBreak && s.longRest > 0 && s.round % (s.every || 4) === 0;
    const { pausedLeft, waiting, ...rest } = s;
    // Come due on time: count the next phase from when this one ended, so every
    // view (and VS Code and the desktop app) works out the same next phase.
    const from = ringing && Date.now() - s.endsAt < 60e3 ? s.endsAt : Date.now();
    return {
      ...rest,
      phase: toBreak ? (long ? "long" : "break") : "focus",
      round: toBreak ? s.round : s.round + 1,
      endsAt: from + (toBreak ? (long ? s.longRest : s.rest) : s.focus) * 60e3,
      ringing,
    };
  }

  cancel() {
    this.quiet();
    this.save(null);
  }

  /** Stop ringing. A focus timer carries on with its next phase. */
  stop() {
    const s = this.state;
    this.quiet();
    if (s?.kind === "focus") return this.save({ ...s, ringing: false });
    this.save(null);
  }

  snooze() {
    const s = this.state;
    if (!s) return;
    this.quiet();
    this.save({ ...s, ringing: false, endsAt: Date.now() + SNOOZE_MIN * 60e3, snoozed: true });
  }

  tick() {
    const s = this.state;
    if (!s || s.ringing || s.waiting || s.pausedLeft != null || Date.now() < s.endsAt) {
      if (s && !s.ringing) this.onChange(s); // keeps the countdown fresh
      return;
    }
    const due = s.endsAt;
    if (s.kind === "focus" && s.phase !== "focus" && !s.autoNext) {
      // A break ran out: the next round waits for you ("Back to work"), asking until you answer.
      this.save({ ...s, ringing: true, waiting: true });
    } else if (s.kind === "focus") {
      // Switch phase straight away so the timer keeps going, then ring.
      this.save(this.nextPhase(s, true));
    } else {
      this.save({ ...s, ringing: true });
    }
    this.ring(due);
  }

  /** @param due when the alarm was due: the same in every open view */
  ring(due) {
    const s = this.state;
    // Only one open view plays the sound and sends the notification.
    const claim = "mlwh:rang";
    let mine = true;
    try {
      const ringId = s.id + ":" + due;
      mine = localStorage.getItem(claim) !== ringId;
      if (mine) localStorage.setItem(claim, ringId);
    } catch {
      // No storage: every view rings, which is fine.
    }
    if (!mine) return;
    // ...and only one of VS Code and the desktop app.
    Promise.resolve(this.host.claimRing ? this.host.claimRing(s.id + ":" + due) : true)
      .then((ok) => { if (ok && this.state?.ringing) this.announce(s); }, () => this.announce(s));
  }

  announce(s) {
    const { title, body } = message(s);
    this.host.notify?.(title, body, s.kind === "focus" ? (s.waiting ? ["back", "more"] : []) : ["snooze", "stop"]);
    // (a waiting round: the desktop app rings the sound picked in Settings itself)
    if (!(s.waiting && this.host.workClock)) chime();
    const started = Date.now();
    clearInterval(this.chimeTimer);
    // A focus-timer phase change chimes once; a real alarm keeps chiming for a minute.
    if (s.kind !== "focus") {
      this.chimeTimer = setInterval(() => {
        if (!this.state?.ringing || Date.now() - started > CHIME_FOR_MS) return clearInterval(this.chimeTimer);
        chime();
      }, 4000);
    }
  }

  quiet() {
    clearInterval(this.chimeTimer);
  }
}

/** What to say when an alarm rings. */
export function message(s) {
  if (s.kind === "focus") {
    if (s.waiting) return { title: L("Break's over", "休息結束"), body: L(`Round ${s.round + 1} (${s.focus} min) starts when you're back.`, `第 ${s.round + 1} 輪（${s.focus} 分鐘）等你回來再開始。`) };
    if (s.phase === "long") return { title: L("Long break", "長休息"), body: L(`${s.longRest} minutes. You've done ${s.round} rounds, go for a walk.`, `${s.longRest} 分鐘。你已經做完 ${s.round} 輪了，起來走走吧。`) };
    return s.phase === "break"
      ? { title: L("Break time", "休息時間"), body: L(`${s.rest} minutes. Stretch, drink some water.`, `${s.rest} 分鐘。伸展一下、喝點水。`) }
      : { title: L("Back to focus", "回來專注囉"), body: L(`Round ${s.round}: ${s.focus} minutes.`, `第 ${s.round} 輪：${s.focus} 分鐘。`) };
  }
  return { title: L("Time's up", "時間到"), body: s.label || L("Your alarm is ringing.", "鬧鐘響了。") };
}
