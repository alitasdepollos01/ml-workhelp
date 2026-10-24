// Help: questions people ask (searchable), and an email to us: in a mail app (never a browser), or
// Gmail, Outlook.com, X or a copy, with the app's version filled in. Opened by clicking Muv at the bottom of the window's left side.

import { L, el, state, host, toast, deco } from "./app-common.js";

const MAIL = "alitasdepollos01@gmail.com";

const FAQ = () => [
  [L("How do I switch between the work clock and the Pomodoro?", "怎麼在工作時鐘和番茄鐘之間切換？"),
    L("Click the other one at the top of Today. Nothing is lost: the time so far is kept, and the other clock carries on. Changed your mind? Press Undo.", "點「今天」最上面的另一個按鈕。不會少算：到現在的時間都會留下，另一種計時接著開始。改變主意了？按「復原」。")],
  [L("Why did the work clock stop and say \"away\"?", "為什麼工作時鐘停下來，記成「離開」？"),
    L("After 5 minutes without the mouse or keyboard it stops, and the buddy asks what that was when you're back. Reading or working away from the computer? Open the Focus screen first: while it's open, sitting still keeps counting.", "滑鼠和鍵盤 5 分鐘沒動，它就會停下，回來時夥伴會問你剛剛去做什麼。要看書、不在電腦前工作？先打開「專注全螢幕」：打開時不動也會一直計時。")],
  [L("What is the Focus screen for?", "專注全螢幕是做什麼的？"),
    L("Work away from the computer: the clock fills the screen, with a sticker or photos behind it, and the screen stays on. Open it from Today, the menu bar, or the buddy (Control-Command-F). Esc closes it.", "給不在電腦前的工作：時鐘放大到整個螢幕，後面可以放貼圖或照片，螢幕也不會關掉。從「今天」、選單列或夥伴打開（Control-Command-F），按 Esc 關閉。")],
  [L("Some of my calendar events don't show", "有些行事曆活動沒出現"),
    L("Check the calendar is ticked in Settings › Reminders & events, and that all-day events are on if you need them. The event has to be in the Mac's Calendar app: Google calendars need ticking at calendar.google.com/calendar/syncselect first.", "到「設定 › 提醒與活動」確認那個行事曆有打勾，需要的話也打開全天活動。活動要先出現在 Mac 的行事曆 App 裡：Google 行事曆要先到 calendar.google.com/calendar/syncselect 勾選。")],
  [L("How do I connect Apple Reminders?", "怎麼連結 Apple 提醒事項？"),
    L("Settings › Reminders & events › Connect, then allow it when the Mac asks. Reminders with a time go both ways, every minute.", "「設定 › 提醒與活動 › 連結」，Mac 問的時候按允許。有時間的提醒會雙向同步，每分鐘一次。")],
  [L("How do I fix a past day?", "怎麼修改以前的紀錄？"),
    L("Data › Calendar, click the day: its timeline opens. Click a part to change it, or a dashed gap to add time you forgot.", "「數據 › 日曆」點那一天，就會打開那天的時間軸。點一段可以改，點虛線的空白可以補登。")],
  [L("How do I change my daily goal or the Pomodoro lengths?", "怎麼改每日目標或番茄鐘長度？"),
    L("Settings › Keeping time & the day. The lengths are also on Today, under the Pomodoro ring.", "「設定 › 計時與每天的節奏」。番茄鐘長度也可以在「今天」的番茄鐘下面改。")],
  [L("The desktop buddy is in the way", "桌面夥伴擋到我了"),
    L("Drag it anywhere, onto any screen. Right-click it › Hide to hide the buddies for a while; Settings › Desktop buddy & Thai puts it behind your windows. It also hides by itself during calls.", "把它拖到別的地方或別的螢幕。在它上面按右鍵 › 隱藏，可以暫時隱藏夥伴；「設定 › 桌面夥伴與泰文」可以讓它待在視窗後面。通話時它也會自己躲起來。")],
  [L("How do I choose which stickers the buddy uses?", "怎麼選夥伴用哪些貼圖？"),
    L("Settings › Desktop buddy & Thai › Stickers, or the Stickers tab: click a sticker to leave it out or bring it back.", "「設定 › 桌面夥伴與泰文 › 貼圖」，或在「貼圖」分頁點一張貼圖，就能不用它或放回來。")],
  [L("How do I add my own photos?", "怎麼加自己的照片？"),
    L("Stickers › Add photos, then say who they're from: a source the app knows, your own photo, or a new one you type in. The people in them are cut out for you; sort them into Milk, Love, Together or Others. Only use photos you're allowed to use.", "「貼圖 › 加入照片」，再選照片來自誰：App 已知的來源、你自己拍的，或輸入新的來源。照片裡的人會自動去背，再分到 Milk、Love、同框或其他。請只用你有權使用的照片。")],
  [L("How do I delete a photo I added, or change its credit?", "怎麼刪除我加的照片，或改它的標註？"),
    L("Stickers › Photos, click the photo: Change who took it, or Delete this photo (its stickers go with it). The photos the app comes with stay. Your sources are in Settings › Categories.", "「貼圖 › 照片」點那張照片：可以「更改拍攝者」或「刪除這張照片」（它的貼圖也會一起刪除）。App 內建的照片不能刪。你加的來源在「設定 › 分類」。")],
  [L("Can I change how the focus screen's clock looks?", "專注全螢幕的時鐘可以換樣子嗎？"),
    L("Yes: its gear button, or Settings › Keeping time & the day › Focus screen. Pick the colours, a filled middle, where it sits (9 places), its size and opacity, and a dark or soft cream background. It's the same for the Pomodoro and the work clock.", "可以：按畫面上的齒輪按鈕，或到「設定 › 計時與每天的節奏 › 專注全螢幕」。可以選顏色、中間填滿、位置（9 個）、大小和不透明度，還有深色或柔和米色背景。番茄鐘和工作時鐘都一樣。")],
  [L("A photo is mine: how do I get credit, or have it removed?", "照片是我拍的：怎麼標註或下架？"),
    L("Email us below (choose \"A photo credit or removal\") with the photo or its sticker. We'll change it in the next update and tell everyone who uses the app.", "用下面的表單寫信給我們（選「照片標註或下架」），附上照片或貼圖。我們會在下一次更新修改，並通知使用者。")],
  [L("Is my data sent anywhere?", "我的資料會被傳出去嗎？"),
    L("No. Your work log, reminders, photos and stickers stay on your Mac. The app only reads a small file on its own page to see if there's a new version (you can switch that off in Settings › About & updates). Data › Export CSV saves a copy for you.", "不會。工作紀錄、提醒、照片和貼圖都只存在你的 Mac 裡。App 只會讀取自己網頁上的一個小檔案，看看有沒有新版本（可以在「設定 › 關於與更新」關掉）。「數據 › 匯出 CSV」可以自己存一份。")],
  [L("How do I change the language?", "怎麼換語言？"),
    L("Settings › Look & menu bar: English, Traditional Chinese or Thai.", "「設定 › 外觀與選單列」：英文、繁體中文或泰文。")],
  [L("I don't hear the reminder sound", "聽不到提醒的聲音"),
    L("Settings › Reminders & events: pick a sound, turn the volume up and press Hear it. Check the Mac's own volume and Focus mode too.", "「設定 › 提醒與活動」：選一個音效、把音量調大，按「試聽」。也看一下 Mac 本身的音量和專注模式。")],
  [L("How do I get new versions?", "怎麼拿到新版本？"),
    L("The app checks once a day and tells you in the menu. Leave your email in Settings › About & updates to get a note when there's one.", "App 每天會檢查一次，有新版本會在選單裡告訴你。在「設定 › 關於與更新」留下 email，有新版本時會寫信通知你。")],
  [L("How do I uninstall it?", "怎麼解除安裝？"),
    L("Settings › About & updates › Uninstall. You can keep or delete your data.", "「設定 › 關於與更新 › 解除安裝」。可以選擇保留或刪除你的資料。")],
];

const KINDS = () => [L("A question", "問題"), L("Something isn't working", "有東西不正常"), L("An idea", "建議"), L("A photo credit or removal", "照片標註或下架"), L("Help with the Thai translation", "協助泰文翻譯")];

// The page's top: the sticker above a big title, in the middle.
function helpTop() {
  return el("div", { className: "help-head" }, deco("app-help-top", ""), el("h2", { textContent: L("Help & questions", "幫助與常見問題") }));
}

export function renderHelp(main, { ask } = {}) {
  const st = state.st || {};
  main.append(helpTop());
  const search = el("input", { type: "search", className: "help-search", placeholder: L("Search, e.g. calendar, focus screen, credit", "搜尋，例如：行事曆、專注全螢幕、標註"), "aria-label": L("Search the questions", "搜尋問題") });
  const none = el("p", { className: "muted", textContent: L("Nothing like that here: email us below.", "找不到相關的問題：可以用下面的表單寫信給我們。"), hidden: true });
  const list = el("div", { className: "faq" }, FAQ().map(([q, a], i) => el("details", { open: i === 0 }, el("summary", { textContent: q }), el("p", { textContent: a }))));
  search.addEventListener("input", () => {
    const t = search.value.trim().toLowerCase(); let shown = 0;
    for (const d of list.children) { const ok = !t || d.textContent.toLowerCase().includes(t); d.hidden = !ok; if (ok) shown++; if (t && ok) d.open = true; }
    none.hidden = shown > 0;
  });
  main.append(el("section", { className: "card help-card" }, search, list, none));
  // Email us: your mail app opens with it written, the app's version and the Mac added. Other ways under it.
  const kind = el("select", { "aria-label": L("What it's about", "關於什麼") }, KINDS().map((k) => new Option(k)));
  const text = el("textarea", { rows: 5, placeholder: L("Write here…", "寫在這裡⋯"), "aria-label": L("Your message", "你的訊息") });
  // (from Photo credits › Tell us about this source: written for you)
  if (ask?.mail) { kind.selectedIndex = Math.max(0, Math.min(KINDS().length - 1, Number(ask.mail.kind) || 0)); text.value = String(ask.mail.text || ""); }
  const msg = () => {
    const mac = (navigator.userAgent.match(/Mac OS X ([\d_]+)/) || [])[1]?.replace(/_/g, ".") || "";
    return { subject: `[ML WorkHelp] ${kind.value}`, body: `${text.value.trim()}\n\n—\nML WorkHelp ${st.version || ""}${mac ? ` · macOS ${mac}` : ""}` };
  };
  const q = (o) => Object.entries(o).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
  const open = (url) => { const a = el("a", { href: url, target: "_blank", rel: "noopener" }); document.body.append(a); a.click(); a.remove(); };
  const copy = async () => {
    const { subject, body } = msg(), all = `${MAIL}\n${subject}\n\n${body}`;
    try { if (host?.copyText) await host.copyText(all); else await navigator.clipboard.writeText(all); return true; } catch { return false; }
  };
  const send = el("button", { type: "button", className: "btn primary mail-send", textContent: L("Open in my mail app", "用我的郵件 App 寄出") });
  send.addEventListener("click", async () => {
    const { subject, body } = msg(), url = `mailto:${MAIL}?${q({ subject, body })}`;
    if (!host?.openMail) return open(url);
    const app = await host.openMail(url);
    toast(app ? L(`Opening ${app}…`, `正在打開 ${app}⋯`) : L("No mail app found: use Gmail, Outlook.com, X or Copy below.", "找不到郵件 App：可以用下面的 Gmail、Outlook.com、X 或複製。"));
  });
  const way = (t, run) => { const a = el("button", { type: "button", className: "linkish mail-way", textContent: t }); a.addEventListener("click", run); return a; };
  const ways = el("div", { className: "mail-ways" }, el("span", { className: "muted", textContent: L("Or:", "或是：") }),
    way(L("Gmail in the browser", "用瀏覽器開 Gmail"), () => { const { subject, body } = msg(); open(`https://mail.google.com/mail/?view=cm&fs=1&${q({ to: MAIL, su: subject, body })}`); }),
    way("Outlook.com", () => { const { subject, body } = msg(); open(`https://outlook.live.com/mail/0/deeplink/compose?${q({ to: MAIL, subject, body })}`); }),
    way(L("Message us on X", "在 X 私訊我們"), async () => { const ok = await copy(); open("https://x.com/alitasdepollos0"); toast(ok ? L("Your message is copied: press Message on our X page and paste it.", "訊息已複製：在我們的 X 頁面按「訊息」再貼上。") : L("Opening our X page.", "正在打開我們的 X 頁面。")); }),
    way(L("Copy the message", "複製訊息"), async () => toast(await copy() ? L(`Copied. Paste it into an email to ${MAIL}.`, `已複製，貼到寄給 ${MAIL} 的信裡就好。`) : L("Couldn't copy it.", "沒辦法複製。"))));
  main.append(el("section", { className: "card mail-card" }, el("h3", { textContent: L("Email us", "寫信給我們") }),
    el("p", { className: "muted", style: "margin:0", textContent: L("Your mail app opens with your message, the app's version and your Mac's version added, so we can help sooner. No mail app? Use one of the other ways.", "會打開你的郵件 App，訊息、App 版本和 Mac 版本都幫你填好，我們能更快幫上忙。沒有郵件 App？用下面其他方式也可以。") }),
    kind, text, el("div", { className: "row-flex" }, send, el("span", { className: "muted small", textContent: MAIL })), ways));
  if (ask?.mail) requestAnimationFrame(() => { main.querySelector(".mail-card")?.scrollIntoView({ block: "center" }); text.focus(); });
}
