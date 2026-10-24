// The one place that knows where the UI is running.
//
// Browser: talks to app/serve.py over HTTP and keeps settings in localStorage.
// VS Code / Electron: load a script before main.js that sets window.MLHost:
//
//   window.MLHost = {
//     name: "vscode" | "electron",
//     mode: "panel" | "buddy",            // optional; default from ?mode=
//     library: async () => ({ decks, lyrics, photos, stickers }),
//     load: (key) => value | undefined,   // optional settings storage
//     save: (key, value) => void,
//     setInteractive: (on) => void,       // buddy window: catch clicks or let them through
//     notify: (title, body, actions) => void,  // system notification; actions: ["snooze", "stop"]
//     onCommand: (fn) => void,            // host -> page: fn("next-photo" | "alarm-stop" | ...)
//     report: (type, data) => void,       // page -> host: report("alarm", state) for a status bar
//     dragWindow: (phase) => void,        // optional: "start" / "end" moving the page's window with the mouse
//     menu: (kind) => void,               // optional: right-click menu for a buddy ("dev" | "desk")
//     setBuddies: (kind, on) => void,     // optional: turn "desk" / "dev" buddies on, off or "toggle";
//                                         //   the host answers with the "buddy-state" command { desk, dev }
//     claimRing: (key) => bool | Promise, // optional: true if this view should chime for that ring
//                                         //   (VS Code and the desktop app share one alarm)
//     work: { status, act, addReminder, removeReminder, setting }, // optional: the desktop app's work
//                                         //   clock and reminders; it sends "work" commands with the status
//   };
//
// Buddy windows (?mode=buddy) also read ?desk=1&dev=1: show the desktop buddy
// and/or the development buddies. The host can change that later with the
// "systems" command, once the page has reported "ready". ?win=desk means the
// window holds only the desktop buddy, and dragging it moves the window.
//
// `library()` returns the shape app/serve.py builds; image URLs must already be
// loadable by the page (webview URIs in VS Code, a custom protocol in Electron).

const ext = window.MLHost || null;
const params = new URLSearchParams(location.search);

function localGet(key) {
  try {
    const v = localStorage.getItem("mlwh:" + key);
    return v == null ? undefined : JSON.parse(v);
  } catch {
    return undefined;
  }
}

function localSet(key, value) {
  try {
    localStorage.setItem("mlwh:" + key, JSON.stringify(value));
  } catch {
    // Private windows and some webviews refuse storage; settings just won't stick.
  }
}

// Buddy windows let clicks through except over a buddy, its bubble or label
// (the children of a .layer). Pointer enter/leave alone isn't enough: on
// Windows, switching a window between catching and passing clicks fires
// stray leave events, and a click that lands in that moment goes to the
// desktop underneath. So every pointer move checks what's under it, and a
// "leave" while still over a buddy is ignored. (On Windows the page gets no
// moves at all while it lets clicks through: the app sends the pointer's
// place itself, the "pointer" command.)
let interactive = null;
let pointer = null;
const overBuddy = (p) => !!p && !!document.elementFromPoint(p.x, p.y)?.closest(".layer > *");

function askInteractive(on) {
  if (on === interactive) return;
  interactive = on;
  ext?.setInteractive?.(on);
}

if (ext?.setInteractive && (params.get("mode") || ext.mode) === "buddy") {
  document.addEventListener("pointermove", (e) => {
    pointer = { x: e.clientX, y: e.clientY };
    askInteractive(overBuddy(pointer));
  }, { capture: true, passive: true });
  askInteractive(false);
}

export const host = {
  name: ext?.name || "browser",
  mode: params.get("mode") || ext?.mode || "panel",
  // Buddy windows: which buddies to show (?desk=1&dev=1); both if neither is given.
  systems: params.has("desk") || params.has("dev")
    ? { desk: params.get("desk") === "1", dev: params.get("dev") === "1" }
    : { desk: true, dev: true },
  /** The desktop buddy has a window of its own, which it moves when dragged. */
  deskWindow: params.get("win") === "desk" && !!ext?.dragWindow,
  /** The panel can switch the desktop app's buddies on and off. */
  canSetBuddies: !!ext?.setBuddies,
  /** The host keeps the work clock and reminders (the desktop app): the page shows them. */
  workClock: !!ext?.work,
  /** The desktop app's work clock and reminders (see app/desktop/preload.js), or null. */
  work: ext?.work || null,

  async library() {
    if (ext?.library) return ext.library();
    const res = await fetch("api/library", { cache: "no-store" });
    if (!res.ok) throw new Error(`The photo server answered ${res.status}.`);
    return res.json();
  },

  load(key, fallback) {
    const v = ext?.load ? ext.load(key) : localGet(key);
    return v === undefined ? fallback : v;
  },

  save(key, value) {
    if (ext?.save) ext.save(key, value);
    else localSet(key, value);
  },

  setInteractive(on) {
    askInteractive(!!on || overBuddy(pointer));
  },

  /** Ask once for notification permission (must run from a click). */
  askToNotify() {
    if (ext) return;
    try {
      if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
    } catch {
      // Older Safari wants a callback instead of a promise; skipping is fine.
    }
  },

  notify(title, body, actions = []) {
    if (ext?.notify) return ext.notify(title, body, actions);
    try {
      if ("Notification" in window && Notification.permission === "granted") new Notification(title, { body });
    } catch {
      // Notifications are a bonus; the page itself still shows the alarm.
    }
  },

  /** Commands from the host (menus, status bar, notification buttons). */
  onCommand(fn) {
    ext?.onCommand?.((command, arg) => {
      if (command !== "pointer") return fn(command, arg);
      pointer = arg ? { x: arg.x, y: arg.y } : null;
      askInteractive(overBuddy(pointer));
    });
  },

  report(type, data) {
    ext?.report?.(type, data);
  },

  dragWindow(phase) {
    ext?.dragWindow?.(phase);
  },

  /** Ask for a buddy's right-click menu; false if the host has none (the browser's own then shows). */
  menu(kind, sticker = "") {
    if (!ext?.menu) return false;
    ext.menu(kind, sticker);
    return true;
  },

  setBuddies(kind, on) {
    ext?.setBuddies?.(kind, on);
  },

  claimRing(key) {
    return ext?.claimRing ? ext.claimRing(key) : true;
  },

};
