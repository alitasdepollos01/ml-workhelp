// Cards from content/songs.json, and lyric lines from the private lyrics.json.
// Every card comes out in one shape for the polaroid and the bubbles:
//   { kind, th, rom, en, std, words: [{ th, rom, en }], from }

import { L } from "./i18n.js";

const KIND_LABEL = {
  word: L("Word", "單字"),
  pattern: L("Grammar pattern", "文法句型"),
  dialect: L("Northern Thai", "北部泰語"),
  line: L("Song line", "歌詞句"),
};

/** Thai text of the cards you said you know; main.js fills it from the host. */
export const known = new Set();
// A known card still turns up now and then, so it isn't forgotten.
const KNOWN_SHOWS = 0.15;

export function kindLabel(kind) {
  return KIND_LABEL[kind] || "";
}

/** The choices for the Deck menu: { value, label, group } ("" is the top of the menu). */
export function deckOptions(lib) {
  const decks = (lib.decks || []).filter((d) => d.cards && d.cards.length);
  const songs = decks.filter((d) => !d.topic), topics = decks.filter((d) => d.topic);
  const T = (x) => L(x, x); // (the decks' names: English in Chinese too; Thai looked up)
  const opts = [{ value: "all", label: T("All cards"), group: "" }];
  if (topics.length && songs.length) {
    opts.push({ value: "songs", label: T("All song words"), group: "" }, { value: "topics", label: T("All everyday words"), group: "" });
  }
  if (hasLyrics(lib)) opts.push({ value: "lines", label: T("Song lines"), group: "" });
  for (const s of songs) opts.push({ value: "song:" + s.id, label: T(shortTitle(s.title)), group: T("Songs") });
  for (const t of topics) opts.push({ value: "song:" + t.id, label: T(t.title), group: T("Everyday Thai") });
  return opts;
}

function hasLyrics(lib) {
  return Array.isArray(lib.lyrics) && lib.lyrics.some((s) => s.stanzas && s.stanzas.length);
}

function shortTitle(title) {
  return String(title || "").replace(/\s*\(all songs\)\s*$/i, "");
}

function shuffled(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class Deck {
  constructor(lib, choice) {
    this.byId = new Map((lib.decks || []).map((d) => [d.id, d]));
    this.items = this.build(lib, choice);
    this.bag = [];
  }

  build(lib, choice) {
    const decks = lib.decks || [];
    const card = (song, c) => ({
      kind: c.kind || "word",
      th: c.th,
      rom: c.rom || "",
      en: c.en || "",
      std: c.std || "",
      words: [],
      from: shortTitle(song.title),
    });
    if (choice === "lines" && hasLyrics(lib)) {
      const out = [];
      for (const song of lib.lyrics) {
        for (const stanza of song.stanzas || []) {
          for (const line of stanza) out.push(this.line(song, line));
        }
      }
      return out;
    }
    const pick = choice && choice.startsWith("song:") ? Number(choice.slice(5)) : null;
    const out = [];
    for (const song of decks) {
      if (pick !== null && song.id !== pick) continue;
      if (choice === "songs" && song.topic) continue;
      if (choice === "topics" && !song.topic) continue;
      for (const c of song.cards || []) out.push(card(song, c));
    }
    return out;
  }

  line(song, line) {
    // Gloss each word that links to a card, once, in the order it's sung.
    const seen = new Set();
    const words = [];
    for (const [th, rom, ref] of line.words || []) {
      if (!ref || seen.has(th)) continue;
      const [sid, idx] = String(ref).split(":").map(Number);
      const c = this.byId.get(sid)?.cards?.[idx];
      if (!c || !c.en) continue;
      seen.add(th);
      words.push({ th, rom: rom || c.rom || "", en: c.en });
    }
    return {
      kind: "line",
      th: line.th,
      rom: line.rom || "",
      en: "",
      std: "",
      words: words.slice(0, 7),
      from: shortTitle(song.title),
    };
  }

  get size() {
    return this.items.length;
  }

  /** Next card, without repeats until the whole deck has been seen; known cards mostly skipped. */
  next() {
    if (!this.items.length) return null;
    for (let tries = 0; tries < this.items.length + 1; tries++) {
      if (!this.bag.length) this.bag = shuffled(this.items);
      const c = this.bag.pop();
      if (!known.has(c.th) || Math.random() < KNOWN_SHOWS) return c;
    }
    return this.bag.pop() || this.items[0]; // you know every card here
  }

  /** A short word card for a buddy's bubble (lines are too long for one). */
  nextShort() {
    for (let tries = 0; tries < 12; tries++) {
      const c = this.next();
      if (c && c.kind !== "line" && c.th.length <= 22) return c;
    }
    return this.next();
  }
}
