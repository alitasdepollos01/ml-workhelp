// Today's tally, kept through the host so every view adds to the same one:
//   { date: "2026-10-06", rounds, focusMin, words: [th...], seen: [keys...] }
// rounds: focus rounds finished; focusMin: minutes spent in focus; words: Thai
// words and lines whose meaning you looked at today.

const KEY = "today";

function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function today(host) {
  const t = host.load(KEY, null);
  if (t && t.date === dayKey()) return { rounds: 0, focusMin: 0, words: [], seen: [], ...t };
  return { date: dayKey(), rounds: 0, focusMin: 0, words: [], seen: [] };
}

/**
 * Add to today's tally. `once` makes it count a single time, however many
 * open views report the same thing (each runs the alarm).
 */
export function record(host, { rounds = 0, focusMin = 0, word = null, once = null }) {
  const t = today(host);
  if (once) {
    if (t.seen.includes(once)) return t;
    t.seen = [...t.seen.slice(-20), once];
  }
  t.rounds += rounds;
  t.focusMin = Math.round((t.focusMin + focusMin) * 10) / 10;
  if (word && !t.words.includes(word)) t.words = [...t.words, word];
  host.save(KEY, t);
  return t;
}

/** "2 focus rounds (50 min) · 14 words", or "" before anything happened today. */
export function summary(t) {
  const parts = [];
  const min = Math.round(t.focusMin);
  if (t.rounds) parts.push(`${t.rounds} focus round${t.rounds === 1 ? "" : "s"}${min ? ` (${min} min)` : ""}`);
  else if (min) parts.push(`${min} min focused`);
  if (t.words.length) parts.push(`${t.words.length} word${t.words.length === 1 ? "" : "s"}`);
  return parts.join(" · ");
}
