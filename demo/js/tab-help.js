// Help: questions people ask, in sections with a jump list at the top and a search across all of them, and an
// email to us: in a mail app (never a browser), or Gmail, Outlook.com, X or a copy, with the app's version filled in.
// Opened by clicking Muv at the bottom of the window's left side. Its own CSS: help.css.

import { L, el, state, host, toast, deco } from "./app-common.js";

const MAIL = "alitasdepollos01@gmail.com";

// Help in sections, a jump list at the top (Myra, 27 Oct): each [id, title, [[question, answer], …]].
// (the Pins section only where the app has pins: Safari and the website demo don't)
const SECTIONS = () => [
  { id: "start", t: L("Getting started", "開始使用"), qa: [
    [L("What are Work corner and Fan corner?", "「工作角落」和「粉絲角落」是什麼？"),
      L("The two parts of the menu on the left. Work corner holds Today, Reminders & events and Data; Fan corner holds Stickers, Pins, the desktop buddy and photo credits. Settings is at the bottom.", "左邊選單的兩個部分。「工作角落」放今天、提醒與活動和數據；「粉絲角落」放貼圖、徽章、桌面夥伴和照片來源。設定在最下面。")],
    [L("The desktop buddy is in the way", "桌面夥伴擋到我了"),
      L("Drag it anywhere, onto any screen. Right-click it › Hide to hide the buddies for a while; the Desktop buddy page puts it behind your windows. It also hides by itself during calls.", "把它拖到別的地方或別的螢幕。在它上面按右鍵 › 隱藏，可以暫時隱藏夥伴；「桌面夥伴」頁面可以讓它待在視窗後面。通話時它也會自己躲起來。")],
    [L("How do I choose which stickers the buddy uses?", "怎麼選夥伴用哪些貼圖？"),
      L("The Desktop buddy page › Stickers in use, or the Stickers tab: click a sticker to leave it out or bring it back.", "「桌面夥伴」頁面的「使用中的貼圖」，或在「貼圖」分頁點一張貼圖，就能不用它或放回來。")]] },
  { id: "work", t: L("Work clock & focus", "工作時鐘與專注"), qa: [
    [L("How do I switch between the work clock and the Pomodoro?", "怎麼在工作時鐘和番茄鐘之間切換？"),
      L("Click the other one at the top of Today. Nothing is lost: the time so far is kept, and the other clock carries on. Changed your mind? Press Undo.", "點「今天」最上面的另一個按鈕。不會少算：到現在的時間都會留下，另一種計時接著開始。改變主意了？按「復原」。")],
    [L("Why did the work clock stop and say \"away\"?", "為什麼工作時鐘停下來，記成「離開」？"),
      L("After 5 minutes without the mouse or keyboard it stops, and the buddy asks what that was when you're back. Reading or working away from the computer? Open the Focus screen first: while it's open, sitting still keeps counting.", "滑鼠和鍵盤 5 分鐘沒動，它就會停下，回來時夥伴會問你剛剛去做什麼。要看書、不在電腦前工作？先打開「專注全螢幕」：打開時不動也會一直計時。")],
    [L("What is the Focus screen for?", "專注全螢幕是做什麼的？"),
      L("Work away from the computer: the clock fills the screen (this stretch, or the Pomodoro round, with today's total under it), with a sticker or photos behind it (the photographers', your own, or both), and the screen stays on. Open it from Today, the menu bar, or the buddy (Control-Command-F). Esc closes it.", "給不在電腦前的工作：時鐘放大到整個螢幕（這一段的時間，或番茄鐘這一輪，下面是今天的總時數），後面可以放貼圖或照片（攝影師的、你自己的，或兩種都放），螢幕也不會關掉。從「今天」、選單列或夥伴打開（Control-Command-F），按 Esc 關閉。")],
    [L("Can I change how the focus screen's clock looks?", "專注全螢幕的時鐘可以換樣子嗎？"),
      L("Yes: its gear button, or Settings › Keeping time & the day › Focus screen. Pick the colours, a filled middle, where it sits (9 places), its size and opacity, and a dark or soft cream background. It's the same for the Pomodoro and the work clock.", "可以：按畫面上的齒輪按鈕，或到「設定 › 計時與每天的節奏 › 專注全螢幕」。可以選顏色、中間填滿、位置（9 個）、大小和不透明度，還有深色或柔和米色背景。番茄鐘和工作時鐘都一樣。")],
    [L("How do I change my daily goal or the Pomodoro lengths?", "怎麼改每日目標或番茄鐘長度？"),
      L("Settings › Keeping time & the day. The lengths are also on Today, under the Pomodoro ring.", "「設定 › 計時與每天的節奏」。番茄鐘長度也可以在「今天」的番茄鐘下面改。")]] },
  { id: "rem", t: L("Reminders & events", "提醒與活動"), qa: [
    [L("Some of my calendar events don't show", "有些行事曆活動沒出現"),
      L("Check the calendar is ticked in Settings › Reminders & events, and that all-day events are on if you need them. The event has to be in the Mac's Calendar app: Google calendars need ticking at calendar.google.com/calendar/syncselect first.", "到「設定 › 提醒與活動」確認那個行事曆有打勾，需要的話也打開全天活動。活動要先出現在 Mac 的行事曆 App 裡：Google 行事曆要先到 calendar.google.com/calendar/syncselect 勾選。")],
    [L("How do I connect Apple Reminders?", "怎麼連結 Apple 提醒事項？"),
      L("Settings › Reminders & events › Connect, then allow it when the Mac asks. Reminders with a time go both ways, every minute.", "「設定 › 提醒與活動 › 連結」，Mac 問的時候按允許。有時間的提醒會雙向同步，每分鐘一次。")],
    [L("I don't hear the reminder sound", "聽不到提醒的聲音"),
      L("Settings › Reminders & events: pick a sound, turn the volume up and press Hear it. Check the Mac's own volume and Focus mode too.", "「設定 › 提醒與活動」：選一個音效、把音量調大，按「試聽」。也看一下 Mac 本身的音量和專注模式。")]] },
  { id: "data", t: L("Data (work time)", "數據（工作時間）"), qa: [
    [L("How do I fix a past day?", "怎麼修改以前的紀錄？"),
      L("Data › Calendar, click the day: its timeline opens. Click a part to change it, or a dashed gap to add time you forgot.", "「數據 › 日曆」點那一天，就會打開那天的時間軸。點一段可以改，點虛線的空白可以補登。")],
    [L("How do I decorate a picture card?", "圖卡要怎麼裝飾？"),
      L("Data › Make a picture, pick a card, then Decorate: add up to 6 doodles and pins you've collected, and drag, resize or turn each one. With anything on it, the card gets a small credit line for the doodles and pins. Download saves it.", "「數據 › 做成圖片」選一張卡片，再按「裝飾」：最多放 6 個塗鴉和你收集到的徽章，每個都能拖曳、縮放或旋轉。只要有放東西，卡片上就會多一行小小的塗鴉與徽章設計標註。按「下載」就能存起來。")]] },
  { id: "look", t: L("Looks & doodles", "外觀與塗鴉"), qa: [
    [L("How do I turn the doodles off?", "怎麼把塗鴉關掉？"),
      L("Settings › Look & menu bar › Doodles › Off. Or keep them, quieter: pick Quiet wallpaper and move Wallpaper strength down (light and dark each have their own slider; Reset to balanced puts them back). Corner stickers puts a few on the corners of the cards instead.", "「設定 › 外觀與選單列 › 塗鴉 › 關」。想留著但淡一點：選「安靜的壁紙」，再把「壁紙濃淡」調低（淺色、深色各一條滑桿；按「回到平衡值」就能還原）。選「角落貼紙」，就只在卡片角落貼幾個。")]] },
  { id: "pins", when: () => !!host?.pins, t: L("Pins", "徽章"), qa: [
    [L("How do I earn pins?", "徽章要怎麼拿？"),
      L("Just by using the app: hours of work, Pomodoro rounds, breaks, reminders, picture cards and more. Open Pins (in Fan corner) and click a grey one to see what it needs; Next up shows the ones you're closest to. Nothing is ever taken away.", "平常用 App 就會拿到：工作時數、番茄鐘輪數、休息、提醒、圖卡⋯到粉絲角落的「徽章」，點一個灰色的徽章就知道要怎麼拿；「快到手了」會列出最快拿到的幾個。拿到的徽章不會被收回。")],
    [L("What are the tiers (silver, gold, gem)?", "徽章的等級（銀邊、金邊、寶石）是什麼？"),
      L("Most pins move up as you keep going: plain, then silver rim, gold rim and gem. Each tier has its own line from the show; from gold rim up it's engraved on the back (click the pin to turn it over). Series pins and a few others have just one tier.", "大部分徽章會隨著你繼續下去而升級：素面、銀邊、金邊，最後是寶石。每一級都有自己的一句劇中台詞；金邊以上會刻在背面（點徽章就能翻過來）。系列徽章和少數幾個只有一個等級。")],
    [L("I missed a day. Is my run of workdays gone?", "我漏了一天，連續工作的天數就斷了嗎？"),
      L("Not straight away. Weekends never break it, and one missed weekday a week is forgiven: it shows as a ♥ on the strip. Miss a second weekday that week and the run starts again from your next workday. Pins you've earned stay yours either way.", "不會馬上斷。週末不算，而且每週可以漏掉一個平日，那天會在小條上顯示成 ♥。同一週再漏一個平日，就從下一個工作天重新開始算。已經拿到的徽章，不管怎樣都還是你的。")],
    [L("What's a secret pin (???)?", "祕密徽章（???）是什麼？"),
      L("A few pins are secrets: how to get them and what they look like are both a surprise. They show ??? and a hint. Keep using the app and they'll find you.", "有幾個徽章是祕密：怎麼拿、長什麼樣子都是驚喜，只會顯示「???」和一個提示。繼續用 App，它們就會找上你。")],
    [L("How do the birthday pins work?", "生日徽章要怎麼拿？"),
      L("Love's (23 May), MUVMUV's (24 May) and Milk's (31 July) birthdays each have a pin. Open the app or work on any day of the week that starts on the birthday (your Mac's own date and time) and that year counts; the pin moves up with the years you're there.", "Love（5/23）、MUVMUV（5/24）和 Milk（7/31）的生日各有一個徽章。從生日那天起的一週內，任何一天打開 App 或工作（照你 Mac 上的日期和時間）就算那一年；陪她們過的年數越多，徽章等級越高。")],
    [L("Can I wear a pin?", "可以把徽章別起來嗎？"),
      L("Yes: open a pin you've collected and choose Wear it on the desktop buddy card. It shows on the little card you get when you right-click the buddy, next to its doodle. Settings › Pins changes it too.", "可以：打開一個你拿到的徽章，選「別在桌面夥伴的卡片上」。在夥伴上按右鍵出現的小卡片上就看得到，就在小塗鴉旁邊。也可以到「設定 › 徽章」換。")],
    [L("I got a code at a fan event. Where do I type it?", "在粉絲活動拿到兌換碼，要在哪裡輸入？"),
      L("Settings › Pins › Enter a code (it looks like MLWH-XXXX-XXXX). That show's pins unlock straight away. No internet or account needed.", "「設定 › 徽章 › 輸入兌換碼」（格式像 MLWH-XXXX-XXXX）。輸入後，那部作品的徽章馬上解鎖。不用網路，也不用帳號。")]] },
  { id: "photos", t: L("Photos & stickers", "照片與貼圖"), qa: [
    [L("How do I add my own photos?", "怎麼加自己的照片？"),
      L("Stickers › Add photos, then say who they're from: a source the app knows, your own photo, or a new one you type in. The people in them are cut out for you; sort them into Milk, Love, Together or Others. Only use photos you're allowed to use.", "「貼圖 › 加入照片」，再選照片來自誰：App 已知的來源、你自己拍的，或輸入新的來源。照片裡的人會自動去背，再分到 Milk、Love、同框或其他。請只用你有權使用的照片。")],
    [L("How do I delete a photo I added, or change its credit?", "怎麼刪除我加的照片，或改它的標註？"),
      L("Stickers › Photos, click the photo: Change who took it, or Delete this photo (its stickers go with it). The photos the app comes with stay. Your sources are in Settings › Categories.", "「貼圖 › 照片」點那張照片：可以「更改拍攝者」或「刪除這張照片」（它的貼圖也會一起刪除）。App 內建的照片不能刪。你加的來源在「設定 › 分類」。")],
    [L("A photo is mine: how do I get credit, or have it removed?", "照片是我拍的：怎麼標註或下架？"),
      L("Email us below (choose \"A photo credit or removal\") with the photo or its sticker. We'll change it in the next update and tell everyone who uses the app.", "用下面的表單寫信給我們（選「照片標註或下架」），附上照片或貼圖。我們會在下一次更新修改，並通知使用者。")]] },
  { id: "backup", t: L("Backup & updates", "備份與更新"), qa: [
    [L("Where are my backups?", "我的備份存在哪裡？"),
      L("Wherever you put them. Settings › About & updates › Back up now saves one file, and you pick where; weekly backups (if you turned them on) go to the folder you chose. On a new Mac or after reinstalling, open the app and it offers to restore from that file.", "存在你選的地方。「設定 › 關於與更新 › 立即備份」會存成一個檔案，位置你自己選；如果打開了每週自動備份，就會放在你選的資料夾。換新 Mac 或重新安裝後打開 App，它會問你要不要從備份還原。")],
    [L("How do I delete everything and start over?", "怎麼全部刪除、重新開始？"),
      L("Settings › About & updates › Delete everything. It asks twice, and if you've no backup yet, it offers to make one first. Your work log, reminders, settings, pins and own photos go; the photos that came with the app and any backup files you saved stay. Only the pins? Reset pins, in the same card.", "「設定 › 關於與更新 › 全部刪除」。它會問你兩次；如果還沒備份過，也會先問你要不要備份。工作紀錄、提醒、設定、徽章和你自己的照片會刪掉；App 附的照片和你存好的備份檔會留著。只想重來徽章？同一張卡片裡的「重設徽章」。")],
    [L("Will new photos download by themselves?", "新照片會自己下載嗎？"),
      L("Only if you say so: the buddy asks first, and says how big they are (packs are often 100 MB or more). Change it in Settings › About & updates › New photos and stickers: Ask me, Download automatically or Never. Small things like credit fixes, new pins and words arrive quietly, with no reinstall.", "你說好才會：夥伴會先問你，也會告訴你檔案多大（更新包常常有 100 MB 以上）。可以到「設定 › 關於與更新 › 新的照片和貼圖」改成：先問我、自動下載，或不要。照片標註修正、新徽章、單字這些小東西，會自己悄悄更新，不用重新安裝。")],
    [L("How do I get new versions?", "怎麼拿到新版本？"),
      L("The app checks once a day and tells you in the menu, and the buddy holds up the news. New photos, pins and credit fixes don't need a new version: they arrive by themselves. Leave your email in Settings › About & updates to get a note when there's one.", "App 每天會檢查一次，有新版本會在選單裡告訴你，夥伴也會舉牌通知。新照片、新徽章和標註修正不用等新版本，會自己更新。在「設定 › 關於與更新」留下 email，有新版本時會寫信通知你。")],
    [L("How do I uninstall it?", "怎麼解除安裝？"),
      L("Settings › About & updates › Uninstall. You can keep or delete your data.", "「設定 › 關於與更新 › 解除安裝」。可以選擇保留或刪除你的資料。")]] },
  { id: "privacy", t: L("Privacy", "隱私"), qa: [
    [L("Is my data sent anywhere?", "我的資料會被傳出去嗎？"),
      L("No. Your work log, reminders, pins, photos and stickers stay on your Mac, and backups are files you keep yourself. The app only reads small files on its own page, to see if there's a new version or new photos and pins (switch that off in Settings › About & updates). Data › Export CSV saves a copy for you.", "不會。工作紀錄、提醒、徽章、照片和貼圖都只存在你的 Mac 裡，備份也是你自己收著的檔案。App 只會讀取自己網頁上的幾個小檔案，看看有沒有新版本、新照片或新徽章（可以在「設定 › 關於與更新」關掉）。「數據 › 匯出 CSV」可以自己存一份。")]] },
  { id: "lang", t: L("Languages", "語言"), qa: [
    [L("How do I change the language?", "怎麼換語言？"),
      L("Settings › Look & menu bar: English, Traditional Chinese or Thai.", "「設定 › 外觀與選單列」：英文、繁體中文或泰文。")]] },
].filter((s) => !s.when || s.when());

const KINDS = () => [L("A question", "問題"), L("Something isn't working", "有東西不正常"), L("An idea", "建議"), L("A photo credit or removal", "照片標註或下架"), L("Help with the Thai translation", "協助泰文翻譯")];

// The page's top: the sticker above a big title, in the middle.
function helpTop() {
  return el("div", { className: "help-head" }, deco("app-help-top", ""), el("h2", { textContent: L("Help & questions", "幫助與常見問題") }));
}

/** Help's own look (the jump list and the sections), loaded once. */
function helpCss() {
  if (document.querySelector("link[data-help-css]")) return;
  const link = el("link", { rel: "stylesheet", href: new URL("../help.css", import.meta.url).href });
  link.dataset.helpCss = "1";
  document.head.append(link);
}

export function renderHelp(main, { ask } = {}) {
  helpCss();
  const st = state.st || {};
  main.append(helpTop());
  const search = el("input", { type: "search", className: "help-search", placeholder: L("Search, e.g. calendar, focus screen, credit", "搜尋，例如：行事曆、專注全螢幕、標註"), "aria-label": L("Search the questions", "搜尋問題") });
  const none = el("p", { className: "muted help-none", textContent: L("Nothing like that here: email us below.", "找不到相關的問題：可以用下面的表單寫信給我們。"), hidden: true });
  const secs = SECTIONS();
  // The jump list: a chip for each section (its questions' count beside it); a click scrolls to it.
  const jump = el("nav", { className: "help-jump", "aria-label": L("Sections", "分類") }, secs.map((x) => {
    const b = el("button", { type: "button", className: "help-chip", "data-sec": x.id }, x.t, el("small", { textContent: String(x.qa.length) }));
    b.addEventListener("click", () => { search.value = ""; filter(); const h = main.querySelector(`#help-${x.id}`); h?.scrollIntoView({ behavior: "smooth", block: "start" }); h?.querySelector("details")?.setAttribute("open", ""); });
    return b;
  }));
  const list = el("div", { className: "faq help-secs" }, secs.map((x, k) => el("section", { className: "help-sec", id: `help-${x.id}`, "aria-labelledby": `help-h-${x.id}` },
    el("h3", { id: `help-h-${x.id}`, textContent: x.t }),
    x.qa.map(([q, a], i) => el("details", { open: k === 0 && i === 0 }, el("summary", { textContent: q }), el("p", { textContent: a }))))));
  // The search looks through every section: a section with nothing that matches hides, and so does its chip.
  function filter() {
    const t = search.value.trim().toLowerCase(); let shown = 0;
    for (const sec of list.children) {
      let here = 0;
      for (const d of sec.querySelectorAll("details")) { const ok = !t || d.textContent.toLowerCase().includes(t); d.hidden = !ok; if (ok) here++; if (t && ok) d.open = true; }
      sec.hidden = !here; shown += here;
      const chip = jump.querySelector(`[data-sec="${sec.id.slice(5)}"]`); if (chip) chip.hidden = !here;
    }
    none.hidden = shown > 0;
  }
  search.addEventListener("input", filter);
  main.append(el("section", { className: "card help-card" }, search, jump, list, none));
  if (ask?.section) requestAnimationFrame(() => jump.querySelector(`[data-sec="${ask.section}"]`)?.click());
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

/** For the tests: the sections as drawn ([id, title, questions]). */
export const helpSections = () => SECTIONS().map((x) => [x.id, x.t, x.qa.length]);
