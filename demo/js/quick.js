// Right-clicking the desktop buddy (quick.html): main.js sends what to show ("quick", a model of
// labels in your language); a click goes back as host.quick.act(id, x, y), and main.js runs it, or
// opens that button's choices (breaks, reminders, tasks) as a small menu at the button.

const host = window.MLHost;
const NS = "http://www.w3.org/2000/svg";
const P = {
  brk: ["M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z", "M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16", "M9 3.5v2.5", "M12 3.5v2.5"],
  back: ["M9 14l-4-4 4-4", "M5 10h9a5 5 0 0 1 0 10h-3"],
  focus: ["M4 9V4h5", "M20 9V4h-5", "M4 15v5h5", "M20 15v5h-5"],
  rem: ["M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2H4.5z", "M10 21h4"],
  done: ["M19 14.5A8 8 0 1 1 9.5 5a6.5 6.5 0 0 0 9.5 9.5z"],
  start: ["M8 5.5v13l10-6.5z"],
  shuffle: ["M4 7h4l8 10h4", "M4 17h4l8-10h4", "M18 5l2 2-2 2", "M18 15l2 2-2 2"],
  photo: ["M4 5.5h16v13H4z", "M4 15l4.5-4 4 3.5 3-2.5 4.5 4", "M15.5 9.5v.1"],
  hide: ["M3.5 12s3-6 8.5-6 8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6z", "M4.5 19.5l15-15"],
  show: ["M3.5 12s3-6 8.5-6 8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6z", "M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"],
  app: ["M4 5h16v14H4z", "M9.5 5v14"],
  settings: ["M4 7h9", "M17 7h3", "M4 17h3", "M11 17h9", "M15 5v4", "M9 15v4"],
};
function icon(name) {
  const svg = document.createElementNS(NS, "svg");
  for (const [k, v] of Object.entries({ viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.7", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" })) svg.setAttribute(k, v);
  for (const d of P[name] || []) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); svg.append(p); }
  return svg;
}
function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) if (v != null) e[k] = v;
  e.append(...kids.flat().filter((k) => k != null));
  return e;
}
const act = (id) => (e) => {
  // (a button with choices: they open at its bottom left)
  const r = e.currentTarget.getBoundingClientRect();
  host.quick.act(id, Math.round(r.left), Math.round(r.bottom + 2));
};
function button(b, cls) {
  const x = el("button", { type: "button", className: (cls || "") + (b.sub ? " sub-btn" : ""), role: "menuitem" }, icon(b.icon), el("span", { className: b.sub ? "sub" : "", textContent: b.label }));
  x.addEventListener("click", act(b.id));
  return x;
}

// The faces on "On my desktop": the app's own preview stickers (web/deco), the same as Settings' preview.
const FACES = { pair: ["preview-milk-25d9980b.webp", "preview-love-3e1da30c.webp"], together: ["together-17.webp"], milk: ["preview-milk-25d9980b.webp"], love: ["preview-love-3e1da30c.webp"], others: ["muv-cartoon.webp"] };

function draw(m) {
  const qp = document.getElementById("qp");
  const name = el("span", { className: "n" + (m.name ? "" : " none"), textContent: m.name || m.nameHint, title: m.nameTip });
  name.addEventListener("click", act("name"));
  const sw = m.switchLabel ? el("button", { type: "button", className: "chip", textContent: m.switchLabel + " ▾" }) : null;
  sw?.addEventListener("click", act("switch"));
  const pomo = m.pomo ? el("button", { type: "button", className: "pomo", textContent: m.pomo }) : null;
  pomo?.addEventListener("click", act("pomo"));
  // Who's on the desktop: little faces to pick, the name, and a line of how it works.
  const cur = (m.whoOpts || []).find(([k]) => k === m.who);
  const who = m.whoOpts ? el("div", { className: "who" },
    el("span", { className: "lbl", textContent: m.whoTitle }),
    el("div", { className: "faces", role: "radiogroup", "aria-label": m.whoTitle }, m.whoOpts.map(([k, label]) => {
      const b = el("button", { type: "button", className: "face" + (FACES[k].length > 1 ? " two" : ""), role: "radio", title: label, "aria-label": label, "aria-checked": String(k === m.who) },
        FACES[k].map((f) => el("img", { src: "deco/" + f, alt: "" })));
      b.addEventListener("click", act("who:" + k));
      return b;
    })),
    el("span", { className: "who-name" }, el("b", { textContent: cur ? cur[1] : "" }), el("span", { textContent: " · " + m.whoHint }))) : null;
  qp.replaceChildren(...[
    el("div", { className: "top" }, el("b", { textContent: m.time }), el("span", { textContent: m.timeLabel })),
    pomo,
    el("div", { className: "task" }, name, sw),
    el("div", { className: "big" }, m.big.map((b) => button(b))),
    who,
    el("div", { className: "row" }, m.small.map((b) => button(b)))].filter(Boolean));
  requestAnimationFrame(() => host.quick.size(Math.ceil(document.body.getBoundingClientRect().height)));
}

host.onCommand((cmd, arg) => { if (cmd === "quick") draw(arg); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") host.quick.act("close"); });
host.quick.ready();
