// Speech bubbles for the buddies: a word card (tap to flip to the meaning) or
// an alarm message with buttons. Always upright, beside whatever said it.

import { kindLabel } from "./deck.js";
import { record } from "./stats.js";
import { L, th } from "./i18n.js";

function p(cls, text, lang) {
  const e = document.createElement("p");
  e.className = cls;
  e.textContent = text;
  if (lang) e.lang = lang;
  return e;
}

export class Bubble {
  /**
   * @param stage   element to put the bubble in
   * @param host    for setInteractive (buddy windows let clicks through elsewhere)
   * @param opts    { card } for a word, or { alarm: { title, body, actions } }
   *                onClose: called when it goes away by itself or is dismissed
   */
  constructor(stage, host, { card = null, alarm = null, onClose = null, label = "" }) {
    this.stage = stage;
    this.host = host;
    this.card = card;
    this.alarm = alarm;
    this.onClose = onClose;
    this.flipped = false;
    this.timer = 0;
    this.at = [0, 0, "above", 12];
    this.el = document.createElement("div");
    this.el.className = "bubble" + (alarm ? " ringing" : "");
    if (alarm) {
      this.el.setAttribute("role", "alert");
    } else {
      this.el.setAttribute("role", "button");
      this.el.tabIndex = 0;
      this.el.setAttribute("aria-label", L("Flip the word card", "翻開單字卡"));
      this.el.addEventListener("click", (e) => { e.stopPropagation(); this.flip(); });
      this.el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.flip(); }
        if (e.key === "Escape") this.close();
      });
    }
    this.label = label;
    this.el.addEventListener("click", (e) => e.stopPropagation());
    this.el.addEventListener("pointerenter", () => { this.host.setInteractive(true); clearTimeout(this.timer); });
    this.el.addEventListener("pointerleave", () => { this.host.setInteractive(false); this.autoClose(); });
    this.render();
    stage.append(this.el);
    this.autoClose();
  }

  render() {
    const el = this.el;
    if (this.alarm) {
      const { title, body, actions, word } = this.alarm;
      el.replaceChildren(p("title", title));
      if (body) el.append(p("en", body));
      // A Thai word that goes with it (a reminder, a break, the daily goal).
      if (word?.th) {
        const w = document.createElement("div");
        w.className = "word";
        // (in Thai the card is the other way round: the English is what's taught)
        if (th && word.en) w.append(p("th", word.en, "en"), p("rom", [word.th, word.rom].filter(Boolean).join(" · ")));
        else {
          w.append(p("th", word.th, "th"));
          if (word.rom || word.en) w.append(p("rom", [word.rom, word.en].filter(Boolean).join(" · ")));
        }
        el.append(w);
        record(this.host, { word: word.th });
      }
      if (actions?.length) {
        const row = document.createElement("div");
        row.className = "actions";
        for (const a of actions) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.textContent = a.label;
          btn.addEventListener("click", (e) => { e.stopPropagation(); a.run(); });
          row.append(btn);
        }
        el.append(row);
      }
      return;
    }
    const card = this.card;
    el.replaceChildren();
    if (this.label) el.append(p("hint", this.label));
    // (in Thai the English comes first, and the Thai word is what's turned over)
    if (th && card.en) {
      el.append(p("th", card.en, "en"));
      if (this.flipped) { el.append(p("rom", [card.th, card.rom].filter(Boolean).join(" · "))); el.append(p("hint", kindLabel(card.kind) + ", " + card.from)); }
      else el.append(p("hint", "แตะเพื่อดูคำภาษาไทย"));
      return;
    }
    el.append(p("th", card.th, "th"));
    if (this.flipped) {
      if (card.kind === "dialect" && card.std) el.append(p("rom", L("Standard Thai: ", "標準泰文：") + card.std));
      else if (card.rom) el.append(p("rom", card.rom));
      if (card.en) el.append(p("en", card.en));
      el.append(p("hint", kindLabel(card.kind) + ", " + card.from));
    } else {
      el.append(p("hint", L("Tap for the meaning", "點一下看意思")));
    }
  }

  flip() {
    this.flipped = !this.flipped;
    if (this.flipped && this.card) record(this.host, { word: this.card.th });
    this.render();
    this.place(...this.at);
    this.autoClose();
  }

  /**
   * Put the bubble next to point (x, y) of the stage, on `side` of it
   * ("above", "below", "left", "right"), `gap` px away, kept on screen.
   */
  place(x, y, side = "above", gap = 12) {
    this.at = [x, y, side, gap];
    const el = this.el;
    const W = this.stage.clientWidth, H = this.stage.clientHeight;
    const bw = el.offsetWidth, bh = el.offsetHeight;
    let left, top;
    if (side === "above") { left = x - bw / 2; top = y - gap - bh; }
    else if (side === "below") { left = x - bw / 2; top = y + gap; }
    else if (side === "left") { left = x - gap - bw; top = y - bh / 2; }
    else { left = x + gap; top = y - bh / 2; }
    left = Math.max(8, Math.min(left, W - bw - 8));
    top = Math.max(8, Math.min(top, H - bh - 8));
    el.dataset.side = side;
    el.style.left = left + "px";
    el.style.top = top + "px";
    // The tail points back at the speaker.
    const vertical = side === "above" || side === "below";
    const along = vertical ? x - left : y - top;
    const size = vertical ? bw : bh;
    el.style.setProperty("--tail", Math.max(16, Math.min(size - 16, along)) + "px");
  }

  autoClose() {
    clearTimeout(this.timer);
    if (this.alarm) return; // stays until the alarm is dealt with
    this.timer = setTimeout(() => this.close(), 15e3);
  }

  close() {
    clearTimeout(this.timer);
    if (!this.el.isConnected) return;
    this.el.remove();
    this.host.setInteractive(false);
    this.onClose?.();
  }
}
