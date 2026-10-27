import { host } from "./host.js";
import { L } from "./i18n.js";
import { Deck, deckOptions, known } from "./deck.js";
import { Polaroid } from "./polaroid.js";
import { DevBuddies } from "./dev-buddies.js";
import { DeskBuddies } from "./desk-buddy.js";
import { Alarm, formatClock, formatLeft, message, unlockSound, playSound } from "./alarm.js";
import { record, summary, today } from "./stats.js";

const $ = (id) => document.getElementById(id);

function notice(lines) {
  const n = $("notice");
  n.replaceChildren(...lines.map((line) => {
    const p = document.createElement("p");
    for (const part of line) {
      if (typeof part === "string") p.append(part);
      else { const c = document.createElement("code"); c.textContent = part.code; p.append(c); }
    }
    return p;
  }));
  n.hidden = false;
}

/** A <select> backed by a saved setting. */
function setting(id, key, fallback, apply) {
  const sel = $(id);
  const saved = String(host.load(key, fallback));
  sel.value = [...sel.options].some((o) => o.value === saved) ? saved : String(fallback);
  apply(Number(sel.value));
  sel.addEventListener("change", () => {
    host.save(key, Number(sel.value));
    apply(Number(sel.value));
  });
}

async function main() {
  document.body.classList.add("mode-" + host.mode, "host-" + host.name);
  // Sound needs one click on the page before an alarm can chime.
  document.addEventListener("pointerdown", unlockSound, { once: true });

  let lib;
  try {
    lib = await host.library();
  } catch (err) {
    notice([
      ["The photos and cards couldn't be loaded. ", String(err.message || err)],
      ["In a browser, start the page with ", { code: "python3 app/serve.py" }, " and open the address it prints."],
    ]);
    return;
  }

  // Cards you said you know come up much less often (deck.js).
  const loadKnown = () => { known.clear(); for (const th of host.load("known", [])) known.add(th); };
  loadKnown();

  /** "Today: 2 focus rounds (50 min) · 14 words" under the buttons. */
  function showToday() {
    const text = summary(today(host));
    $("today").hidden = !text;
    $("today").textContent = text ? "Today: " + text : "";
  }

  const photos = lib.photos || [];
  const stickers = lib.stickers || {};
  // The buddies leave out the stickers switched off in Settings (all of a set off: they use them all after all).
  const off = new Set(lib.buddyOff || []);
  const buddyStickers = Object.fromEntries(Object.entries(stickers).map(([set, list]) => {
    const kept = list.filter((s) => !off.has(`${set}/${decodeURIComponent(s.url.split("/").pop())}`));
    return [set, kept.length ? kept : list];
  }));
  const buddyMode = host.mode === "buddy";

  // Deck menu
  const options = deckOptions(lib);
  let choice = host.load("deck", "all");
  if (!options.some((o) => o.value === choice)) choice = "all";
  const deckSel = $("deck");
  const groups = new Map();
  for (const o of options) {
    let parent = deckSel;
    if (o.group) {
      if (!groups.has(o.group)) { const g = document.createElement("optgroup"); g.label = o.group; deckSel.append(g); groups.set(o.group, g); }
      parent = groups.get(o.group);
    }
    parent.append(new Option(o.label, o.value, false, o.value === choice));
  }
  // Song lines are too long for a bubble, so the buddies use the matching word cards.
  // (Settings → Thai words off: no deck, so no word bubbles)
  let thaiOn = true;
  const bubbleDeck = (c) => (thaiOn ? new Deck(lib, c === "lines" ? "all" : c) : null);

  // Buddy windows only: the development buddies (around the screen edges) and
  // the desktop buddy (wandering), each on its own layer so either can be hidden.
  const layer = (name) => {
    const d = document.createElement("div");
    d.className = "layer " + name;
    d.hidden = true;
    $("ground").append(d);
    return d;
  };
  const pose = Number(host.load("pose", 120));
  const dev = buddyMode && DevBuddies.available(stickers)
    ? new DevBuddies(layer("dev-layer"), { stickers: buddyStickers, deck: bubbleDeck(choice), host, poseSeconds: pose }) : null;
  const desk = buddyMode && DeskBuddies.available(stickers)
    ? new DeskBuddies(layer("desk-layer"), { stickers: buddyStickers, deck: bubbleDeck(choice), host, poseSeconds: pose,
      who: host.load("deskWho", "pair"), breakEvery: Number(host.load("breakEvery", 50)), pace: host.load("deskPace", "calm") }) : null;
  const allBuddies = [dev, desk].filter(Boolean);
  const buddies = { closeBubble: () => allBuddies.forEach((b) => b.closeBubble()) };

  // The desktop buddy is out in another window (it holds up alarms instead).
  let deskElsewhere = false;

  /** Show or hide each kind of buddy; hidden development buddies keep their place. */
  function showSystems({ desk: wantDesk, dev: wantDev, devRect, deskOut }) {
    if (dev && devRect !== undefined) fitDevLayer(devRect);
    if (deskOut !== undefined) deskElsewhere = !!deskOut;
    for (const [sys, want] of [[desk, wantDesk], [dev, wantDev]]) {
      if (!sys || want === undefined) continue;
      sys.stage.hidden = !want; // shown before starting, so the stickers can be measured
      sys.paused = !want;
      if (want && !sys.running) sys.start();
      if (!want && sys === desk && sys.running) sys.stop();
    }
  }

  /**
   * The development buddies walk the edges of their layer: the editor window's
   * rectangle within this screen ({ x, y, width, height }), or the whole screen (null).
   */
  function fitDevLayer(r) {
    const st = dev.stage.style;
    if (r) {
      st.inset = "auto";
      st.left = r.x + "px";
      st.top = r.y + "px";
      st.width = r.width + "px";
      st.height = r.height + "px";
    } else {
      st.inset = st.left = st.top = st.width = st.height = "";
    }
  }

  /** "nap": you've been away a while; "sleep": the screen is locked (also stop animating); null: you're back. */
  function rest(state) {
    dev?.setResting(!!state);
    desk?.setRest(state);
    for (const b of allBuddies) b.asleep = state === "sleep";
    document.body.classList.toggle("asleep", state === "sleep");
  }

  document.addEventListener("click", () => buddies.closeBubble());
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    buddies.closeBubble();
    showOptions(false);
  });

  // Options: folded away under the photo; each section opens on its own.
  function showOptions(on, section) {
    $("options").hidden = !on;
    $("options-toggle").setAttribute("aria-expanded", String(on));
    if (on && section) $(section).open = true;
  }
  $("options-toggle").addEventListener("click", () => showOptions($("options").hidden));
  $("alarm-chip").addEventListener("click", () => showOptions(true, "alarm-pop"));

  // Settings changed in another window (desktop buddy windows, a second VS Code view).
  addEventListener("storage", (e) => {
    if (!e.key) return;
    if (e.key.endsWith(":pose")) allBuddies.forEach((b) => b.setPoseInterval(Number(host.load("pose", 120))));
    if (e.key.endsWith(":deck")) allBuddies.forEach((b) => b.setDeck(bubbleDeck(host.load("deck", "all"))));
    if (e.key.endsWith(":deskWho")) desk?.setWho(host.load("deskWho", "pair"));
    if (e.key.endsWith(":breakEvery")) desk?.setBreakEvery(Number(host.load("breakEvery", 50)));
    if (e.key.endsWith(":known")) loadKnown();
    if (e.key.endsWith(":today")) showToday();
  });

  /** A word card from whichever buddy is showing (the desktop buddy first). */
  function teach() {
    setTimeout(() => {
      if (desk?.running && desk.members.length) desk.members[0].say("A word for your break", performance.now());
      else if (dev?.running && dev.list.length) dev.toggleBubble(dev.list[0]);
    }, 350); // after the alarm bubble has gone
  }

  let moodPrefs = { focus: "usual", break: "lively" }; // (Settings: the buddies during a Pomodoro round)
  const alarm = new Alarm(host, (state) => showAlarm(state));
  let wasRinging = false;
  const baseTitle = document.title;

  let lastReport = "";
  function showAlarm(s) {
    const ringing = !!s?.ringing;
    // Tell the host only when something other than the clock changed.
    const report = JSON.stringify(s);
    if (report !== lastReport) { lastReport = report; host.report("alarm", s); }
    const msg = s ? message(s) : null;

    // Ringing: banner (panel), jumping buddies, tab title
    if (ringing !== wasRinging) {
      wasRinging = ringing;
      document.title = ringing ? "⏰ " + msg.title : baseTitle;
      $("ringer").hidden = !ringing || buddyMode;
      if (ringing) {
        $("ringer-title").textContent = msg.title;
        $("ringer-body").textContent = s.kind === "focus" ? msg.body : s.label || "";
        showToday();
        $("ringer-snooze").hidden = s.kind === "focus" && !s.waiting;
        $("ringer-snooze").textContent = s.waiting ? L("5 more min", "再 5 分鐘") : L("Snooze 5 min", "5 分鐘後再響");
        $("ringer-stop").textContent = s.waiting ? L("Back to work", "回去工作") : s.kind === "focus" ? L("OK", "好") : L("Stop", "停止");
        // Buddy windows have no banner, so a bubble carries the buttons: the
        // desktop buddy's if it's out, otherwise a development buddy's.
        const ring = {
          title: msg.title,
          body: s.kind === "focus" ? msg.body : s.label || msg.body,
          actions: s.kind === "focus" && s.waiting
            // A break that ran out: the next round waits for "Back to work" (the desktop app's way, so the work clock goes along).
            ? [{ label: L("Back to work", "回去工作"), run: () => (host.work ? host.work.act("back-next") : alarm.skip()) },
              { label: L("5 more min", "再 5 分鐘"), run: () => alarm.moreRest(5) }]
            : s.kind === "focus"
            ? [
              // A break is a good moment for a word.
              ...(s.phase !== "focus" && thaiOn ? [{ label: L("Teach me a word", "教我一個單字"), run: () => { alarm.stop(); teach(); } }] : []),
              { label: L("OK", "好"), run: () => alarm.stop() },
            ]
            : [{ label: L("Snooze 5 min", "5 分鐘後再響"), run: () => alarm.snooze() }, { label: L("Stop", "停止"), run: () => alarm.stop() }],
        };
        const deskOut = (desk?.running && !desk.stage.hidden) || deskElsewhere;
        desk?.ring({ ...ring, bubble: true });
        dev?.ring({ ...ring, bubble: !deskOut });
        // A focus-timer phase change doesn't need dismissing (a round waiting for you does: it asks until you answer).
        if (s.kind === "focus" && !s.waiting) setTimeout(() => { if (alarm.state?.ringing && !alarm.state.waiting) alarm.stop(); }, 20e3);
      } else {
        allBuddies.forEach((b) => b.unring());
      }
    }

    // A Pomodoro round: as you set it (Settings → Desktop buddy). By default they carry on as usual
    // while you focus, and liven up on the break.
    const paused = s?.pausedLeft != null;
    const prefs = { ...moodPrefs, ...(desk?.work?.focusMood ? { focus: desk.work.focusMood, break: desk.work.breakMood } : {}) };
    const mood = s?.kind === "focus" && !paused
      ? (s.phase === "focus" ? { calm: "focus", hide: "hide" }[prefs.focus] || null : prefs.break === "usual" ? null : "break") : null;
    for (const b of allBuddies) b.setMood(mood);

    // The Alarm section (and a chip next to Options) shows the countdown; the section shows what's set.
    const pop = $("alarm-pop");
    pop.classList.toggle("running", !!s && !ringing);
    pop.classList.toggle("paused", paused);
    $("alarm-chip").hidden = !s || ringing;
    $("alarm-chip").classList.toggle("paused", paused);
    $("focus-quick").hidden = !!s;
    $("alarm-set").hidden = !!s;
    $("alarm-running").hidden = !s;
    if (!s) {
      $("alarm-summary").textContent = "Focus timer and alarm";
      desk?.setStatus("");
      return;
    }
    const left = formatLeft(Alarm.left(s));
    const what = s.kind !== "focus" ? L("Alarm", "鬧鐘") : s.phase === "focus" ? L("Focus", "專注") : s.phase === "long" ? L("Long break", "長休息") : L("Break", "休息");
    const icon = paused ? "⏸" : s.kind !== "focus" ? "⏰" : s.phase === "focus" ? "🎯" : "☕";
    $("alarm-summary").textContent = ringing ? "Ringing" : `${what} ${left}${paused ? " (paused)" : ""}`;
    $("alarm-chip").textContent = `${icon} ${left}`;
    $("alarm-chip").title = `${what}: ${left} left${paused ? " (paused)" : ""}`;
    desk?.setStatus(ringing ? "" : `${icon} ${what} ${left}`);
    const status = $("alarm-status");
    status.replaceChildren();
    const b = document.createElement("b");
    b.textContent = left;
    if (paused) {
      status.append(`${what}${s.kind === "focus" ? `, round ${s.round}` : ""}: paused with `, b, " left.");
    } else if (s.kind === "focus") {
      status.append(`${what}, round ${s.round}: `, b, ` left (until ${formatClock(s.endsAt)}).`);
    } else {
      status.append(`Rings at ${formatClock(s.endsAt)}, in `, b, ".");
    }
    if (s.label) status.append(document.createElement("br"), s.label);
    $("alarm-pause").hidden = !Alarm.canPause(s);
    $("alarm-pause").textContent = paused ? "Resume" : "Pause";
    $("alarm-skip").hidden = s.kind !== "focus";
    $("alarm-skip").textContent = s.phase === "focus" ? L("Take my break now", "現在就休息") : L("End the break", "休息結束");
    $("alarm-cancel").textContent = s.kind === "focus" ? L("End the Pomodoro", "結束番茄鐘") : L("Cancel alarm", "取消鬧鐘");
  }

  $("ringer-stop").addEventListener("click", () => (alarm.state?.waiting ? (host.work ? host.work.act("back-next") : alarm.skip()) : alarm.stop()));
  $("ringer-snooze").addEventListener("click", () => (alarm.state?.waiting ? alarm.moreRest(5) : alarm.snooze()));
  const label = () => $("alarm-label").value.trim();
  // Started: fold the section away and clear the label for next time.
  const closeAlarmPanel = () => { $("alarm-pop").open = false; $("alarm-label").value = ""; };
  for (const chip of document.querySelectorAll(".chips button")) {
    chip.addEventListener("click", () => { alarm.inMinutes(Number(chip.dataset.min), label()); closeAlarmPanel(); });
  }
  $("alarm-min-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const min = Number($("alarm-min").value);
    if (min > 0) { alarm.inMinutes(min, label()); closeAlarmPanel(); }
  });
  $("alarm-time-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if ($("alarm-time").value) { alarm.atTime($("alarm-time").value, label()); closeAlarmPanel(); }
  });
  // Focus timer lengths are remembered.
  const focusLen = (id, key, fallback) => setting(id, key, fallback, () => {});
  focusLen("focus-len", "focusLen", 25);
  focusLen("break-len", "breakLen", 5);
  focusLen("long-len", "longLen", 15);
  const startFocus = (l = "") => alarm.focusTimer(Number(host.load("focusLen", 25)), Number(host.load("breakLen", 5)), l,
    Number(host.load("longLen", 15)));
  $("focus-go").addEventListener("click", () => { startFocus(); closeAlarmPanel(); });
  $("focus-quick").addEventListener("click", () => startFocus());
  const showFocusLen = () => { $("focus-quick").textContent = `Focus ${host.load("focusLen", 25)} min`; };
  showFocusLen();
  $("focus-len").addEventListener("change", showFocusLen);
  $("alarm-cancel").addEventListener("click", () => alarm.cancel());
  $("alarm-pause").addEventListener("click", () => (alarm.state?.pausedLeft != null ? alarm.resume() : alarm.pause()));
  $("alarm-skip").addEventListener("click", () => alarm.skip());

  // The desktop app's "Buddy size": both kinds of buddy scale from their usual height.
  function setSize(size) {
    if (!(size >= 0.5 && size <= 2)) return;
    const root = document.documentElement.style;
    root.setProperty("--desk-h", `${Math.round(152 * size)}px`);
    root.setProperty("--dev-h", `${Math.round(90 * size)}px`);
    requestAnimationFrame(() => { desk?.resize(); dev?.resize(); });
  }

  let polaroid = null;
  host.onCommand((cmd, arg) => {
    if (cmd === "alarm-stop") alarm.stop();
    else if (cmd === "alarm-snooze") alarm.snooze();
    else if (cmd === "alarm-cancel") alarm.cancel();
    else if (cmd === "alarm-in") alarm.inMinutes(Number(arg), "");
    else if (cmd === "focus-start") startFocus();
    else if (cmd === "pomo-start") alarm.focusTimer(Number(arg?.focus) || 25, Number(arg?.rest) || 5, "", Number(arg?.long) || 15, Number(arg?.every) || 4, arg?.autoNext === true);
    else if (cmd === "alarm-more") alarm.moreRest(Number(arg) || 5);
    else if (cmd === "alarm-auto-next") alarm.setAutoNext(arg === true);
    else if (cmd === "moods") { moodPrefs = { ...moodPrefs, ...(arg || {}) }; showAlarm(alarm.state); }
    else if (cmd === "alarm-pause") alarm.pause();
    else if (cmd === "alarm-resume") alarm.resume();
    else if (cmd === "alarm-skip") alarm.skip();
    else if (cmd === "alarm-sync") alarm.adopt(arg);
    else if (cmd === "ring-sound") playSound(arg?.sound, arg?.volume);
    else if (cmd === "next-photo") polaroid?.advance();
    else if (cmd === "systems") showSystems(arg || {});
    else if (cmd === "rest") rest(arg);
    else if (cmd === "desk-who") { host.save("deskWho", arg); desk?.setWho(arg); }
    else if (cmd === "desk-shift") desk?.setShift(arg);
    else if (cmd === "break-every") { host.save("breakEvery", Number(arg)); desk?.setBreakEvery(Number(arg)); }
    else if (cmd === "desk-shuffle") desk?.shuffle();
    else if (cmd === "size") setSize(Number(arg));
    else if (cmd === "desk-merge") desk?.setMerge(arg);
    else if (cmd === "desk-pace") { host.save("deskPace", arg); desk?.setPace(arg); }
    else if (cmd === "stk-look") { document.documentElement.dataset.stkEdge = arg?.edge || "thin"; document.documentElement.dataset.stkShadow = arg?.shadow || "soft"; }
    else if (cmd === "work") desk?.setWork(arg);
    else if (cmd === "thai") { thaiOn = arg !== false; allBuddies.forEach((b) => b.setDeck(bubbleDeck(host.load("deck", "all")))); }
    else if (cmd === "work-break") desk?.holdUp({ kind: "break" }, L("Time for a break", "該休息了"), arg?.body || "",
      [[L("In 10 min", "10 分鐘後"), "snooze-break"], [L("Taking one", "去休息囉"), "start-break", 10]], arg?.word);
    else if (cmd === "work-break-over") desk?.holdUp({ kind: "break" }, "Break's over", arg?.body || "",
      [[L("Back to work", "回去工作"), "end-break"], [L("5 more min", "再 5 分鐘"), "start-break", 5]]);
    else if (cmd === "work-reminder") desk?.holdUp({ kind: "reminder", id: arg?.id }, "Reminder", arg?.body || "",
      [[L("Done", "完成"), "reminder-done"], [L("In 10 min", "10 分鐘後"), "reminder-snooze"]], arg?.word);
    else if (cmd === "work-held") desk?.holdUp({ kind: "held" }, L("While you were focusing", "專注的時候"), arg?.body || "", [[L("Got it", "知道了"), null]]);
    else if (cmd === "work-update") desk?.holdUp({ kind: "update" }, arg?.title || "", arg?.body || "",
      [[L("Get it", "去下載"), "update-get"], [L("Later", "之後再說"), null]]);
    else if (cmd === "work-update-close") desk?.holdUp({ kind: "update" }, arg?.title || "", arg?.body || "",
      [[L("Close ML WorkHelp", "關掉 ML WorkHelp"), "update-quit"], [L("Not yet", "還不要"), null]]);
    else if (cmd === "work-goal") desk?.celebrate(arg || {});
    else if (cmd === "work-done") desk?.doneForToday(arg || {});
    else if (cmd === "work-away") askAway(arg || {});
    else if (cmd === "work-eye") {
      desk?.holdUp({ kind: "eye" }, L("Eye rest", "讓眼睛休息"), arg?.body || "", [[L("Done", "完成"), "eye-done"], [L("Skip", "略過"), null]]);
      setTimeout(() => desk?.answered({ kind: "eye" }), 25e3); // twenty seconds, and it goes by itself
    } else if (cmd === "work-name-ask") {
      desk?.holdUp({ kind: "name" }, L("What are you working on?", "你在做什麼？"), L("Name it, and Data shows where your time went.", "取個名字，「數據」就能告訴你時間都花去哪了。"),
        [...(arg?.recent || []).map((n) => [n, "switch", n]), [L("Something new…", "換件新的事⋯"), "name-new"], [L("Not now", "等等再說"), null]]);
    }
    else if (cmd === "work-start-ask") {
      // The day's first question: start the clock now (and maybe say what today is about)?
      desk?.holdUp({ kind: "start" }, arg?.line || L("Ready to start?", "準備好開始了嗎？"), L("The clock starts when you press Start.", "按下「開始」才會計時。"),
        [[L("Let's start!", "開始！"), "start-day"], [L("Today's focus first…", "先寫本日主題⋯"), "start-day-theme"],
          [L("Ask me in 10 min", "10 分鐘後再問我"), "start-later"], [L("Not today", "今天不計時"), "skip-day"]]);
    }
    // New photos (main.js askPhotos, content-updates.js): Get them / Later / Don't ask again (the last button is the main one)
    else if (cmd === "content-photos") desk?.holdUp({ kind: "photos" }, arg?.title || "", arg?.body || "", (arg?.buttons || []).map(([label, action]) => [label, action]));
    else if (cmd === "content-photos-said") { desk?.answered({ kind: "photos" }); desk?.holdUp({ kind: "photos-said" }, arg?.title || "", arg?.body || "", [[L("Got it", "知道了"), null]]); }
    else if (cmd === "work-answered") desk?.answered(arg || {});
    else if (cmd === "buddy-state") showBuddyState(arg || {});
  });

  // The panel's buddy buttons (VS Code and the desktop app's own panel): they
  // switch the desktop app's buddies, which answers with "buddy-state".
  const toggles = { desk: $("desk-toggle"), dev: $("dev-toggle") };
  let hiddenUntil = 0;
  function showBuddyState(state) {
    for (const [kind, button] of Object.entries(toggles)) {
      if (typeof state[kind] === "boolean") button.setAttribute("aria-pressed", String(state[kind]));
    }
    // Hidden for a while (a meeting): say until when, and offer them back.
    hiddenUntil = state.hiddenUntil > Date.now() ? state.hiddenUntil : 0;
    const hide = $("hide-toggle");
    hide.textContent = hiddenUntil ? `Hidden until ${formatClock(hiddenUntil)}: show them now` : "Hide them for an hour";
    hide.setAttribute("aria-pressed", String(!!hiddenUntil));
    hide.hidden = !hiddenUntil && !state.desk && !state.dev;
  }
  if (host.canSetBuddies && !buddyMode) {
    $("buddy-row").hidden = false;
    // The development buddies are VS Code's: the desktop app's own window doesn't offer them.
    toggles.dev.hidden = host.name === "electron";
    for (const [kind, button] of Object.entries(toggles)) {
      button.addEventListener("click", () => {
        const on = button.getAttribute("aria-pressed") !== "true";
        button.setAttribute("aria-pressed", String(on)); // straight away; the host confirms
        host.setBuddies(kind, on);
      });
    }
    $("hide-toggle").addEventListener("click", () => host.setBuddies("hide", hiddenUntil ? 0 : 60));
  }
  // For tests and poking around in DevTools.
  window.__mlwh = { dev, desk, alarm };

  /** Back after time away without saying: what was it? (A kind of break, or work: reading, thinking.) */
  function askAway({ id, body }) {
    const kinds = [[L("🚽 Toilet", "🚽 上廁所"), "toilet"], [L("☕ Coffee", "☕ 咖啡"), "coffee"], [L("🍜 Meal", "🍜 吃飯"), "meal"], [L("🎮 Fun", "🎮 娛樂"), "fun"], [L("📖 Was working", "📖 其實在工作"), "work"]];
    desk?.holdUp({ kind: "away", id }, L("Welcome back! What was that?", "歡迎回來！剛剛去做什麼呀？"), body || "",
      [...kinds.map(([label, kind]) => [label, "label-away", `${id}:${kind}`]), [L("Skip", "略過"), null]]);
  }

  if (!buddyMode) host.report("ready", true); // the host may now send "buddy-state"

  if (buddyMode) {
    showSystems(host.systems);
    host.report("ready", true); // the host may now send "systems" changes
    return;
  }

  if (host.workClock) {
    // The desktop app: no photo card. This page only keeps the alarm (its window is never shown).
  } else if (!photos.length) {
    notice([
      ["Add photos to ", { code: (lib.photoFolder || "~/Pictures/ML_WorkHelp") + "/shuffle" }, " and reload."],
    ]);
  } else {
    polaroid = new Polaroid($("polaroid"), {
      photos,
      deck: new Deck(lib, choice),
      onFlip: (on) => { if (on && polaroid.card) { record(host, { word: polaroid.card.th }); showToday(); } },
      onKnow: (card, on) => {
        if (on) known.add(card.th);
        else known.delete(card.th);
        host.save("known", [...known]);
      },
    });
    $("polaroid").hidden = false;
    polaroid.advance();
    setting("interval", "interval", 45, (sec) => polaroid.setInterval(sec));
    $("next").addEventListener("click", () => polaroid.advance());
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" && !e.target.closest?.("select, input, details")) polaroid.advance();
    });
    deckSel.addEventListener("change", () => {
      choice = deckSel.value;
      host.save("deck", choice);
      polaroid.setDeck(new Deck(lib, choice));
    });
  }

  // The panel is the photo shuffle only; the buddies live on the desktop. Their
  // pose setting is here for the desktop app (and the browser's buddy view).
  if (host.name === "vscode" || !DevBuddies.available(stickers)) $("pose").closest("label").hidden = true;
  else setting("pose", "pose", 120, () => {});
  $("ground").hidden = true;
  $("controls").hidden = false;
  showToday();
  if (!photos.length) $("next").hidden = true;
}

main();
