// The pin worn on the desktop buddy card (quick.html, 235 px): a small CSS pin in the card's top corner that leans
// and turns over to its back on a click (never WebGL in the buddy window). The one hook in quick.js:
//   wearPin(qp, m.buddyPin)   after the card is drawn; m.buddyPin = main.js quickModel()'s { id, tier, tierId, name? } | null
// Only a pin the engine says is worn (an earned one) arrives here, so its real art may show.
import { make, attach } from "./pin3d.js";

const ART = new URL("../pins/art/", import.meta.url).href;
let linked = false;
function css() {
  if (linked) return; linked = true;
  for (const f of ["pins/pin3d.css", "pins/wear.css"]) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = new URL("../" + f, import.meta.url).href; document.head.append(l); }
}
/** Put the worn pin on the card (or take it off). */
export function wearPin(card, bp) {
  card?.querySelector(":scope > .qp-pin")?.remove();
  if (!card || !bp?.id || !bp.tierId) return null;
  css();
  const id = encodeURIComponent(bp.id), name = bp.name || "";
  const p = make({ id: bp.id, front: `${ART}${bp.tierId}/${id}.svg`, back: `${ART}back/${bp.tierId}/${id}.svg`, lines: [name, "", ""], flip: "click", label: name || "pin", max: 10 });
  const wrap = document.createElement("span"); wrap.className = "qp-pin"; wrap.append(p);
  card.append(wrap); attach(wrap);
  return wrap;
}
