// The reminder card (remind.html): breaks, events and reminders while the desktop buddy is hidden.
// main.js sends the cards to show ("cards"); a button goes back as host.remind.act(id, which), and the
// window is sized to the cards (host.remind.size) at the top right of the screen the mouse is on.

const host = window.MLHost;
const stack = document.getElementById("stack");
let decoMap = {};
const decoLoad = fetch("deco/deco.json").then((r) => r.json()).then((d) => { decoMap = d; }).catch(() => {});

function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) if (v != null) e[k] = v;
  e.append(...kids.flat().filter((k) => k != null && k !== false));
  return e;
}

function card(c) {
  const f = decoMap[c.spot]?.cartoon;
  const [first, ...rest] = String(c.body || "").split("\n");
  const acts = (c.buttons || []).map((t, i) => { const b = el("button", { type: "button", className: i === 0 ? "pri" : "", textContent: t }); b.addEventListener("click", () => host.remind.act(c.id, i)); return b; });
  const x = el("button", { type: "button", className: "rc-x", textContent: "✕", title: c.close || "Close", ariaLabel: c.close || "Close" });
  x.addEventListener("click", () => host.remind.act(c.id, -1));
  return el("section", { className: "rc" + (f ? " has-st" : ""), role: "alertdialog", ariaLabel: c.title },
    x, el("span", { className: "rc-k", textContent: c.title }), el("b", { className: "rc-b", textContent: first }),
    rest.length ? el("span", { className: "rc-t", textContent: rest.join(" ") }) : null,
    acts.length ? el("div", { className: "rc-acts" }, acts) : null,
    f ? el("img", { className: "rc-st", src: "deco/" + f, alt: "" }) : null);
}

async function show(cards) {
  await decoLoad;
  stack.replaceChildren(...cards.map(card));
  await Promise.all([...stack.querySelectorAll("img")].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
  requestAnimationFrame(() => host.remind.size(stack.getBoundingClientRect().height + 16));
}

host.onCommand?.((cmd, arg) => { if (cmd === "cards") show(arg || []); });
host.remind.ready();
