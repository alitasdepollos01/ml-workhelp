// The desktop buddy: Milk and Love (side by side, together as one sticker, or
// just one of them) sitting in a corner of the desktop, like KiroPet's desk
// buddy. They stay in their spot, shuffle a little, and do small things: dance,
// sing or study a Thai word (in a bubble), sip coffee, take a selfie (a new
// pose), send hearts, twirl, nap. Underneath, a label counts how long you've
// been working (since the screen was last locked or you were away), plus any
// alarm, and they remind you to take a break. While a focus timer runs they
// keep quiet and work along with you; on its breaks they liven up (setMood).
// Drag one to give it a new spot. Side by side, Milk and Love sometimes go
// over to each other, and when they bump they may walk on as one "together"
// sticker for a while.
// In the desktop app the app keeps the work clock and reminders (host.work):
// the label shows its numbers, and the buddy holds up its reminders.
// In the desktop app they have a small window of their own (host.deskWindow):
// dragging moves that window, so they can go to any monitor. Right-click for
// the app's menu.

import { labelLines } from "./label.js";
import { Bubble } from "./bubble.js";
import { L } from "./i18n.js";
import { pick } from "./dev-buddies.js";

const rand = (a, b) => a + Math.random() * (b - a);
const SPEED = 40;               // px per second when shuffling about
const ROAM = 110;               // how far from its spot it wanders, px
// How lively it is (Settings › Desktop buddy): lively walks whenever it likes; calm takes a stroll every
// 20-40 s, calmer every 1-2 min (both a little slower, with longer pauses and fewer dances); still stays
// where you put it. Anything moving (a walk, a dance, a bobbing prop) has the Mac redraw the buddy's window
// every frame, which is what costs: about 10% of a core while it lasts, against about 1% standing.
const PACES = {
  lively: { walkEvery: null, speed: 1, roam: 1, idle: 1, fun: 1, idleMs: [3e3, 7e3] },
  calm: { walkEvery: [20e3, 40e3], speed: 0.75, roam: 0.9, idle: 2.5, fun: 0.35, idleMs: [5e3, 12e3], turn: true },
  calmer: { walkEvery: [60e3, 120e3], speed: 0.65, roam: 0.6, idle: 3.5, fun: 0.2, idleMs: [8e3, 18e3], turn: true },
  still: { walkEvery: false, speed: 0.65, roam: 0, idle: 3, fun: 0, idleMs: [10e3, 20e3] },
};
const STILL_OK = new Set(["idle", "study", "coffee", "nap", "work"]); // (still: nothing that moves about)
const SAY_EVERY = 3 * 60e3;     // at most one word bubble on its own every 3 minutes
const SAY_EVERY_BREAK = 40e3;   // ...or every 40 seconds on a focus-timer break
const LABEL_ROOM = 44;          // space under the sticker for the label
const APART = 8;                // side by side, they keep at least this far apart (px)
const WORK_KEY = "mlwh:work";   // the work timer, kept so "Reload photos" or an app update doesn't reset it
const WORK_GAP = 10 * 60e3;     // ...unless the app was off this long (that was a break)

// weight: how often it's picked; focus: how often while you focus (0 = never);
// fun: picked twice as often on a break; ms: how long it lasts; say: shows a word.
const ACTIONS = [
  { id: "stroll", label: L("Pottering about", "閒晃中"), weight: 2.5, focus: 0.8 },
  { id: "visit", label: L("Going over to say hi", "過去打招呼"), weight: 0.4, pair: true },
  { id: "idle", label: L("Hanging out", "發呆中"), weight: 2.5, focus: 2, ms: [3e3, 7e3] },
  { id: "work", label: L("Working with you", "陪你工作"), prop: "💻", cls: "reading", weight: 0, focus: 3, ms: [15e3, 30e3] },
  { id: "dance", label: L("Dancing", "跳舞"), prop: "🎵", cls: "dancing", weight: 1.2, fun: true, ms: [5e3, 9e3] },
  { id: "sing", label: L("Singing", "唱歌"), prop: "🎤", cls: "singing", weight: 1, fun: true, ms: [8e3, 12e3], say: L("Singing", "唱歌中") },
  { id: "study", label: L("Studying Thai", "學泰文"), prop: "📖", cls: "reading", weight: 1, focus: 0.8, ms: [8e3, 12e3], say: L("Studying", "學習中") },
  { id: "coffee", label: L("Coffee break", "喝咖啡"), prop: "☕", cls: "sipping", weight: 0.9, focus: 0.6, ms: [6e3, 10e3] },
  { id: "selfie", label: L("Taking a selfie", "自拍"), prop: "📸", cls: "posing", weight: 0.7, fun: true, ms: [2.5e3, 2.5e3] },
  { id: "hearts", label: L("Sending hearts", "比愛心"), prop: "💕", cls: "hearts", weight: 0.8, fun: true, ms: [4e3, 6e3] },
  { id: "hop", label: L("Hopping", "蹦蹦跳跳"), cls: "hopping", weight: 0.8, ms: [650, 650] },
  { id: "twirl", label: L("Twirling", "轉圈"), cls: "twirling", weight: 0.5, fun: true, ms: [1.2e3, 1.2e3] },
  { id: "nap", label: L("Napping", "打瞌睡"), prop: "💤", cls: "napping", weight: 0.6, focus: 0.3, ms: [10e3, 20e3] },
];
const ACTION_CLASSES = ACTIONS.map((a) => a.cls).filter(Boolean);
const NAMES = { milk: "Milk", love: "Love", together: L("Milk and Love", "Milk 和 Love"), others: L("Your buddy", "你的夥伴") };

const clockTime = (ms) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function duration(ms) {
  const m = Math.floor(ms / 60e3);
  return m < 60 ? L(`${m} min`, `${m} 分鐘`) : L(`${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`, `${Math.floor(m / 60)} 小時 ${m % 60} 分`);
}

/** One sticker that keeps to its spot on the desktop. */
class DeskSticker {
  constructor(group, set, home) {
    this.group = group;
    this.stage = group.stage;
    this.host = group.host;
    this.set = set;
    this.home = home; // { fx, fy }: its spot, as fractions of the screen
    this.bubble = null;
    this.alarm = null;
    this.saidAt = -Infinity;
    this.dir = -1;
  }

  get stickers() { return this.group.stickers[this.set]; }

  start() {
    this.build();
    this.goHome();
    this.act(performance.now(), "idle");
  }

  stop() {
    this.bubble?.close();
    this.bubble = null;
    this.el?.remove();
    this.el = null;
  }

  build() {
    const el = document.createElement("div");
    el.className = "buddy deskbuddy arriving";
    el.tabIndex = 0;
    el.setAttribute("role", "button");
    const body = document.createElement("div");
    body.className = "body";
    const img = document.createElement("img");
    img.alt = "";
    img.draggable = false;
    const prop = document.createElement("span");
    prop.className = "prop";
    prop.setAttribute("aria-hidden", "true");
    body.append(img, prop);
    el.append(body);
    this.stage.append(el);
    Object.assign(this, { el, img, prop });
    this.setSticker(pick(this.stickers));
    this.poseAt = this.group.nextPoseAt(performance.now());

    el.addEventListener("animationend", (e) => {
      if (e.animationName === "pop") el.classList.remove("arriving");
    });
    el.addEventListener("pointerenter", () => this.host.setInteractive(true));
    el.addEventListener("pointerleave", () => { if (!this.drag) this.host.setInteractive(false); });
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.toggleBubble(); }
    });
    el.addEventListener("contextmenu", (e) => this.group.contextMenu(e));
    this.dragging();
  }

  setSticker(sticker) {
    this.sticker = sticker;
    this.img.src = sticker.url;
    const h = this.el.offsetHeight;
    // Known size: set the width now so the first frame is right.
    if (sticker.width && sticker.height) this.el.style.width = (sticker.width / sticker.height) * h + "px";
    // (Put away before it loaded: nothing to size.)
    // A new photo of another height keeps its feet where they were.
    const feet = () => this.y + this.h;
    this.img.onload = () => {
      if (!this.el) return;
      const ground = feet();
      this.el.style.width = "";
      this.measure();
      if (Number.isFinite(ground) && this.h && !this.drag && !this.target) this.y = ground - this.h;
      this.keepInside();
      this.place();
    };
    this.measure();
  }

  measure() {
    if (!this.el?.offsetWidth) return; // hidden: keep the last real size
    this.w = this.el.offsetWidth;
    this.h = this.el.offsetHeight;
  }

  /** Its spot in pixels (the bottom-middle of the sticker). */
  spot() {
    const W = this.stage.clientWidth, H = this.stage.clientHeight;
    return { x: this.home.fx * W + this.group.shift, y: Math.min(this.home.fy * H, H - LABEL_ROOM) };
  }

  goHome() {
    // (Not laid out yet, its window hidden during a call, say: this lands in the
    // top-left corner, and the stage's ResizeObserver brings it home once the
    // window has its size.)
    const s = this.spot();
    this.x = s.x - this.w / 2;
    this.y = s.y - this.h;
    this.keepInside();
    this.place();
  }

  /** The other sticker, side by side. */
  other() {
    return this.group.members.find((m) => m !== this && m.el && m.w);
  }

  /**
   * Where it can stand ([lo, hi] for x) without overlapping the other one:
   * on its own side of it, clear of where the other is and where it's heading.
   * (Only a visit goes right up to it, to bump.)
   */
  room() {
    const W = this.stage.clientWidth;
    let lo = 0, hi = W - this.w;
    const o = this.other();
    if (!o) return [lo, hi];
    const to = o.target ? o.target.x : o.x;
    const left = Math.min(o.x, to), right = Math.max(o.x, to) + o.w;
    if (this.x + this.w / 2 <= o.x + o.w / 2) hi = Math.min(hi, left - APART - this.w);
    else lo = Math.max(lo, right + APART);
    return [lo, Math.max(lo, hi)];
  }

  keepInside() {
    const W = this.stage.clientWidth, H = this.stage.clientHeight;
    this.x = Math.max(0, Math.min(this.x, W - this.w));
    this.y = Math.max(0, Math.min(this.y, H - this.h - LABEL_ROOM));
  }

  place() {
    if (!this.el) return;
    // Never lost in a corner: a position that isn't a number goes back to its spot.
    if (!Number.isFinite(this.x) || !Number.isFinite(this.y)) {
      const s = this.spot();
      this.x = s.x - (this.w || 0) / 2;
      this.y = s.y - (this.h || 0);
      if (!Number.isFinite(this.x) || !Number.isFinite(this.y)) return;
    }
    this.el.classList.toggle("facing-left", this.dir < 0);
    this.el.style.transform = `translate(${this.x.toFixed(1)}px, ${this.y.toFixed(1)}px)`;
    this.group.placeLabel();
  }

  changePose(now) {
    this.poseAt = this.group.nextPoseAt(now);
    const next = pick(this.stickers, this.sticker?.url);
    if (!next) return;
    this.setSticker(next);
    this.el.classList.remove("arriving");
    void this.el.offsetWidth;
    this.el.classList.add("arriving");
  }

  // ---- picking it up: dropping it somewhere makes that its new spot ---------
  //
  // With a window of its own, the window moves instead (the host follows the
  // mouse), and the stickers keep their places inside it.

  dragging() {
    const el = this.el;
    const moveWindow = this.host.deskWindow;
    el.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || e.ctrlKey) return; // ctrl-click is a right-click on a Mac
      e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch { /* not a live pointer; dragging still works over the buddy */ }
      this.drag = { dx: e.clientX - this.x, dy: e.clientY - this.y, sx: e.clientX, sy: e.clientY, moved: false };
      this.group.kick();
    });
    el.addEventListener("pointermove", (e) => {
      const d = this.drag;
      if (!d) return;
      if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 5) {
        d.moved = true;
        this.closeBubble();
        this.setAction(null);
        el.classList.add("held");
        if (moveWindow) this.host.dragWindow("start");
      }
      if (d.moved && !moveWindow) {
        this.x = e.clientX - d.dx;
        this.y = e.clientY - d.dy;
        this.keepInside();
        this.place();
      }
    });
    const end = () => {
      const d = this.drag;
      if (!d) return;
      this.drag = null;
      el.classList.remove("held");
      if (!d.moved) { this.toggleBubble(); return; }
      if (moveWindow) {
        this.host.dragWindow("end"); // the host remembers where the window is
      } else {
        const W = this.stage.clientWidth, H = this.stage.clientHeight;
        this.home = { fx: (this.x + this.w / 2) / W, fy: (this.y + this.h) / H };
        this.group.saveHome(this);
      }
      this.act(performance.now(), "hop"); // a little landing hop
      if (!el.matches(":hover")) this.host.setInteractive(false);
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    // Never leave the window stuck to the mouse.
    el.addEventListener("lostpointercapture", end);
    // The click that follows mustn't reach the page's "click elsewhere closes bubbles".
    el.addEventListener("click", (e) => e.stopPropagation());
  }

  // ---- what it's doing ------------------------------------------------------------

  setAction(action) {
    this.action = action;
    const cls = this.el.classList;
    cls.remove("walking", "cheering", ...ACTION_CLASSES);
    this.prop.textContent = action?.prop || "";
    if (action?.cls) cls.add(action.cls);
    const name = action ? action.label : L("Picked up", "被抱起來了");
    this.el.title = name;
    this.el.setAttribute("aria-label", L(`${NAMES[this.set]}, ${name.toLowerCase()}. Click for a Thai word.`, `${NAMES[this.set]}，${name}。點一下看泰文單字。`));
  }

  /** Start a new action: a given one by id, or a random one. */
  act(now, id) {
    if (this.alarm) {
      this.setAction({ id: "cheer", label: L("Time's up!", "時間到！") });
      this.el.classList.add("cheering");
      this.target = null;
      this.until = Infinity;
      return;
    }
    if (this.group.resting && id !== "nap") id = "nap";
    if (this.bubble && !id) { this.until = now + 2e3; return; } // stay put while showing something
    // Went over to say hi and they didn't walk on together: step back to its own side.
    if (!id && this.action?.id === "visit" && this.other()) id = "stroll";
    let action = id ? ACTIONS.find((a) => a.id === id) : null;
    const mood = this.group.mood;
    const pace = PACES[this.group.pace] || PACES.calm;
    if (!action) {
      const quiet = this.group.still.matches || pace.walkEvery === false || (pace.walkEvery && now < (this.walkAt || 0));
      const pair = this.group.mergeOn && this.group.members.length === 2 && !!(this.group.stickers.together || []).length;
      const weight = (a) => (a.pair && !pair ? 0 : pace.walkEvery === false && !STILL_OK.has(a.id) ? 0
        : (mood === "focus" ? a.focus || 0 : a.weight * (mood === "break" && a.fun ? 2 : 1)) * (a.id === "idle" ? pace.idle : a.fun ? pace.fun : 1));
      const sayEvery = mood === "break" ? SAY_EVERY_BREAK : SAY_EVERY;
      const pool = ACTIONS.filter((a) => weight(a) > 0 && !(quiet && (a.id === "stroll" || a.id === "visit")) &&
        !(a.say && mood !== "focus" && now - this.group.saidAt < sayEvery));
      let r = Math.random() * pool.reduce((t, a) => t + weight(a), 0);
      action = pool.find((a) => (r -= weight(a)) < 0) || pool[0];
    }
    if ((action.id === "stroll" || action.id === "visit") && pace.walkEvery) this.walkAt = now + rand(...pace.walkEvery);
    this.setAction(action);
    if (action.id === "visit") {
      // Right up to the other one, so they bump (see DeskBuddies.maybeMerge).
      const other = this.group.members.find((m) => m !== this && m.el);
      const W = this.stage.clientWidth;
      const side = other && other.x + other.w / 2 > this.x + this.w / 2 ? -1 : 1;
      const x = other ? Math.max(0, Math.min(W - this.w, other.x + other.w / 2 + side * other.w * 0.2 - this.w / 2)) : this.x;
      this.target = { x, y: this.y };
      this.dir = x >= this.x ? 1 : -1;
      this.el.classList.add("walking");
      this.until = now + 30e3; // ends on arrival
    } else if (action.id === "stroll") {
      // A few steps either way, staying near its spot and clear of the other one.
      const s = this.spot();
      const [lo, hi] = this.room();
      const x = Math.max(lo, Math.min(hi, s.x - this.w / 2 + rand(-ROAM, ROAM) * pace.roam));
      this.target = { x, y: s.y - this.h };
      this.dir = x >= this.x ? 1 : -1;
      this.el.classList.add("walking");
      this.until = now + 30e3; // ends on arrival
    } else {
      this.target = null;
      this.until = this.group.resting ? Infinity : now + rand(...(action.id === "idle" ? pace.idleMs : action.ms || [3e3, 6e3]));
      if (action.id === "idle" && pace.turn && Math.random() < 0.35 && !this.group.still.matches) { this.dir = -(this.dir || 1); this.place(); } // (a look the other way)
    }
    if (this.target) this.group.kick();
    if (action.id === "selfie") this.changePose(now);
    if (action.say && mood !== "focus") this.say(action.say, now); // no bubbles while you focus
  }

  step(now, dt) {
    if (this.drag) return;
    if (this.target) {
      const dx = this.target.x - this.x, dy = this.target.y - this.y;
      const dist = Math.hypot(dx, dy);
      const step = SPEED * (PACES[this.group.pace] || PACES.calm).speed * dt;
      if (dist <= step) { this.x = this.target.x; this.y = this.target.y; this.target = null; this.until = now; }
      else { this.x += (dx / dist) * step; this.y += (dy / dist) * step; }
      this.keepInside();
      this.place();
    }
    if (now >= this.until) {
      if (now >= this.poseAt && !this.bubble) this.changePose(now);
      this.act(now);
    }
  }

  // ---- bubbles --------------------------------------------------------------

  placeBubble() {
    if (!this.bubble || !this.el) return;
    // Above its head, unless it's near the top of the screen.
    const above = this.y > 170;
    this.bubble.place(this.x + this.w / 2, above ? this.y : this.y + this.h, above ? "above" : "below", 10);
  }

  say(label, now) {
    const card = this.group.deck?.nextShort();
    if (!card) return;
    this.group.saidAt = now;
    this.openBubble({ card, label });
  }

  openBubble(opts) {
    if (this.bubble) { const b = this.bubble; this.bubble = null; b.close(); }
    const bubble = new Bubble(this.stage, this.host, { ...opts, onClose: () => { if (this.bubble === bubble) this.bubble = null; } });
    this.bubble = bubble;
    this.placeBubble();
    return bubble;
  }

  toggleBubble() {
    if (this.alarm) return;
    if (this.bubble) return this.closeBubble();
    // On a break: clicking the buddy asks whether you're back (back early, or it's over).
    const w = this.host.workClock ? this.group.work : null;
    if (w?.onBreak) {
      const kind = (w.breakTypes || []).find((b) => b.id === w.onBreak.kind);
      const what = kind && kind.id !== "other" ? `${kind.emoji} ${L(kind.label, kind.zh).replace(/ ?[(（].*[)）]$/, "")}` : L("On a break", "休息中");
      const bubble = this.openBubble({ alarm: {
        title: L("Back already?", "這麼快就回來啦？"),
        body: `${what} ${duration(Date.now() - w.onBreak.since)}` + (w.onBreak.until && !w.onBreak.over ? L(` · until ${clockTime(w.onBreak.until)}`, ` · 到 ${clockTime(w.onBreak.until)}`) : ""),
        actions: [
          { label: L("I'm back", "我回來了"), run: () => { this.host.work?.act("end-break"); bubble.close(); } },
          { label: L("Still on my break", "還在休息喔"), run: () => bubble.close() },
        ],
      } });
      bubble.tag = { kind: "break" };
      return;
    }
    const card = this.group.deck?.nextShort();
    if (!card) {
      // (Thai words off) a hello, with what's going on now
      const lines = w ? labelLines({ ...w, label1: "auto", label2: "auto" }, this.group.status).filter(Boolean) : [];
      const hi = this.openBubble({ alarm: { title: L("Hi!", "嗨！"), body: lines.join(" · ") || L("I'm right here with you.", "我在這裡陪你喔。"),
        actions: [{ label: L("OK", "好"), run: () => hi.close() }] } });
      hi.tag = { kind: "hello" };
      return;
    }
    this.group.saidAt = performance.now();
    this.openBubble({ card });
    // Stop and listen while the word is up.
    this.target = null;
    this.setAction(ACTIONS.find((a) => a.id === "idle"));
    this.until = performance.now() + 15e3;
  }

  closeBubble() {
    if (this.bubble && !this.bubble.alarm) this.bubble.close();
  }

  ring(alarm, withBubble) {
    // Whatever was up (a word, a break reminder) makes way for the alarm.
    if (this.bubble) { const b = this.bubble; this.bubble = null; b.close(); }
    this.alarm = alarm;
    if (!this.el) return;
    this.act(performance.now());
    if (!withBubble) return;
    this.bubble = new Bubble(this.stage, this.host, { alarm });
    this.placeBubble();
  }

  unring() {
    if (!this.alarm) return;
    this.alarm = null;
    if (this.bubble?.alarm) { const b = this.bubble; this.bubble = null; b.close(); }
    if (this.el) this.act(performance.now(), "hop");
  }
}

/** The desktop buddy: one or two DeskStickers, the work timer and the label. */
export class DeskBuddies {
  constructor(stage, { stickers, deck, host, who = "pair", poseSeconds = 120, breakEvery = 50, pace = "calm" }) {
    this.stage = stage;
    this.pace = PACES[pace] ? pace : "calm";
    document.documentElement.dataset.pace = this.pace; // (style.css: still, nothing bobs)
    this.shift = 0; // see setShift
    this.mergeOn = true; // the pair may walk on together after bumping (setMerge)
    this.stickers = stickers;
    this.deck = deck;
    this.host = host;
    this.who = who;
    this.poseSeconds = poseSeconds;
    this.breakEvery = breakEvery;
    this.members = [];
    this.running = false;
    this.saidAt = -Infinity;
    this.mood = null;
    this.still = matchMedia("(prefers-reduced-motion: reduce)");
    this.status = "";
    this.workStart = Date.now();
    this.nextBreak = breakEvery * 60e3;
    this.restoreWork();
    this.tick = this.tick.bind(this);
    // The window resized, or got its size at last (it was hidden when the
    // page loaded): every sticker back to its spot on the ground.
    let size = "";
    new ResizeObserver(() => {
      const now = `${this.stage.clientWidth}x${this.stage.clientHeight}`;
      if (now === size || !this.stage.clientWidth || !this.stage.clientHeight) return;
      size = now;
      for (const m of this.members) if (!m.drag) { m.goHome(); m.placeBubble(); }
    }).observe(this.stage);
  }

  static available(stickers) {
    return ["together", "milk", "love", "others"].some((k) => (stickers[k] || []).length);
  }

  /** Which stickers to show for a "who" choice, falling back to what exists. */
  sets(who) {
    const has = (k) => (this.stickers[k] || []).length;
    if (who === "pair" && has("milk") && has("love")) return ["love", "milk"];
    if (who !== "pair" && has(who)) return [who];
    return [["together", "milk", "love", "others"].find(has)];
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.buildLabel();
    // Bottom right of the screen, side by side; or where you last put them.
    // In a window of their own: side by side at the bottom middle of it.
    const sets = this.sets(this.who);
    this.members = sets.map((set, i) => {
      if (this.host.deskWindow) return new DeskSticker(this, set, { fx: 0.5 + (i - (sets.length - 1) / 2) * 0.24, fy: 1 });
      const saved = this.host.load("deskSpot:" + set, null);
      const home = saved && saved.fx >= 0 && saved.fx <= 1 ? saved : { fx: 0.9 - (sets.length - 1 - i) * 0.09, fy: 0.94 };
      return new DeskSticker(this, set, home);
    });
    for (const m of this.members) m.start();
    this.placeLabel();
    this.updateLabel();
    this.labelTimer = setInterval(() => { this.updateLabel(); this.checkBreak(); this.keepWork(); }, 10e3);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
    if (this.alarm) this.ring(this.alarm);
  }

  stop() {
    this.running = false;
    clearTimeout(this.wake);
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.merged = null;
    clearInterval(this.labelTimer);
    for (const m of this.members) m.stop();
    this.members = [];
    this.label?.remove();
    this.label = null;
  }

  tick(now) {
    this.raf = 0;
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!this.asleep) {
      for (const m of this.members) m.step(now, dt);
      if (this.label && window.screenX !== this.labelAt) this.placeLabel(); // (the window was moved)
      if (this.merged) { if (now >= this.merged.splitAt) this.split(now); } else this.maybeMerge(now);
    }
    // Every frame only while someone's walking or being carried; standing about, it looks in again
    // when the next thing is due (at most a second away), so a quiet buddy costs next to nothing.
    if (this.members.some((m) => m.target || m.drag)) { this.raf = requestAnimationFrame(this.tick); return; }
    const due = Math.min(...this.members.map((m) => m.until), this.merged?.splitAt ?? Infinity);
    clearTimeout(this.wake);
    this.wake = setTimeout(() => this.kick(), Math.max(16, Math.min(1000, due - performance.now())));
  }

  /** Back to every frame (someone's off for a walk). */
  kick() {
    if (!this.running || this.raf) return;
    clearTimeout(this.wake);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  /** How lively it is: "lively", "calm", "calmer" or "still" (see PACES). */
  setPace(pace) {
    if (!PACES[pace] || pace === this.pace) return;
    this.pace = pace;
    document.documentElement.dataset.pace = pace;
    const now = performance.now();
    for (const m of this.members) {
      m.walkAt = PACES[pace].walkEvery ? now + rand(3e3, 10e3) : 0;
      if (m.el && !m.alarm && !m.drag && !m.bubble && (m.target || pace === "still")) m.act(now, "idle");
    }
  }

  // ---- bumping into each other ------------------------------------------------------

  /** Milk and Love, side by side, bump: sometimes they walk on as one sticker. */
  maybeMerge(now) {
    const [a, b] = this.members;
    if (!this.mergeOn || this.members.length !== 2 || now < (this.mergeAt || 0) || this.alarm || this.mood === "focus") return;
    if (!(this.stickers.together || []).length) return;
    if ([a, b].some((m) => !m.el || !m.w || m.drag || m.bubble)) return;
    if (Math.abs(a.x + a.w / 2 - (b.x + b.w / 2)) > (a.w + b.w) * 0.32) return;
    this.mergeAt = now + 30e3;
    if (Math.random() < (this.mergeChance ?? 0.5)) this.merge(now);
  }

  merge(now) {
    const pair = this.members;
    const W = this.stage.clientWidth;
    const mid = pair.reduce((t, m) => t + m.x + m.w / 2, 0) / pair.length;
    for (const m of pair) m.stop();
    const together = new DeskSticker(this, "together", { fx: (mid - this.shift) / W, fy: 1 });
    this.merged = { pair: pair.map((m) => ({ set: m.set, home: m.home })), splitAt: now + rand(25e3, 50e3) };
    this.members = [together];
    together.start();
    together.act(now, "twirl");
  }

  /** Back to two: each to its own spot, with a hop. */
  split(now) {
    const [together] = this.members;
    // Not while it's being held, or holding something up.
    if (together && (together.drag || together.bubble || together.alarm)) { this.merged.splitAt = now + 5e3; return; }
    const { pair } = this.merged;
    this.merged = null;
    together?.stop();
    this.members = pair.map(({ set, home }) => new DeskSticker(this, set, home));
    for (const m of this.members) { m.start(); m.act(now, "hop"); }
    this.mergeAt = now + 40e3;
    this.placeLabel();
  }

  /** The menu's "Sometimes they walk together": off splits them up now. */
  setMerge(on) {
    this.mergeOn = !!on;
    if (!on && this.merged) this.merged.splitAt = 0;
  }

  /** The buddies got bigger or smaller (the --desk-h size changed). */
  resize() {
    for (const m of this.members) { m.measure(); m.goHome(); m.placeBubble(); }
    this.placeLabel();
  }

  saveHome(m) {
    this.host.save("deskSpot:" + m.set, m.home);
  }

  setDeck(deck) { this.deck = deck; }

  setPoseInterval(seconds) {
    this.poseSeconds = seconds;
    for (const m of this.members) m.poseAt = this.nextPoseAt(performance.now());
  }

  nextPoseAt(now) {
    return this.poseSeconds ? now + this.poseSeconds * 1000 * rand(0.8, 1.2) : Infinity;
  }

  /**
   * In a window of their own: move the stickers over (px from the middle) so
   * they stay where they were dropped when the host pulls the window back onto
   * the screen. Kept so the whole group fits inside the window.
   */
  setShift(px) {
    const W = this.stage.clientWidth;
    const ready = this.members.filter((m) => m.w);
    const lo = Math.max(-W / 2, ...ready.map((m) => m.w / 2 - m.home.fx * W));
    const hi = Math.min(W / 2, ...ready.map((m) => W - m.w / 2 - m.home.fx * W));
    this.shift = Math.round(Math.max(lo, Math.min(hi, Number(px) || 0)));
    for (const m of this.members) { m.target = null; m.el?.classList.remove("walking"); m.goHome(); }
    this.host.report("desk-shift", this.shift); // where they really are, for the next drop
  }

  setWho(who) {
    if (who === this.who) return;
    this.who = who;
    if (this.running) { this.stop(); this.start(); }
  }

  closeBubble() { for (const m of this.members) m.closeBubble(); }

  /** Right-click: the host's menu, if it has one. */
  contextMenu(e) {
    // (which sticker it was: the menu can show its original photo)
    const m = this.members.find((x) => x.el && x.el.contains(e.target));
    if (this.host.menu("desk", m?.sticker?.url || "")) e.preventDefault();
  }

  /** Something new to do, now (from the menu). */
  shuffle() {
    const now = performance.now();
    for (const m of this.members) { if (!m.alarm) { m.closeBubble(); m.act(now); } }
  }

  // ---- the label: work time and alarm ----------------------------------------------

  buildLabel() {
    const el = document.createElement("div");
    el.className = "desk-label";
    el.addEventListener("contextmenu", (e) => this.contextMenu(e));
    el.addEventListener("pointerenter", () => this.host.setInteractive(true));
    el.addEventListener("pointerleave", () => this.host.setInteractive(false));
    this.stage.append(el);
    this.label = el;
  }

  /** Centred under the stickers. */
  placeLabel() {
    if (!this.label || !this.members.length || this.members.some((m) => m.x === undefined)) return;
    const left = Math.min(...this.members.map((m) => m.x));
    const right = Math.max(...this.members.map((m) => m.x + m.w));
    const bottom = Math.max(...this.members.map((m) => m.y + m.h));
    // Inside the window and on the screen (the window can hang off a screen's edge): as wide as
    // that allows, wrapping a long line rather than cutting it off; centred under them if it fits.
    const W = this.stage?.clientWidth || innerWidth;
    const scr = window.screen || {}, sx = window.screenX || 0;
    const vis0 = Math.max(0, Number.isFinite(scr.availLeft) ? scr.availLeft - sx : 0);
    const vis1 = Math.min(W, Number.isFinite(scr.availLeft) && scr.availWidth ? scr.availLeft + scr.availWidth - sx : W);
    const room0 = vis1 - vis0 > 120 ? vis0 : 0, room1 = vis1 - vis0 > 120 ? vis1 : W;
    this.label.style.maxWidth = Math.max(80, room1 - room0 - 8) + "px";
    const half = (this.label.offsetWidth || 0) / 2;
    this.label.style.left = Math.max(room0 + 4 + half, Math.min((left + right) / 2, room1 - 4 - half)) + "px";
    this.labelAt = sx;
    // (under them, but never past the bottom of the window: two lines need the room)
    const room = (this.stage?.clientHeight || innerHeight) - (this.label.offsetHeight || 40) - 4;
    this.label.style.top = Math.max(0, Math.min(bottom + 6, room)) + "px";
  }

  /** The alarm countdown line, or "" for none. */
  setStatus(text) {
    this.status = text;
    this.updateLabel();
  }

  updateLabel() {
    if (!this.label) return;
    const w = this.host.workClock ? this.work : null;
    if (!w) {
      const only = document.createElement("span");
      only.textContent = L("Worked ", "已工作 ") + duration(Date.now() - this.workStart);
      this.label.replaceChildren(only);
      return;
    }
    const [l1, l2] = labelLines(w, this.status, () => this.labelWord());
    const parts = [];
    for (const [text, cls] of [[l1, ""], [l2, "next"]]) {
      if (!text) continue;
      const a = document.createElement("span");
      a.className = cls;
      a.textContent = text.length > 44 ? text.slice(0, 43) + "…" : text;
      parts.push(a);
    }
    this.label.replaceChildren(...parts);
    this.label.hidden = !parts.length;
  }

  /** A Thai word for the label ("A Thai word"): a new one every ten minutes. */
  labelWord() {
    if (!this.wordAt || Date.now() - this.wordAt > 10 * 60e3) {
      const c = this.group?.deck?.nextShort?.() || this.deck?.nextShort?.();
      this.word = c ? `${c.th}${c.en ? " · " + c.en : ""}` : "";
      this.wordAt = Date.now();
    }
    return this.word || "";
  }

  /** The host's work clock: { stretch, today, week, reminders, ... } (ms). */
  setWork(status) {
    // A break just started: they put the kettle on.
    if (status?.onBreak && !this.work?.onBreak && this.work) {
      const now = performance.now();
      for (const m of this.members) if (m.el && !m.alarm && !m.drag) m.act(now, "coffee");
    }
    this.work = status;
    this.updateLabel();
    this.placeLabel();
  }

  /**
   * The host's break reminder or a reminder: the first buddy holds it up with
   * the buttons; `answered` takes it down when it was dealt with elsewhere.
   */
  holdUp(tag, title, body, buttons, word = null) {
    const lead = this.members.find((m) => m.el);
    if (!lead || this.alarm) return;
    lead.act(performance.now(), "hop");
    const close = () => { if (lead.bubble === bubble) lead.bubble = null; bubble.close(); };
    const bubble = lead.openBubble({
      alarm: {
        title, body, word,
        actions: buttons.map(([label, action, arg]) => ({ label, run: () => { if (action) this.host.work?.act(action, arg ?? tag.id); close(); } })),
      },
    });
    bubble.tag = tag;
  }

  /** The daily goal: they dance and send hearts, and one holds up the news. */
  celebrate({ hours, body, word }) {
    const now = performance.now();
    this.members.forEach((m, i) => { if (m.el && !m.alarm) m.act(now, i ? "hearts" : "dance"); });
    this.holdUp({ kind: "goal" }, L(`${hours} ${hours === 1 ? "hour" : "hours"} today!`, `今天做滿 ${hours} 小時了！`), body, [[L("Yay!", "耶！"), null]], word);
  }

  /** 收工: they dance and send hearts, and one holds up today's total. */
  doneForToday({ today = 0, rounds = 0, keep = "work", goal = 0 }) {
    const now = performance.now();
    this.members.forEach((m, i) => { if (m.el && !m.alarm) m.act(now, i ? "hearts" : "dance"); });
    const h = Math.floor(today / 3600e3), m = Math.floor(today / 60e3) % 60;
    const worked = L(h ? `${h} h ${m} min` : `${m} min`, h ? `${h} 小時 ${m} 分` : `${m} 分鐘`);
    const body = keep === "pomo" ? L(`${rounds} round${rounds === 1 ? "" : "s"} today.`, `今天完成 ${rounds} 輪。`)
      : L(`${worked} of work today${goal && today >= goal * 3600e3 ? ": goal reached." : "."}`, `今天工作 ${worked}${goal && today >= goal * 3600e3 ? "，達標了。" : "。"}`);
    this.holdUp({ kind: "goal" }, L("Done for today!", "收工！今天辛苦了"), body, [[L("See you tomorrow", "明天見"), null]]);
  }

  answered({ action, id, kind: given }) {
    const kind = given || (/^reminder/.test(action) ? "reminder" : /^label-away/.test(action) ? "away"
      : /^(start-day|start-day-theme|start-later|skip-day)$/.test(action) ? "start"
      : /^(switch|name-new)$/.test(action) ? "name" : "break");
    for (const m of this.members) {
      const t = m.bubble?.tag;
      if (t && t.kind === kind && (kind === "break" || t.id === id)) { const b = m.bubble; m.bubble = null; b.close(); }
    }
  }

  // ---- breaks -----------------------------------------------------------------------

  /**
   * "focus" (a focus timer is running: calm, no word bubbles of their own),
   * "break" (its break: livelier), or null. The focus timer does the break
   * reminders while it runs, and a focus round after its break starts the
   * work count afresh.
   */
  setMood(mood) {
    if (mood === this.mood) return;
    const was = this.mood;
    this.mood = mood;
    if (was === "break" && mood === "focus") this.restartWork();
    // "Out of sight until the break" (Settings): only the label stays, faint.
    this.stage.classList.toggle("focus-hide", mood === "hide");
    if (!mood) this.nextBreak = Math.max(this.nextBreak, Date.now() - this.workStart + 10 * 60e3);
    const now = performance.now();
    for (const m of this.members) {
      if (!m.el || m.alarm || m.drag) continue;
      if (mood === "focus") m.closeBubble();
      if (!m.bubble) m.act(now);
    }
  }

  /** Remind every `minutes` of work (0 = never); a change never fires straight away. */
  setBreakEvery(minutes) {
    this.breakEvery = minutes;
    const worked = Date.now() - this.workStart;
    this.nextBreak = minutes ? Math.max(minutes * 60e3, worked + 60e3) : Infinity;
    this.keepWork();
  }

  /** A fresh start after a real break (the screen was locked, or you were away a while). */
  restartWork() {
    this.workStart = Date.now();
    this.nextBreak = this.breakEvery ? this.breakEvery * 60e3 : Infinity;
    this.keepWork();
    this.updateLabel();
  }

  /** The page reloaded (new photos) or the app restarted (an update): carry on counting from before. */
  restoreWork() {
    try {
      const w = JSON.parse(localStorage.getItem(WORK_KEY));
      if (!(w?.start <= Date.now()) || !(Date.now() - w.seen < WORK_GAP)) return;
      this.workStart = w.start;
      this.nextBreak = w.next ?? Infinity;
    } catch { /* no storage: start from now */ }
  }

  keepWork() {
    try {
      localStorage.setItem(WORK_KEY, JSON.stringify({ start: this.workStart, next: this.nextBreak, seen: Date.now() }));
    } catch { /* no storage: a reload restarts the count */ }
  }

  checkBreak() {
    if (this.host.workClock) return; // the host reminds (see holdUp)
    if (!this.breakEvery || this.alarm || this.resting || this.mood || !this.members.length) return;
    const worked = Date.now() - this.workStart;
    if (worked < this.nextBreak) return;
    this.nextBreak = worked + 10 * 60e3; // ask again in 10 minutes unless you take one
    this.keepWork();
    const body = L(`You've been working for ${duration(worked)}.`, `你已經連續工作 ${duration(worked)} 了。`);
    this.host.notify(L("Time for a break", "該休息了"), body, []);
    const lead = this.members[0];
    lead.act(performance.now(), "hop");
    const closeIt = () => { if (lead.bubble === reminder) lead.bubble = null; reminder.close(); };
    const reminder = lead.openBubble({
      alarm: {
        title: L("Time for a break", "該休息了"),
        body,
        actions: [
          { label: L("In 10 min", "10 分鐘後"), run: () => closeIt() },
          { label: L("Taking one", "去休息囉"), run: () => { this.restartWork(); closeIt(); } },
        ],
      },
    });
  }

  // ---- resting and alarms ------------------------------------------------------------

  /** "nap" (you're away), "sleep" (screen locked / long idle), or null (you're back). */
  setRest(state) {
    if (state === "sleep") this.slept = true;
    if (!state && this.slept) { this.slept = false; this.restartWork(); }
    this.setResting(!!state);
  }

  setResting(on) {
    if (this.resting === on) return;
    this.resting = on;
    for (const m of this.members) {
      if (!m.el || m.alarm) continue;
      m.closeBubble();
      m.act(performance.now(), on ? "nap" : "hop");
    }
  }

  /** They jump; the first holds up the message (with buttons, if given). */
  ring(alarm) {
    this.alarm = alarm;
    this.members.forEach((m, i) => m.ring(alarm, i === 0 && alarm.bubble !== false));
  }

  unring() {
    if (!this.alarm) return;
    this.alarm = null;
    for (const m of this.members) m.unring();
  }
}
