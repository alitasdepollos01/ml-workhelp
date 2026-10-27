// Simple line icons for the left menu and the Settings groups (in place of emoji). Each is a few
// strokes on a 24×24 grid, in the text's colour. Made with DOM calls, not innerHTML, for the CSP.

const NS = "http://www.w3.org/2000/svg";
const P = {
  today: ["M4 6.5h16v13.5H4z", "M4 10.5h16", "M8.5 3.5v4", "M15.5 3.5v4", "M8 14.5h3"],
  reminders: ["M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2H4.5z", "M10 21h4"],
  week: ["M5 20V12", "M10 20V6", "M15 20v-9", "M20 20V9", "M3 20.5h18"],
  settings: ["M4 7h9", "M17 7h3", "M4 17h3", "M11 17h9", "M15 5v4", "M9 15v4"],
  stickers: ["M6 4h8l4 4v12H6z", "M14 4v4h4", "M9.5 13.5a2.5 2.5 0 0 0 5 0"],
  credits: ["M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"],
  help: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6", "M12 17.2v.1"],
  look: ["M12 3.5a8.5 8.5 0 0 0 0 17c1.2 0 1.7-.8 1.4-1.8-.4-1.2.3-2.2 1.6-2.2H17a3.5 3.5 0 0 0 3.5-3.5c0-5.3-3.8-9.5-8.5-9.5z", "M8 10.5v.1", "M12 7.5v.1", "M16 10.5v.1"],
  buddy: ["M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17z", "M9 10v.1", "M15 10v.1", "M8.5 14a4 4 0 0 0 7 0"],
  keep: ["M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17z", "M12 7.5V12l3 2"],
  rem: ["M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2H4.5z", "M10 21h4"],
  cats: ["M3.5 7V5.5h6l2 2h9v11h-17z", "M3.5 10.5h17"],
  about: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 11v5.5", "M12 7.5v.1"],
  // (1.3.0) a pin: the nav's Fan corner › Pins and the Settings › Pins tile (pins-common.js ICON.pin)
  pins: ["M12 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 1 0 0-11", "M9.2 18.5 8 22l4-1.6 4 1.6-1.2-3.5", "M10 8a2.4 2.4 0 0 1 2-1.4"],
};

/** An icon by name (see P), or nothing if there isn't one. */
export function icon(name, cls = "ico") {
  const d = P[name];
  if (!d) return null;
  const svg = document.createElementNS(NS, "svg");
  for (const [k, v] of Object.entries({ viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.7", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true", class: cls })) svg.setAttribute(k, v);
  for (const p of d) { const path = document.createElementNS(NS, "path"); path.setAttribute("d", p); svg.append(path); }
  return svg;
}
