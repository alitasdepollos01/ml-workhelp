// Settings → Reminders & events: Apple Reminders and Apple Calendar (Mac), each connected
// once (macOS asks), switched on or off, and with the lists or calendars to show and where
// new ones go by default (the add form in Reminders & events can pick another each time).

import { L, el, host, clock, toast } from "./app-common.js";

const KINDS = {
  apple: {
    api: () => host.apple, title: ["Apple Reminders", "Apple 提醒事項"], list: "lists", chosen: "chosen",
    privacy: ["Reminders", "提醒事項"],
    about: ["Bring in the reminders from Apple Reminders (the ones with a time, from the lists you pick), and send the ones you add here there too, so your iPhone has them. Changes, \"done\" and removals go both ways.",
      "把 Apple 提醒事項裡有設時間的提醒（從你選的清單）帶進來，在這裡新增的也會同步過去，iPhone 上也看得到。修改、完成和刪除都會兩邊同步。"],
    on: ["On: new, changed, done and removed reminders go both ways, every minute.", "開啟中：新增、修改、完成和刪除的提醒，每分鐘會兩邊同步一次。"],
    off: ["Off: the reminders from Apple Reminders aren't shown here (they're still in Apple Reminders, untouched). The ones you made here stay. Turn it on to bring them back.",
      "已關閉：這裡不會顯示 Apple 提醒事項的提醒（它們都還在 Apple 提醒事項裡，沒被動到）。你在這裡建立的提醒會保留，再打開就會帶回來。"],
    from: ["Bring in reminders from", "從這些清單帶進來"], into: ["New reminders go to (you can change it each time)", "新提醒預設放在（每次新增時都可以改）"],
  },
  calendar: {
    api: () => host.calendar, title: ["Apple Calendar", "Apple 行事曆"], list: "calendars", chosen: "chosen",
    privacy: ["Calendars", "行事曆"],
    about: ["Show your upcoming events here, and have the buddy hold each one up a little before it starts. Calendars added to the Mac's Calendar app (iCloud, Google, Outlook…) all count. You can add events here too: they go into your calendar, and changes go both ways.",
      "接下來的活動會顯示在這裡，開始前夥伴會舉牌提醒你。Mac「行事曆」App 裡的行事曆（iCloud、Google、Outlook⋯）都可以用。也可以在這裡新增活動：會放進你的行事曆，修改也會兩邊同步。"],
    on: ["On: the coming events (two weeks unless you pick otherwise below); events you add here go into your calendar; changes go both ways, every minute. An event is only deleted from your calendar when you say so.",
      "開啟中：顯示接下來的活動（預設 2 週，可以在下面改）；這裡新增的活動會放進你的行事曆，修改每分鐘會兩邊同步一次。只有在你選擇刪除時，才會從行事曆刪掉活動。"],
    off: ["Off: the events from your calendar aren't shown here and don't remind you (they're still in your calendar, untouched). Events you added here stay. Turn it on to bring them back.",
      "已關閉：這裡不會顯示行事曆的活動，也不會提醒（活動都還在你的行事曆裡，沒被動到）。你在這裡新增的活動會保留，再打開就會帶回來。"],
    from: ["Show events from", "顯示這些行事曆的活動"], into: ["New events go to (you can change it each time)", "新活動預設放在（每次新增時都可以改）"],
  },
};
const info = {}, at = {};

/** What's known about both (for the add form's "Put it in"): { apple, calendar }, asked again every half minute. */
export async function connections() {
  await Promise.all(Object.keys(KINDS).map(async (k) => {
    if (info[k] && Date.now() - at[k] < 30e3) return;
    at[k] = Date.now();
    try { info[k] = await KINDS[k].api()?.("status"); } catch { info[k] = { mac: false }; }
  }));
  return { apple: info.apple, calendar: info.calendar };
}
export const known = () => ({ apple: info.apple, calendar: info.calendar });
let calHelpOpen = false;
/** Open the calendar card's "can't see some events?" the next time it's drawn (Reminders' link to it). */
export const openCalHelp = () => { calHelpOpen = true; };

/** Can't see some events? What to check: here, then the Mac's own Calendar and its accounts. */
function calHelp(api, btn) {
  const li = (...kids) => el("li", {}, ...kids);
  const d = el("details", { className: "help cal-help", open: calHelpOpen },
    el("summary", { textContent: L("Can't see some events?", "看不到某些活動？") }),
    el("div", { className: "body" },
      el("ol", {},
        li(L("Check that its calendar is ticked above.", "確認上面有勾選那個行事曆。")),
        li(L("All-day events (holidays, birthdays…) need \"All-day events too\" on.", "全天活動（假日、生日⋯）要打開「也包括全天活動」。")),
        li(el("b", { textContent: L("Open the Mac's Calendar app: if an event isn't there, this app can't see it either.", "打開 Mac 的「行事曆」App 看看：活動不在那裡的話，這個 App 也看不到。") }),
          el("ul", {},
            li(L("System Settings › Internet Accounts: check that the account (Google, Outlook…) has Calendars on.", "到「系統設定 › Internet 帳號」，確認那個帳號（Google、Outlook⋯）的「行事曆」有打開。")),
            li(L("Google: calendars of your own or shared with you need ticking at calendar.google.com/calendar/syncselect before the Mac syncs them.", "Google 另外建的或別人共用的行事曆，要到 calendar.google.com/calendar/syncselect 勾選，Mac 才會同步。")))),
        li(L("Then press Sync now.", "改完後按「立即同步」。"))),
      el("div", { className: "row-flex" },
        btn(L("Open Calendar", "打開「行事曆」App"), () => api("open-app")),
        btn(L("Open Internet Accounts", "打開 Internet 帳號"), () => api("accounts")),
        btn(L("Google's sync page", "Google 同步設定頁"), () => api("google-sync")))));
  calHelpOpen = false;
  return d;
}

/** The card for one of them ("apple" or "calendar"). */
export function connectCard(kind, redraw) {
  const K = KINDS[kind];
  const box = el("section", { className: `card connect-card ${kind}` });
  const draw = (a) => {
    info[kind] = a;
    const btn = (label, fn, cls = "btn small") => { const b = el("button", { type: "button", className: cls, textContent: label }); b.addEventListener("click", fn); return b; };
    const act = async (action, arg, msg) => { const r = await K.api()(action, arg); at[kind] = Date.now(); draw(r); if (msg) toast(msg); redraw?.(); };
    const connected = a?.access === "full" && (a.on || (a[K.chosen] || []).length);
    const sw = connected ? el("button", { type: "button", className: "switch" + (a.on ? " on" : ""), role: "switch", "aria-checked": String(!!a.on), "aria-label": L(K.title[0], K.title[1]) }) : null;
    sw?.addEventListener("click", () => act(a.on ? "off" : "on", null, a.on ? L("Off: nothing removed from your Mac", "已關閉，Mac 上的資料都還在") : L("On", "已開啟")));
    const parts = [el("h3", {}, el("span", { textContent: L(...K.title) }), sw)];
    if (!a?.mac) parts.push(el("p", { className: "muted", textContent: L(`${K.title[0]} works on a Mac only.`, `${K.title[1]}只能在 Mac 上使用。`) }));
    else if (["denied", "restricted", "writeOnly"].includes(a.access)) {
      parts.push(el("p", { className: "muted", textContent: L(`ML WorkHelp isn't allowed to use it. Allow it in System Settings → Privacy & Security → ${K.privacy[0]}, then come back.`, `ML WorkHelp 還沒有權限。請到「系統設定 → 隱私權與安全性 → ${K.privacy[1]}」允許它，再回到這裡。`) }),
        el("div", { className: "row-flex" }, btn(L("Open System Settings", "打開系統設定"), () => K.api()("settings")), btn(L("Check again", "再檢查一次"), () => act("status"))));
    } else if (!connected) {
      parts.push(el("p", { className: "muted", textContent: L(...K.about) }), el("div", {}, btn(L(`Connect ${K.title[0]}`, `連結${K.title[1]}`), () => act("connect", null, L("Connected", "已連結")), "btn primary small")));
    } else if (!a.on) {
      parts.push(el("p", { className: "muted", textContent: L(...K.off) }));
    } else {
      const chosen = new Set(a[K.chosen] || []), all = a[K.list] || [];
      const lists = el("div", { className: "apple-lists" }, all.map((l) => {
        const c = el("input", { type: "checkbox", checked: chosen.has(l.id) });
        c.addEventListener("change", () => { const next = all.filter((x) => (x.id === l.id ? c.checked : chosen.has(x.id))).map((x) => x.id); act("set", kind === "apple" ? { lists: next } : { cals: next }, L("Saved", "已儲存")); });
        const dot = el("i", { className: "apple-dot" });
        dot.style.background = l.color;
        return el("label", { className: "chip" + (chosen.has(l.id) ? " on" : "") }, c, dot, l.title);
      }));
      const into = el("select", { "aria-label": L(...K.into) }, all.filter((l) => l.writable !== false).map((l) => new Option(l.title, l.id)));
      into.value = a.into || "";
      into.addEventListener("change", () => act("set", { into: into.value }, L("Saved", "已儲存")));
      parts.push(el("p", { className: "muted", textContent: L(...K.on) }),
        el("div", { className: "field" }, el("span", { textContent: L(...K.from) }), lists),
        el("label", { className: "field" }, el("span", { textContent: L(...K.into) }), into));
      if (kind === "calendar") {
        const before = el("select", { "aria-label": L("Remind me", "提醒我") }, [[0, L("When it starts", "開始時")], [5, L("5 min before", "5 分鐘前")], [10, L("10 min before", "10 分鐘前")], [15, L("15 min before", "15 分鐘前")], [30, L("30 min before", "30 分鐘前")], [60, L("An hour before", "1 小時前")]].map(([v, t]) => new Option(t, String(v))));
        before.value = String(a.before ?? 10);
        before.addEventListener("change", () => act("set", { before: Number(before.value) }, L("Saved", "已儲存")));
        const allDay = el("input", { type: "checkbox", checked: !!a.allDay, "aria-label": L("All-day events too", "也包括全天活動") });
        allDay.addEventListener("change", () => act("set", { allDay: allDay.checked }, L("Saved", "已儲存")));
        const ahead = el("select", { "aria-label": L("Show events", "顯示多久以內的活動") }, [[7, L("The coming week", "接下來 1 週")], [14, L("The coming two weeks", "接下來 2 週")], [31, L("The coming month", "接下來 1 個月")]].map(([v, t]) => new Option(t, String(v))));
        ahead.value = String(a.ahead || 14);
        ahead.addEventListener("change", () => act("set", { ahead: Number(ahead.value) }, L("Saved", "已儲存")));
        parts.push(el("label", { className: "field" }, el("span", { textContent: L("Show the events of", "顯示的活動") }), ahead),
          el("label", { className: "field" }, el("span", { textContent: L("Remind me (each event; you can change it when adding one)", "提醒我（每個活動預設這樣，新增時可以再改）") }), before),
          el("label", { className: "field" }, el("span", { textContent: L("All-day events too (reminded at 09:00)", "也包括全天活動（早上 9:00 提醒）") }), allDay));
      }
      const when = a.last ? L(`Last synced at ${clock(a.last)}`, `上次同步：${clock(a.last)}`) : L("Not synced yet", "還沒同步");
      parts.push(el("div", { className: "spread" }, el("span", { className: "muted", textContent: when + (a.error ? " · " + a.error : "") }), btn(L("Sync now", "立即同步"), () => act("sync", null, L("Synced", "已同步")))));
      if (kind === "calendar") parts.push(calHelp(K.api(), btn));
    }
    box.replaceChildren(...parts);
  };
  draw(info[kind] || { mac: true, access: "checking" });
  if (!info[kind] || Date.now() - (at[kind] || 0) > 30e3) { at[kind] = Date.now(); K.api()?.("status").then(draw).catch(() => draw({ mac: false })); }
  return box;
}

/** (still here for the Reminders & events tab's own use) */
export const appleCard = (redraw) => connectCard("apple", redraw);
