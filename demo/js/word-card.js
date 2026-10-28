// A Thai word (from the songs or everyday life), in the app window: the little "word of the day" at the bottom of the
// menu (one a day, the same all day), and the card on Today (tap it for the meaning, again for a new
// word). Both come from the cards the buddies use (deck.js), from the library.

import { L, el, host, deco } from "./app-common.js";
import { Deck } from "./deck.js";

let deckP = null;
const deck = () => (deckP ||= host?.library?.().then((lib) => new Deck(lib, "all")).catch(() => null) || Promise.resolve(null));
const words = (d) => (d?.items || []).filter((c) => c.kind !== "line" && c.th && c.th.length <= 18 && c.en);

/** The same word all day: picked by the date. */
export async function wordOfDay() {
  const list = words(await deck());
  if (!list.length) return null;
  const d = new Date(), n = d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate();
  return list[(n * 7919) % list.length];
}

/** The menu's little card: Thai, the sound, the meaning; click → Today, where the big card is. */
export function wordMini(onClick) {
  const b = el("button", { type: "button", className: "wordmini", title: L("Thai from songs and daily life", "歌裡和生活裡的泰文") });
  b.addEventListener("click", onClick);
  wordOfDay().then((w) => {
    if (!w) { b.remove(); return; }
    b.replaceChildren(el("small", { textContent: L("Word of the day", "今日泰文") }), el("b", { className: "th", lang: "th", textContent: w.th }),
      el("span", { textContent: `${w.rom} · ${w.en.replace(/\s+\(.*$/, "").replace(/\s{2,}.*$/, "")}` }));
  });
  return b;
}

let shown = null, open = false;
/** Today's card: tap for the meaning, tap again for another word. */
export function wordCard() {
  const card = el("section", { className: "card word-card", tabIndex: 0, role: "button", "aria-label": L("Thai word card: tap to see the meaning", "泰文單字卡：點一下看意思") });
  const draw = (w) => {
    if (!w) { card.remove(); return; }
    shown = w;
    card.replaceChildren(
      el("h3", { textContent: L("Thai from songs and daily life", "歌裡和生活裡的泰文") }),
      el("span", { className: "wc-th", lang: "th", textContent: w.th }),
      el("span", { className: "wc-rom", textContent: w.rom }),
      el("div", { className: "wc-mean" + (open ? "" : " hidden"), textContent: open ? w.en.replace(/\s{2,}.*$/, "") : L("Tap to see what it means", "點一下看意思") }),
      w.from ? el("span", { className: "wc-song", textContent: "♪ " + w.from }) : null,
      deco("w3-keep", "wc-deco"));
  };
  const flip = async () => {
    if (open) { open = false; const d = await deck(); let w = d?.nextShort(); for (let i = 0; i < 6 && w && (w.kind === "line" || !w.en); i++) w = d.nextShort(); draw(w); }
    else { open = true; draw(shown); }
  };
  card.addEventListener("click", flip);
  card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
  if (shown) draw(shown); else wordOfDay().then(draw);
  return card;
}
