// Development buddies: Milk and Love patrol the edges of the screen. They walk
// along the bottom, up the sides with their feet on the edge, and upside down
// along the top, always with their heads pointing into the screen. They hop,
// nap and change pose every so often (setPoseInterval). When they bump into
// each other they sometimes walk on together (a stickers/together cut-out).
// Clicking one shows a word card in a speech bubble; right-clicking one opens
// the desktop app's menu.

import { Bubble } from "./bubble.js";
import { L } from "./i18n.js";

const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (list, not) => {
  const pool = list.length > 1 && not ? list.filter((s) => s.url !== not) : list;
  return pool[Math.floor(Math.random() * pool.length)];
};
const NAMES = { milk: "Milk", love: "Love", together: L("Milk and Love", "Milk 和 Love") };
const SPEED = 50; // px per second
// Which way is "into the screen" from each edge, for placing bubbles.
const BUBBLE_SIDE = { bottom: "above", top: "below", left: "right", right: "left" };

export class DevBuddies {
  constructor(stage, { stickers, deck, host, poseSeconds = 120 }) {
    this.stage = stage;
    this.stickers = stickers;
    this.deck = deck;
    this.host = host;
    this.list = [];
    this.bubble = null;
    this.running = false;
    this.mergeCooldown = 0;
    this.poseSeconds = poseSeconds;
    this.alarm = null;
    this.mood = null;
    this.still = matchMedia("(prefers-reduced-motion: reduce)");
    this.tick = this.tick.bind(this);
    // Re-fit when the stage changes size: the screen, or the editor window being moved or resized.
    new ResizeObserver(() => this.layout()).observe(stage);
  }

  static available(stickers) {
    return ["milk", "love", "together"].some((k) => (stickers[k] || []).length);
  }

  start() {
    if (this.running) return;
    this.running = true;
    const { milk = [], love = [], together = [] } = this.stickers;
    // Start on the bottom edge, walking towards each other.
    const W = this.stage.clientWidth;
    if (milk.length) this.add("milk", W * rand(0.1, 0.3), 1);
    if (love.length) this.add("love", W * rand(0.5, 0.75), -1);
    if (!milk.length && !love.length && together.length) this.add("together", W * 0.4, 1);
    this.last = performance.now();
    requestAnimationFrame(this.tick);
    if (this.alarm) this.ring(this.alarm);
  }

  stop() {
    this.running = false;
    this.bubble?.close();
    this.bubble = null;
    for (const b of this.list) b.el.remove();
    this.list = [];
  }

  setDeck(deck) {
    this.deck = deck;
  }

  /** How often each buddy switches to another sticker of the same person (0 = never). */
  setPoseInterval(seconds) {
    this.poseSeconds = seconds;
    const now = performance.now();
    for (const b of this.list) b.poseAt = this.nextPoseAt(now);
  }

  nextPoseAt(now) {
    // A little jitter so Milk and Love don't change at the same moment.
    return this.poseSeconds ? now + this.poseSeconds * 1000 * rand(0.8, 1.2) : Infinity;
  }

  // ---- where a buddy is ---------------------------------------------------
  //
  // b.s is the distance walked around the edge, starting at the bottom left:
  // right along the bottom, up the right side, left along the top, down the
  // left side (dir +1; dir -1 goes the other way). The path is inset by half
  // the buddy's width so it never pokes past a corner.

  path(b) {
    const W = this.stage.clientWidth, H = this.stage.clientHeight;
    const m = b.w / 2;
    const w = Math.max(1, W - 2 * m), h = Math.max(1, H - 2 * m);
    return { W, H, m, w, h, P: 2 * (w + h) };
  }

  /** The point under the buddy's feet, which edge it's on, and its rotation. */
  where(b) {
    const { W, H, m, w, h, P } = this.path(b);
    let s = ((b.s % P) + P) % P;
    if (s < w) return { x: m + s, y: H, edge: "bottom", angle: 0 };
    s -= w;
    if (s < h) return { x: W, y: H - m - s, edge: "right", angle: -90 };
    s -= h;
    if (s < w) return { x: W - m - s, y: 0, edge: "top", angle: 180 };
    s -= w;
    return { x: 0, y: m + s, edge: "left", angle: 90 };
  }

  /** Where the buddy's head is (for the bubble). */
  head(b) {
    const { x, y, edge } = this.where(b);
    const d = b.h;
    if (edge === "bottom") return { x, y: y - d, edge };
    if (edge === "top") return { x, y: y + d, edge };
    if (edge === "right") return { x: x - d, y, edge };
    return { x: x + d, y, edge };
  }

  add(set, s, dir, sticker = pick(this.stickers[set])) {
    const el = document.createElement("div");
    el.className = "buddy dev arriving";
    el.tabIndex = 0;
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", L(`${NAMES[set]}: show a Thai word`, `${NAMES[set]}：看一個泰文單字`));
    const body = document.createElement("div");
    body.className = "body";
    const img = document.createElement("img");
    img.alt = "";
    img.draggable = false;
    img.src = sticker.url;
    body.append(img);
    el.append(body);
    this.stage.append(el);

    const b = { set, el, img, sticker, s, dir, w: 0, h: 0, state: "idle", until: 0,
      poseAt: this.nextPoseAt(performance.now()) };
    // A hidden layer measures 0; keep the last real size.
    const measure = () => { if (el.offsetWidth) { b.w = el.offsetWidth; b.h = el.offsetHeight; } this.place(b); };
    if (sticker.width && sticker.height) {
      el.style.width = (sticker.width / sticker.height) * el.offsetHeight + "px";
    }
    img.addEventListener("load", () => { el.style.width = ""; measure(); });
    measure();
    el.addEventListener("animationend", () => el.classList.remove("arriving", "hopping"));
    el.addEventListener("click", (e) => { e.stopPropagation(); this.toggleBubble(b); });
    // Right-click: the host's menu (bring out the desktop buddy, where to walk...).
    el.addEventListener("contextmenu", (e) => { if (this.host.menu("dev")) e.preventDefault(); });
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.toggleBubble(b); }
    });
    el.addEventListener("pointerenter", () => this.host.setInteractive(true));
    el.addEventListener("pointerleave", () => this.host.setInteractive(false));
    this.choose(b, performance.now());
    this.list.push(b);
    this.place(b);
    return b;
  }

  remove(b) {
    if (this.bubble?.buddy === b) this.closeBubble();
    b.el.remove();
    this.list = this.list.filter((x) => x !== b);
  }

  // ---- behaviour ----------------------------------------------------------

  choose(b, now) {
    const cls = b.el.classList;
    cls.remove("walking", "napping", "hopping", "cheering");
    if (this.alarm) { b.state = "cheer"; b.until = Infinity; cls.add("cheering"); return; }
    if (this.bubble?.buddy === b) { b.state = "listen"; b.until = Infinity; return; }
    if (this.resting) { b.state = "nap"; b.until = Infinity; cls.add("napping"); return; }
    if (this.still.matches) { b.state = "idle"; b.until = now + 60e3; return; }
    // While you focus (a focus timer runs) they walk less and don't hop about.
    const focus = this.mood === "focus";
    const r = Math.random() * (focus ? 0.85 : 1);
    if (r < (focus ? 0.4 : 0.62)) {
      b.state = "walk";
      b.until = now + rand(5e3, 12e3);
      if (Math.random() < 0.3) b.dir *= -1;
      cls.add("walking");
    } else if (r < 0.85) {
      b.state = "idle";
      b.until = now + (focus ? rand(4e3, 10e3) : rand(1.5e3, 4e3));
    } else if (r < 0.95 && !focus) {
      b.state = "hop";
      b.until = now + 650;
      cls.add("hopping");
    } else {
      b.state = "nap";
      b.until = now + rand(6e3, 12e3);
      cls.add("napping");
    }
  }

  tick(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    // Hidden (the editor isn't in front) or the screen is locked: stay put.
    if (this.paused || this.asleep) { requestAnimationFrame(this.tick); return; }
    for (const b of this.list.slice()) {
      if (b.state === "walk") {
        const { P } = this.path(b);
        b.s = (((b.s + b.dir * SPEED * dt) % P) + P) % P;
      }
      if (now >= b.until) {
        if (b.splitAt && now >= b.splitAt) { this.split(b); continue; }
        if (now >= b.poseAt && b.state !== "listen") this.changePose(b, now);
        this.choose(b, now);
      }
      this.place(b);
    }
    this.maybeMerge(now);
    requestAnimationFrame(this.tick);
  }

  place(b) {
    const { x, y, angle, edge } = this.where(b);
    b.edge = edge;
    b.el.classList.toggle("facing-left", b.dir < 0);
    // transform-origin is the feet (bottom middle), so this stands the buddy on the edge.
    b.el.style.transform =
      `translate(${(x - b.w / 2).toFixed(1)}px, ${(y - b.h).toFixed(1)}px) rotate(${angle}deg)`;
  }

  layout() {
    for (const b of this.list) this.place(b);
    this.placeBubble();
  }

  /** The buddies got bigger or smaller (the --dev-h size changed). */
  resize() {
    for (const b of this.list) if (b.el.offsetWidth) { b.w = b.el.offsetWidth; b.h = b.el.offsetHeight; }
    this.layout();
  }

  changePose(b, now) {
    const next = pick(this.stickers[b.set], b.sticker.url);
    b.poseAt = this.nextPoseAt(now);
    if (!next || next === b.sticker) return;
    b.sticker = next;
    b.img.src = next.url;
    b.el.classList.add("arriving");
  }

  /** Milk and Love bumping into each other may walk on as one sticker. */
  maybeMerge(now) {
    const together = this.stickers.together || [];
    if (!together.length || now < this.mergeCooldown || this.bubble || this.alarm) return;
    const m = this.list.find((b) => b.set === "milk");
    const l = this.list.find((b) => b.set === "love");
    if (!m || !l || m.state === "nap" || l.state === "nap") return;
    const a = this.where(m), c = this.where(l);
    if (a.edge !== c.edge || Math.hypot(a.x - c.x, a.y - c.y) > (m.w + l.w) * 0.3) return;
    this.mergeCooldown = now + 25e3;
    if (Math.random() < 0.5) return;
    const s = m.s;
    this.remove(m);
    this.remove(l);
    const t = this.add("together", s, Math.random() < 0.5 ? 1 : -1);
    t.splitAt = now + rand(25e3, 50e3);
  }

  split(t) {
    const s = t.s;
    this.remove(t);
    this.add("milk", s - 30, -1);
    this.add("love", s + 30, 1);
    this.mergeCooldown = performance.now() + 30e3;
  }

  /** "focus", "break" or null: see DeskBuddies.setMood. */
  setMood(mood) {
    this.mood = mood;
  }

  /** You've stepped away: everyone naps until you're back, then hops up. */
  setResting(on) {
    if (this.resting === on) return;
    this.resting = on;
    const now = performance.now();
    for (const b of this.list) {
      this.choose(b, now);
      if (!on) { b.state = "hop"; b.until = now + 650; b.el.classList.add("hopping"); }
    }
  }

  // ---- bubbles --------------------------------------------------------------

  placeBubble() {
    if (!this.bubble?.buddy) return;
    const { x, y, edge } = this.head(this.bubble.buddy);
    this.bubble.place(x, y, BUBBLE_SIDE[edge], 14);
  }

  toggleBubble(b) {
    if (this.alarm) return;
    if (this.bubble?.buddy === b) return this.closeBubble();
    this.closeBubble();
    const card = this.deck?.nextShort();
    if (!card) return;
    const bubble = new Bubble(this.stage, this.host, { card, onClose: () => this.bubbleGone(bubble) });
    bubble.buddy = b;
    this.bubble = bubble;
    b.el.classList.remove("walking", "napping");
    b.state = "listen";
    b.until = Infinity;
    this.placeBubble();
  }

  bubbleGone(bubble) {
    if (this.bubble !== bubble) return;
    this.bubble = null;
    if (bubble.buddy?.el.isConnected) this.choose(bubble.buddy, performance.now());
  }

  closeBubble() {
    if (this.bubble && !this.bubble.alarm) this.bubble.close();
  }

  // ---- alarm --------------------------------------------------------------

  /** Everyone jumps; with `alarm.bubble`, the first buddy holds up the message. */
  ring(alarm) {
    this.closeBubble();
    this.alarm = alarm;
    const now = performance.now();
    for (const b of this.list) this.choose(b, now);
    if (!alarm.bubble || !this.list[0]) return;
    const bubble = new Bubble(this.stage, this.host, { alarm });
    bubble.buddy = this.list[0];
    this.bubble = bubble;
    this.placeBubble();
  }

  unring() {
    if (!this.alarm) return;
    this.alarm = null;
    if (this.bubble?.alarm) { const b = this.bubble; this.bubble = null; b.close(); }
    const now = performance.now();
    for (const b of this.list) this.choose(b, now);
  }
}
