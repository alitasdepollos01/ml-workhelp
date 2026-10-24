// The photo-shuffle polaroid. The front shows a photo and a Thai card; tapping
// it flips it over to the romanization and meaning on the back.

import { kindLabel, known } from "./deck.js";

function el(tag, cls, text, lang) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  if (lang) e.lang = lang;
  return e;
}

function shuffled(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Shuffle, then nudge burst shots of the same moment apart. */
function order(photos) {
  const a = shuffled(photos);
  for (let i = 1; i < a.length; i++) {
    if (a[i].similar == null || a[i].similar !== a[i - 1].similar) continue;
    const j = a.findIndex((p, k) => k > i && p.similar !== a[i - 1].similar);
    if (j > 0) [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * object-position for a square frame so the photo's focus point (faces) sits
 * as close to the middle as the edges allow.
 */
export function cropPosition(photo, naturalW, naturalH) {
  const w = photo.width || naturalW, h = photo.height || naturalH;
  const [fx, fy] = photo.focus || [0.5, 0.4];
  const axis = (f, size, other) => {
    const scaled = size / Math.min(size, other); // scaled size / frame size
    if (scaled <= 1.0001) return 50;
    return Math.min(1, Math.max(0, (f * scaled - 0.5) / (scaled - 1))) * 100;
  };
  return `${axis(fx, w, h).toFixed(1)}% ${axis(fy, h, w).toFixed(1)}%`;
}

export class Polaroid {
  constructor(root, { photos, deck, onFlip, onKnow }) {
    this.root = root;
    this.img = root.querySelector("#photo");
    this.frontTh = root.querySelector("#front-th");
    this.frontFrom = root.querySelector("#front-from");
    this.back = root.querySelector("#back");
    this.photos = photos;
    this.queue = [];
    this.deck = deck;
    this.onFlip = onFlip;
    this.onKnow = onKnow;
    this.timer = null;
    this.seconds = 45;
    this.hovered = false;
    this.seenOnce = false;

    root.addEventListener("click", () => this.flip());
    root.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); this.flip(); }
    });
    root.addEventListener("pointerenter", () => { this.hovered = true; });
    root.addEventListener("pointerleave", () => { this.hovered = false; });
    root.addEventListener("animationend", () => root.classList.remove("placing"));
    document.addEventListener("visibilitychange", () => this.schedule());
  }

  setDeck(deck) {
    this.deck = deck;
    this.showCard(deck.next());
  }

  setInterval(seconds) {
    this.seconds = seconds;
    this.schedule();
  }

  flip(to) {
    const on = to ?? !this.root.classList.contains("flipped");
    this.root.classList.toggle("flipped", on);
    this.root.setAttribute("aria-pressed", String(on));
    if (on && !this.seenOnce) {
      this.seenOnce = true;
      this.root.classList.add("seen"); // the "Tap to flip" hint has done its job
    }
    this.onFlip?.(on);
    this.schedule();
  }

  nextPhoto() {
    if (!this.photos.length) return null;
    if (!this.queue.length) this.queue = order(this.photos);
    return this.queue.shift();
  }

  /** Swap in the next photo and card, like placing a new polaroid on the desk. */
  advance() {
    const photo = this.nextPhoto();
    const card = this.deck.next();
    const pre = photo ? new Image() : null;
    const apply = () => {
      this.flip(false);
      if (photo) {
        this.img.src = photo.url;
        this.img.style.objectPosition = cropPosition(photo, pre.naturalWidth, pre.naturalHeight);
      }
      this.showCard(card);
      const tilt = (Math.random() * 5 - 2.5).toFixed(2);
      this.root.style.setProperty("--tilt", tilt + "deg");
      this.root.style.setProperty("--tape-tilt", (Math.random() * 8 - 4).toFixed(1) + "deg");
      this.root.classList.remove("placing");
      void this.root.offsetWidth; // restart the animation
      this.root.classList.add("placing");
    };
    if (!photo) { apply(); this.schedule(); return; }
    // Decode first so the swap never shows a half-loaded photo.
    pre.src = photo.url;
    const done = () => { apply(); this.schedule(); };
    (pre.decode ? pre.decode() : Promise.resolve()).then(done, done);
  }

  showCard(card) {
    this.card = card;
    const th = card ? card.th : "";
    this.frontTh.textContent = th;
    this.frontTh.classList.toggle("long", th.length > 16);
    this.frontFrom.textContent = card ? card.from : "";
    this.frontFrom.title = card ? card.from : ""; // the whole title, when it's cut short

    this.back.replaceChildren();
    if (!card) return;
    this.back.append(el("p", "kind", kindLabel(card.kind)), el("p", "th", card.th, "th"));
    if (card.kind === "dialect") {
      if (card.std) this.back.append(el("p", "std", "Standard Thai: " + card.std));
    } else if (card.rom) {
      this.back.append(el("p", "rom", card.rom));
    }
    if (card.en) this.back.append(el("p", "en", card.en));
    if (card.words.length) {
      const ul = el("ul", "words");
      for (const w of card.words) {
        const li = el("li");
        const g = el("span", "g");
        if (w.rom) g.append(el("i", null, w.rom));
        g.append(document.createTextNode(w.en));
        li.append(el("span", "w", w.th, "th"), g);
        ul.append(li);
      }
      this.back.append(ul);
    }
    const foot = el("div", "foot");
    foot.append(el("span", "from", card.from));
    if (this.onKnow) {
      // "I know this": it comes up much less often from now on. Press again to undo.
      const btn = el("button", "know", "I know this");
      btn.type = "button";
      const show = () => {
        const on = known.has(card.th);
        btn.setAttribute("aria-pressed", String(on));
        btn.title = on ? "You know this one: it rarely comes up. Click to see it as often as the rest." : "Show this one much less often";
      };
      show();
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.onKnow(card, !known.has(card.th));
        show();
      });
      btn.addEventListener("keydown", (e) => e.stopPropagation());
      foot.append(btn);
    }
    this.back.append(foot);
  }

  /** Auto-advance, but never while someone is reading the back or hovering. */
  schedule() {
    clearTimeout(this.timer);
    if (!this.seconds || document.hidden) return;
    this.timer = setTimeout(() => {
      if (this.hovered || this.root.classList.contains("flipped")) return this.schedule();
      this.advance();
    }, this.seconds * 1000);
  }
}
