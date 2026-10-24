// A Thai word to go with a reminder, a break or the daily goal, so every nudge
// teaches something. For a reminder: a card whose meaning shares a word with
// what you wrote ("Water the plants" -> รดน้ำต้นไม้ "to water the plants"), or
// whose Thai is in it; for a break: one from the "Body, health and breaks"
// deck; for the goal: praise. Otherwise any everyday word.
// Used by the desktop buddy, the reminders window and (in Node) the app's
// notifications, so it takes the library's decks and nothing else.

const STOP = new Set(("the a an to of and or for with my your our me in on at by from up out off it is be " +
  "do get go have make take some this that then now later please need remember don't dont").split(" "));

const BREAK_DECK = 107;
const PRAISE = ["ทำได้ดีมาก", "เก่งมาก", "สู้ๆ", "ภูมิใจ", "ยินดีด้วย"];

const words = (s) => String(s || "").toLowerCase().match(/[a-z']+/g) || [];
const stem = (w) => w.replace(/(ing|ed|es|s)$/, "");

function allCards(decks) {
  const out = [];
  for (const d of decks || []) {
    for (const c of d.cards || []) {
      if (!c.th || !c.en || (c.kind && c.kind !== "word" && c.kind !== "pattern")) continue;
      // Patterns with "..." are templates, not words to learn on their own.
      if (c.th.includes("...")) continue;
      out.push({ th: c.th, rom: c.rom || "", en: c.en, deck: d.id, topic: !!d.topic });
    }
  }
  return out;
}

const pickOne = (list) => list[Math.floor(Math.random() * list.length)] || null;

/**
 * @param decks  the library's decks (songs.json)
 * @param text   what the reminder says ("" for a break or the goal)
 * @param kind   "reminder" | "break" | "goal"
 * @returns { th, rom, en } or null
 */
export function relatedWord(decks, text = "", kind = "reminder") {
  const cards = allCards(decks);
  if (!cards.length) return null;
  const topic = cards.filter((c) => c.topic);
  // Something to do on a break (stretch, drink water...), not a body part.
  const doing = (c) => /^(to |take |breathe|don't|shall|rest )/.test(c.en);
  if (kind === "break") return pickOne(cards.filter((c) => c.deck === BREAK_DECK && doing(c))) || pickOne(topic) || pickOne(cards);
  if (kind === "goal") return pickOne(cards.filter((c) => PRAISE.includes(c.th))) || pickOne(topic) || pickOne(cards);

  // Thai in the reminder itself: the longest card it contains.
  // (Thai has no spaces: a word inside another, เส้น "line" in ยืดเส้น "stretch", isn't it; so it has to start
  // what you wrote, or be most of it)
  const said = String(text).trim();
  const thai = cards.filter((c) => c.th.length >= 2 && said.includes(c.th) && (said.startsWith(c.th) || c.th.length >= said.length * 0.6)).sort((a, b) => b.th.length - a.th.length);
  if (thai.length) return thai[0];

  const want = words(text).filter((w) => w.length >= 3 && !STOP.has(w)).map(stem);
  if (want.length) {
    let best = [], top = -Infinity;
    for (const c of cards) {
      const have = [...new Set(words(c.en).filter((w) => !STOP.has(w)).map(stem))];
      if (!have.length) continue;
      // Each word of yours it means counts, the first ones (usually the verb) a little more.
      const hits = want.reduce((t, w, i) => t + (have.includes(w) ? 1 + (want.length - i) / want.length / 2 : 0), 0);
      if (!hits) continue;
      // Matching more of what you wrote wins; then a meaning with fewer other
      // words (more to the point); then the everyday decks.
      const score = hits * 10 - have.length * 0.5 + (c.topic ? 2 : 0);
      if (score > top) { top = score; best = [c]; } else if (score === top) best.push(c);
    }
    if (best.length) return pickOne(best);
  }
  return pickOne(topic) || pickOne(cards);
}
