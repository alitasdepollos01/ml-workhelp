// The guided tour of the app's window: the rest of the window dims, Muv points
// at one thing at a time, and the tab changes as it goes. Started after the
// welcome window (#{"tab":"today","tour":true}) and from Settings → About.
// Four tours: the window's ("app"), and Data's, Settings' and Pins', each opened from its step in the window's
// tour (and from its own page). The window's tour tells the app when it ends: its last step's Done, or Skip
// (settingText "tourSeen": the welcome and tour don't open again by themselves until the next edition, TOUR in
// main.js), and only Done counts for the pins (note "tour-done").

import { L, el, state, host } from "./app-common.js";
import { thaiExact } from "./i18n.js";

// Each step: the tab, what to point at (every selector in find that's there, put together; when none is, the
// first of or that is), what Muv says, and when (a step for something this window doesn't have is left out).
const keepOf = () => state.st?.keep || "work";
const hasPins = () => !!host?.pins;
/** How many pins there are: the app's catalogue (it can grow without a new version). */
const pinTotal = () => state.st?.pins?.total || 61;
/** Doodles on (Settings › Look › Doodles isn't Off). */
const doodlesOn = () => (state.st?.look?.doodles || "wall") !== "off";
const ALL = [
  { tab: "today", find: ["#nav"], t: ["Everything is here", "東西都在這裡"],
    p: ["One window for everything, with its tabs down the left. Open it any time from the menu bar icon, or right-click the buddy.",
      "所有東西都在這一個視窗，分頁在左邊。隨時可以從選單列的圖示打開，或在夥伴上按右鍵。"] },
  { tab: "today", find: [".nav-h-work", "#nav [data-tab=today]", "#nav .nav-h:not(.nav-h-work)", "#nav [data-tab=credits]"], t: ["Work corner, Fan corner", "工作角落、粉絲角落"],
    p: ["The menu has two parts: Work corner (Today, Reminders, Data) and Fan corner (Stickers, Pins, the desktop buddy and photo credits). Settings is at the bottom.",
      "選單分成兩塊：工作角落（今天、提醒、數據）和粉絲角落（貼圖、徽章、桌面夥伴和照片來源）。設定在最下面。"] },
  { tab: "buddy", find: [".bp-hero"], scroll: "start", t: ["Desktop buddy", "桌面夥伴"],
    p: ["Milk and Love on your desktop, all on one page: bring them out or put them away, try the moments of the day in the preview, and below, who walks, how lively, the Thai words and when they hide.",
      "Milk 和 Love 在你桌面上的一切都在這一頁：叫出或收起夥伴，在示意圖看看一天裡不同時刻的樣子；下面是誰出來、多活潑、泰文單字，還有什麼時候躲起來。"] },
  { tab: "today", find: [".now-top"], t: ["Two ways to work", "兩種工作方式"],
    p: ["The switch at the top of the timer: the work clock, or the Pomodoro (each round counts as today's work), the same as in the welcome. Switch any time; it's from now on. The ? beside it says how it counts.",
      "計時卡最上面的切換：工作時鐘，或番茄鐘（每一輪都算進今天的工作），跟歡迎頁選的一樣。隨時可以切換，切換後馬上就用新的方式。旁邊的 ? 會說明怎麼計時。"] },
  { tab: "today", find: [".now-card"], t: ["Now", "現在"],
    p: () => keepOf() === "work"
      ? ["The clock counts what you're working on (click its name to switch). The big button is always the next step: a break, then I'm back. Done for today logs what you've done so far and ends the day.",
        "時鐘算的是正在做的事（點名字可以換）。大按鈕永遠是下一步：「休息一下」，回來按「我回來了」。「收工」會把做到現在的時間記進去，結束今天。"]
      : ["Pick what the round is for, then Start a round. Each round counts as today's work; its break starts by itself. Any break, one screen: change what it is and how long. Done for today counts the round so far.",
        "選好這一輪要做什麼，按「開始一輪」。每一輪都算進今天的工作，結束會自動休息。不管什麼休息都是同一個畫面，可以改種類和長度。「收工」會把這一輪做到現在的時間算進去。"] },
  // (the card has the button while you work or between rounds; before the day starts, on a break or after Done for
  // today it doesn't: then Muv points at the card and says where the button comes)
  { tab: "today", find: [".now-card .focus-btn"], or: [".now-card"], t: ["Focus screen", "專注全螢幕"],
    p: () => (document.querySelector(".now-card .focus-btn")
      ? ["Press this to open the focus screen, for reading or work away from the computer. The clock fills the screen: the big number is this stretch, today's total is under it, with the photographers' photos, your own, or both behind it. Esc closes it. It's also on the card you get when you right-click the buddy.",
        "按這裡就能打開專注全螢幕，看書、不在電腦前工作的時候用。時鐘會放大到整個螢幕：大數字是這一段，下面是今天的總時數，後面可以放攝影師的照片、你自己的照片，或兩種都放。按 Esc 關閉。在夥伴上按右鍵，跳出來的小卡片上也有這個按鈕。"]
      : ["The focus screen is for reading or work away from the computer: the clock fills the screen. Once you're working, this card has a Focus screen button: press it to open the focus screen. It's also on the card you get when you right-click the buddy. Esc closes it.",
        "專注全螢幕是給看書、不在電腦前工作的時候用的：時鐘會放大到整個螢幕。開始工作後，這張卡片上會有「專注全螢幕」按鈕，按下去就會打開。在夥伴上按右鍵，跳出來的小卡片上也有這個按鈕。按 Esc 關閉。"]) },
  { tab: "today", when: () => doodlesOn(), find: [".today-top-band"], t: ["Doodles", "塗鴉"],
    p: ["The little drawings are doodles from the shows MilkLove were in: one by each page's title, and a faint wallpaper behind the cards. Too much? Settings › Look & menu bar › Doodles: corner stickers, or off.",
      "這些小圖是 MilkLove 演過的作品裡的塗鴉：每一頁標題旁邊一個，卡片後面還有淡淡的壁紙。覺得太多？到「設定 › 外觀與選單列 › 塗鴉」改成角落貼紙，或關掉。"] },
  { tab: "today", find: [".focus-box"], t: ["Focus of the day", "本日主題"],
    p: ["Write the one thing today is about here: click and type. Data's calendar shows each day's. Point at any sticker in the app to see whose photo it is.", "在這裡寫下今天最想完成的那件事：點一下直接打字。「數據」的日曆會列出每天的主題。滑鼠移到 App 裡任何一張貼圖上，就能看到是誰的照片。"] },
  { tab: "today", find: [".word-card"], t: ["Thai from songs and daily life", "歌裡和生活裡的泰文"],
    p: ["A Thai word from the songs or from everyday life, easy to advanced: tap the card to see what it means, and again for the next word. The same word of the day sits at the bottom of the menu.",
      "一個泰文字，可能來自歌裡，也可能是生活裡常用的，從簡單到進階都有：點一下卡片看意思，再點一次換下一個字。今天的單字也會放在選單最下面。"] },
  { tab: "today", find: [".entries"], t: ["Your day, stretch by stretch", "你今天的每一段時間"],
    p: ["Everything you do goes in here by itself: a timeline, and a line for each part. Click one to change it; click a dashed gap to add time you forgot. Pomodoro rounds are marked with a tomato.",
      "你做的每件事都會自動記在這裡：一條時間軸，每一段一行。點一段就能改；點虛線的空白就能補登忘了記的時間。番茄鐘的那幾輪會標上番茄。"] },
  { tab: "reminders", find: [".add-card", ".rem-list"], t: ["Reminders & events", "提醒與活動"],
    p: ["Write what it is, then tap when: in 15 minutes, tonight, or pick a time. Events don't need a calendar: they stay in the app. Below, everything by date: All, Reminders or Events.",
      "寫下要做什麼，再點選時間：15 分鐘後、今晚，或自己選時間。活動不用連結行事曆也能加，會存在 App 裡。下面依日期排列，可以切換「全部／提醒／活動」。"] },
  { tab: "week", ask: { tab: "sum", range: "week" }, find: ["main .page"], scroll: "start", t: ["Data", "數據"],
    p: ["A week, a month or a year, in three tabs: Summary (the numbers and one chart), Analysis (where the time went, when you work, how focused) and Calendar (each day: click one to see and change it). Want a closer look? Muv shows you each part in a minute.",
      "看一週、一個月或一年，三個分頁：總覽（數字和一張圖）、分析（時間花在哪裡、什麼時候工作、專注得怎麼樣）和日曆（每一天，點一天就能看和改）。想仔細看看嗎？Muv 帶你一個一個看，大概 1 分鐘。"],
    action: [["Show me Data", "帶我看數據"], "data"] },
  { tab: "week", ask: { tab: "sum", range: "week" }, find: ["main .share-btn"], t: ["Make a picture", "存成圖片"],
    p: ["Make a picture turns your week, month or year into a little card to save and share: pick one of six kinds and a sticker. Then decorate it with doodles and the pins you've earned, and download it.",
      "按「存成圖片」，就能把這一週、這個月或這一年做成一張小卡片，存下來分享：六種樣式任選，再挑一張貼圖。還可以用塗鴉和你拿到的徽章裝飾，最後下載下來。"] },
  { tab: "settings", ask: { group: null }, find: ["main .page"], scroll: "start", t: ["Settings", "設定"],
    p: ["A tile for each group, saying what it's set to; under them, a short list of what's worth setting, each one click away. The search finds any setting. Want a closer look? Muv shows you each group in a minute.",
      "每個主題一個方塊，寫著目前的設定；下面是「設定小清單」，值得設定的幾件事，點一下就到。搜尋可以找到任何一個設定。想仔細看看嗎？Muv 帶你一個一個看，大概 1 分鐘。"],
    action: [["Show me Settings", "帶我看設定"], "settings"] },
  { tab: "stickers", find: ["main iframe"], t: ["Your own stickers", "你自己的貼圖"],
    p: ["Add your own photos, say who they're from, and sort the cut-outs into Milk, Love, Together or Others. Click any sticker to see its original photo and who took it. Photos: click one of yours to change its credit or delete it. The app's own photos are only to look at.", "加入你自己的照片、標註來自誰，再把去背的貼圖分到 Milk、Love、同框或其他。點任何一張貼圖，就能看到原始照片和拍攝者。「照片」分頁：點你自己的照片，可以改標註或刪除。App 內建的照片只能看。"] },
  { tab: "today", when: () => hasPins(), find: ["#nav [data-tab=pins]"], t: ["Pins", "徽章"],
    p: () => [`In Fan corner: ${pinTotal()} pins to collect. They come with the work you already do, and nothing is ever taken away. Want a look? Muv shows you the Pins page in a minute.`,
      `粉絲角落裡有 ${pinTotal()} 個徽章可以收集。照平常工作就會拿到，拿到的也不會被收回。想看看嗎？Muv 帶你逛一下徽章頁，大概 1 分鐘。`],
    action: [["Show me Pins", "帶我看徽章"], "pins"] },
  { tab: "credits", find: [".muv-help"], t: ["Questions? Ask Muv", "有問題？問 Muv"],
    p: ["Click Muv at the bottom left any time: answers to what people ask most, and a way to email us or message us on X.", "隨時點左下角的 Muv：常見問題的解答，還有寫信或在 X 私訊我們的方法。"] },
  { tab: "credits", scroll: "start", find: [".credit-cards", ".credit-note"], t: ["Thank you!", "謝謝！"],
    p: ["Blumoon, KIU, Lyrac, NGMin, otter, PKYU and wanwannjeab said yes to their photos and drawings (their pictures are on their cards); thank you too to everyone else here, and to the photographers we couldn't reach. That's the tour: have a good day of work! สู้ๆ นะ!",
      "Blumoon、KIU、Lyrac、NGMin、otter、PKYU 和 wanwannjeab 都答應讓我們用他們的照片和插畫（卡片上有他們的頭像）；也謝謝這裡的每一位，還有我們聯絡不到的攝影師。導覽就到這裡，祝你工作順利！สู้ๆ นะ！"] },
];
// The Data tour: the bar, the three tabs, and what's on each (Data › Show me Data).
const DATA = [
  { tab: "week", ask: { tab: "sum", range: "week" }, find: ["main .dbar"], t: ["Which week, month or year", "看哪一週、哪個月、哪一年"],
    p: ["Week, month or year; ‹ › for the one before or after. Make a picture saves a little card of it (six kinds, with a sticker you pick, and doodles and pins to decorate it); Export CSV saves it as a spreadsheet. The bar stays at the top as you scroll.", "週、月或年，用 ‹ › 看前一個、後一個。「存成圖片」會存一張小卡片（六種樣式，貼圖自己挑，還能用塗鴉和徽章裝飾）；「匯出 CSV」會存成試算表。往下捲，這條也一直在最上面。"] },
  { tab: "week", ask: { tab: "sum", range: "week" }, find: ["main .dtabs"], t: ["Three tabs", "三個分頁"],
    p: ["Summary: the numbers at a glance. Analysis: a closer look at how you work. Calendar: each day, and what you did (to change). All three show the same week.", "總覽：一眼看數字。分析：仔細看你怎麼工作。日曆：每一天做了什麼（還能改）。三個分頁都是同一週。"] },
  { tab: "week", ask: { tab: "sum", range: "week" }, find: ["main .dtiles"], t: ["The numbers", "數字"],
    p: ["Four numbers, each against the week before (▲▼), with a little line for the weeks before it: work, an average workday, the days you reached your goal (the ring), and your Pomodoros (or breaks).", "四個數字，每個都跟上週比（▲▼），小線條是之前幾週的變化：工作、平均每個工作天、達標天數（圓環），還有番茄鐘輪數（或休息）。"] },
  { tab: "week", ask: { tab: "sum", range: "week" }, find: ["main .sum-card"], t: ["The summary", "重點整理"],
    p: ["The longest stretch, the days with work, and a few plain sentences: your biggest day, the hours you get the most done, what took the most time.", "最長的一次連續工作、有工作的天數，再用幾句話告訴你：哪天做最多、哪個時段最有效率、什麼事最花時間。"] },
  { tab: "week", ask: { tab: "sum", range: "month" }, find: ["main .chart-card"], scroll: "center", t: ["Each day", "每一天"],
    p: ["A bar for each day in your categories' colours, the period before as an outline; the dashed line is your goal. Switch between work, breaks or both above it. Click a day for a quick look, and the way to change it.", "每天一條，用分類的顏色疊起來，外框是前一段時間；虛線是你的目標。上面可以切換工作、休息或兩個都看。點一天就能快速看那天，還有去修改的連結。"] },
  { tab: "week", ask: { tab: "sum", range: "year" }, find: ["main .chart-card"], scroll: "center", t: ["A year: click a month", "看一年：點一個月"],
    p: ["Each month's bar, last year's as an outline. Click a month and it opens under the chart: its numbers and its days, with Open in Calendar ›. The year stays; ← → for the month before or after, Esc to close.",
      "每個月一條，外框是去年的。點一個月，它會在圖表下面打開：那個月的數字和每一天，還有「在日曆打開 ›」。這一頁還是整年；← → 看前一個月、後一個月，Esc 關起來。"] },
  { tab: "week", ask: { tab: "ana", range: "month" }, find: ["main .where-card"], scroll: "center", t: ["Where the time went", "時間花在哪裡"],
    p: ["Your work by category, in their own colours; click one for its tasks, and a task to see the days you did it. Beside it, your breaks by kind and the time away.",
      "工作依分類排列，用各自的顏色；點一個分類看裡面的每件事，再點一件事，就能看到做它的那幾天。旁邊是休息種類和離開的時間。"] },
  { tab: "week", ask: { tab: "ana", range: "month" }, find: ["main .when-card"], scroll: "center", t: ["When you work", "什麼時候工作"],
    p: ["The hours you work, by day of the week: the deeper the green, the more. Beside it, your typical day: when you usually start, have lunch and stop.", "一週裡每天幾點在工作：綠色越深，做得越多。旁邊是你平常的一天：通常幾點開始、吃午餐、收工。"] },
  { tab: "week", ask: { tab: "ana", range: "month" }, find: ["main .focusq-card", "main .compare-card"], scroll: "center", t: ["How focused, and side by side", "專注程度，和前後比較"],
    p: ["How much of your work came in long stretches, and how often you switched. Then what grew and what shrank since last month, by category and by task. While a month isn't over, it's compared with the same days of the one before.",
      "有多少工作是長時間連續完成的、多常換事情。再看跟上個月比，哪些分類、哪些事情變多或變少。月份還沒過完時，就跟上個月的同幾天比。"] },
  { tab: "week", ask: { tab: "cal", range: "month" }, find: ["main .cal-card"], t: ["Calendar", "日曆"],
    p: ["Each day's focus and hours, the deeper the colour the more; a pink dot on the days you reached your goal. Each row ends with its week: Monday to Sunday, the whole week, even the days of the month before or after. A week shows a card for each day, a year its twelve months.",
      "每天的主題和時數，顏色越深做越多；達標的日子有粉紅點。每一列最後是那一週：週一到週日一整週，也算進前後月份的日子。看一週時是每天一張卡片，看一年時是十二個月。"] },
  { tab: "week", ask: { tab: "cal", range: "month", openDay: true }, find: [".day-panel"], t: ["A day: look, and change it", "那一天：看，也能改"],
    p: ["The day's timeline and a line for each part. Click one to change just that one; a dashed gap is time with nothing logged: click it to add it. ‹ › for the days beside it.", "那天的時間軸，每一段一行。點一段才改那一段；虛線的空白是沒有紀錄的時間，點一下就能補登。用 ‹ › 看前一天、後一天。"] },
  { tab: "week", ask: { tab: "sum", range: "week" }, find: ["main .csv-btn"], t: ["Export CSV", "匯出 CSV"],
    p: ["Every stretch of what's shown, as a spreadsheet for Excel, Numbers or Google Sheets. That's Data!", "把畫面上的每一段時間存成試算表，用 Excel、Numbers 或 Google 試算表都能打開。數據的導覽就到這裡！"] },
];
// The Settings tour: the home page, then a group at a time (Settings › Show me Settings, or the tour's Settings step).
const SETTINGS = [
  { tab: "settings", ask: { group: null }, find: [".set-tiles"], t: ["Settings at a glance", "設定一覽"],
    p: ["What you change most is at the top. Each tile is a group and says what it's set to now; click one to open its page, where ‹ › at the top take you to the one before or after. The search finds any setting.",
      "最常改的放在最上面。每個方塊是一個主題，寫著目前的設定；點一個就打開那一頁，頁面上方的 ‹ › 可以切換到前一個、後一個主題。搜尋可以找到任何一個設定。"] },
  { tab: "settings", ask: { group: null }, find: [".setup-list"], scroll: "center", t: ["Getting set up", "設定小清單"],
    p: ["The few things worth a look, ✓ when they're set. Click one to go straight to it.", "幾件值得看一下的設定，設好了會打 ✓。點一個就直接過去。"] },
  { tab: "settings", ask: { group: "look" }, scroll: "center", find: [".look-card"], t: ["Look & menu bar", "外觀與選單列"],
    p: ["Pick a style here: ten looks, from Sticker Book to Y2K emo and Whimsical. Beside it, the colour theme, the language, and light or dark.",
      "在這裡挑風格：一共十種，從貼紙手帳到 Y2K emo 和 Whimsical。旁邊是主題顏色、語言和淺色、深色。"] },
  { tab: "settings", ask: { group: "look" }, scroll: "center", find: [".doodles-card"], t: ["Doodles", "塗鴉"],
    p: ["Quiet wallpaper (the default: a wallpaper with little easter eggs from the shows), corner stickers, or off (a clean background). Doodle style: match the style, or pick one. Wallpaper strength: one slider for light, one for dark; Reset to balanced puts them back.",
      "安靜的壁紙（預設，藏著小彩蛋的壁紙）、角落貼紙，或關掉（乾淨的背景）。塗鴉畫風：跟著風格，或自己挑一種。壁紙濃淡：淺色、深色各一條滑桿，按「回到平衡值」就能還原。"] },
  { tab: "settings", when: () => hasPins(), ask: { group: "pins" }, scroll: "start", find: [".pins-show-card"], t: ["Pins", "徽章"],
    p: ["Pins has its own page in Settings, after Look: what happens when you earn one, the pin on the buddy's card, a reminder for the birthdays, and the box for codes from fan events.",
      "徽章在「設定」裡有自己的一頁，就在外觀後面：拿到時怎麼通知你、別在夥伴卡片上的徽章、生日提醒，還有輸入粉絲活動兌換碼的地方。"] },
  { tab: "settings", ask: { group: "keep" }, find: [".keep-card"], scroll: "start", t: ["Keeping time & the day", "計時與每天的節奏"],
    p: ["① The two ways (the same as the top of Today) and the Pomodoro's lengths; then the focus screen, ② breaks, ③ goals and ④ how each day starts.", "① 兩種計時方式（跟「今天」最上面一樣）和番茄鐘長度；往下是專注全螢幕、② 休息、③ 目標、④ 每天怎麼開始。"] },
  { tab: "settings", ask: { group: "keep" }, find: [".focus-card .cl-field"], scroll: "center", t: ["Focus screen", "專注全螢幕"],
    p: ["For work away from the computer. Its clock: colours, where it sits, size and opacity. Under it: what's behind the clock, how bright, and whether every Pomodoro round opens it.", "給不在電腦前的工作。時鐘：顏色、位置、大小和不透明度。下面還有：時鐘後面放什麼、多亮，以及要不要每一輪番茄鐘都自動打開。"] },
  { tab: "settings", ask: { group: "rem" }, find: [".sound-card"], scroll: "start", t: ["Reminders & events", "提醒與活動"],
    p: ["The sound when it's time; Apple Reminders and Apple Calendar, in step both ways. Can't see some events? There's a checker inside.", "時間到的音效；Apple 提醒事項和行事曆，兩邊同步。看不到某些活動？裡面有檢查工具。"] },
  { tab: "settings", ask: { group: "cats" }, find: [".cats-card"], scroll: "start", t: ["Categories", "分類"],
    p: ["Your own kinds of work and break: their names, colours and usual minutes; Data uses these colours. Further down, Photo sources: who your photos are credited to, and the sources you added.", "自己的工作分類和休息種類：名稱、顏色和預設的分鐘數，「數據」用的就是這些顏色。往下是「照片來源」：照片標註的來源，還有你自己加的來源。"] },
  { tab: "settings", when: () => !!host?.backup, ask: { group: "about" }, scroll: "center", find: [".data-card"], t: ["Backup & restore", "備份與還原"],
    p: ["Back up now puts everything in one file: your log, reminders, settings, pins, codes and your own photos. Weekly backups stay off until you turn them on. Restore from a backup brings one back; Delete everything asks twice.",
      "「立即備份」會把全部存成一個檔案：工作紀錄、提醒、設定、徽章、兌換碼和你自己的照片。每週自動備份要你打開才會開始。「從備份還原」把備份放回來；「全部刪除」會問你兩次。"] },
  { tab: "settings", ask: { group: "about" }, or: [".about-card"], scroll: "start", find: [".updates-card"], t: ["About & updates", "關於與更新"],
    p: ["Updates: a new version of the app needs a download; new photos and stickers don't (Ask me, Download automatically or Never), and small things like credit fixes and new pins arrive quietly. Then where notices go, the tours again, uninstall. That's Settings!",
      "更新：App 的新版本要下載安裝；新照片與貼圖不用（先問我、自動下載或不要），標註修正、新徽章這些小東西會悄悄更新。下面是通知寄到哪、再看一次導覽、解除安裝。設定的導覽就到這裡！"] },
];
// The Pins tour: the page, then Settings › Pins for codes (Pins › its tour button, or the window's tour's Pins step).
const PINS = [
  { tab: "pins", find: [".pins-top-band"], t: ["Pins", "徽章"],
    p: () => [`Your pins: ${pinTotal()} from the shows, MilkLove and MUVMUV. They come with the work you already do: nothing to lose, no rush.`,
      `你的徽章：${pinTotal()} 個，來自她們的作品、MilkLove 和 MUVMUV。照平常工作就會拿到：不會弄丟，也不用急。`] },
  { tab: "pins", ctx: "pins", find: [".pins-newest"], t: ["Your newest pin", "最新的徽章"],
    p: ["The last one you got, and what it says. Everyone starts with one: a gift, for opening the app. Click a pin to open it; Turn it over shows its back.",
      "你最近拿到的徽章，還有它說的話。每個人一開始都有一個：打開 App 的見面禮。點一下徽章打開它，按「翻到背面」看背面。"] },
  { tab: "pins", ctx: "pins", find: [".pins-next"], t: ["Next up", "快到手了"],
    p: ["The pins you're closest to, and how far to go. Only if you feel like it: a quiet week never takes anything away.",
      "最快拿到的幾個徽章，還差多少。想做再做就好：就算這週比較安靜，也不會少掉任何東西。"] },
  { tab: "pins", ctx: "pins", find: [".pins-views"], t: ["Board or Box", "徽章板或收藏盒"],
    p: ["The Board shows them pinned up; the Box keeps them in drawers, one for each show. All, Collected or Still to find.",
      "徽章板把它們別起來展示；收藏盒把它們收進抽屜，每部作品一個。可以看全部、已收集或還沒拿到。"] },
  { tab: "pins", find: [".pins-cats"], t: ["One show at a time", "一部作品一部作品看"],
    p: ["Pick a show to see only its pins. Your first pin from a show brings that show's series pin with it. Special days are the three birthdays: Love's (23 May), MUVMUV's (24 May) and Milk's (31 July).",
      "選一部作品，只看它的徽章。拿到一部作品的第一個徽章，那部作品的系列徽章也會一起來。「特別的日子」是三個生日：Love（5/23）、MUVMUV（5/24）和 Milk（7/31）。"] },
  { tab: "pins", find: [".pins-board .pn-locked"], scroll: "center", t: ["Still to find", "還沒拿到"],
    p: ["Grey ones are still to find: each says how to get it, not what it looks like. That's the surprise. The ring shows how far along you are.",
      "灰色的是還沒拿到的：只告訴你怎麼拿，不讓你看長相，那是驚喜。外圈顯示你已經走到哪裡了。"] },
  { tab: "pins", find: [".pins-board .pn-secret"], scroll: "center", t: ["A secret pin", "祕密徽章"],
    p: ["??? is a secret: how to get it and what it looks like are both a surprise. All you get is a hint.",
      "「???」是祕密徽章：怎麼拿、長什麼樣子都是驚喜，只會給你一個提示。"] },
  { tab: "pins", find: [".pins-newest"], t: ["Tiers", "等級"],
    p: ["Keep going and a pin moves up: plain, silver rim, gold rim, gem. Each tier has its own line from the show; from gold rim up, it's engraved on the back.",
      "繼續下去，徽章會升級：素面、銀邊、金邊、寶石。每一級都有自己的一句劇中台詞；金邊以上，台詞會刻在背面。"] },
  { tab: "settings", ask: { group: "pins" }, find: [".pins-code-card"], scroll: "center", t: ["Codes from fan events", "粉絲活動的兌換碼"],
    p: ["Got a code at a fan event (MLWH-XXXX-XXXX)? Type it in Settings › Pins and that show's pins unlock straight away, no internet or account needed. That's Pins!",
      "在粉絲活動拿到兌換碼（MLWH-XXXX-XXXX）？到「設定 › 徽章」輸入，那部作品的徽章馬上解鎖，不用網路，也不用帳號。徽章的導覽就到這裡！"] },
];
const TOURS = { app: () => ALL, data: () => DATA, settings: () => SETTINGS, pins: () => PINS };
const stepsOf = (which) => (TOURS[which] || TOURS.app)().filter((s) => (!s.when || s.when()) && !(globalThis.MLHost?.demo && s.tab === "settings"));

// (the steps for how you keep time, worked out when the tour starts)
let STEPS = ALL;

let on = null; // { at, go, nodes, timer }

/** The box around a step's target (several selectors: all of them together), or null. */
function targetBox(step) {
  const there = (list) => (list || []).map((s) => document.querySelector(s)).filter(Boolean).map((e) => e.getBoundingClientRect()).filter((b) => b.width && b.height);
  let boxes = there(step.find);
  if (!boxes.length && step.or) boxes = there(step.or).slice(0, 1);
  if (!boxes.length) return null;
  const l = Math.min(...boxes.map((b) => b.left)), t = Math.min(...boxes.map((b) => b.top));
  return { left: l, top: t, right: Math.max(...boxes.map((b) => b.right)), bottom: Math.max(...boxes.map((b) => b.bottom)) };
}

/** Put the hole over the target and Muv beside it: below, above, right or left, wherever there's room. */
function place() {
  if (!on) return;
  const step = STEPS[on.at], { hole, coach } = on.nodes, vw = innerWidth, vh = innerHeight, pad = 6, gap = 14;
  const b = targetBox(step);
  const cw = coach.offsetWidth, ch = coach.offsetHeight;
  if (!b) { hole.hidden = true; coach.style.left = `${(vw - cw) / 2}px`; coach.style.top = `${(vh - ch) / 2}px`; return; }
  const r = { left: Math.max(4, b.left - pad), top: Math.max(4, b.top - pad), right: Math.min(vw - 4, b.right + pad), bottom: Math.min(vh - 4, b.bottom + pad) };
  hole.hidden = false;
  Object.assign(hole.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.right - r.left}px`, height: `${r.bottom - r.top}px` });
  const clampX = (x) => Math.max(8, Math.min(vw - cw - 8, x)), clampY = (y) => Math.max(8, Math.min(vh - ch - 8, y));
  let x, y;
  if (vh - r.bottom >= ch + gap) { x = clampX(r.left + 24); y = r.bottom + gap; }
  else if (r.top >= ch + gap) { x = clampX(r.left + 24); y = r.top - gap - ch; }
  else if (vw - r.right >= cw + gap) { x = r.right + gap; y = clampY(r.top + 20); }
  else if (r.left >= cw + gap) { x = r.left - gap - cw; y = clampY(r.top + 20); }
  else { x = clampX(r.right - cw - 16); y = clampY(r.bottom - ch - 16); } // (a big target: inside it, bottom right)
  coach.style.left = `${x}px`;
  coach.style.top = `${y}px`;
}

function show(i) {
  on.at = i;
  const step = STEPS[i], { title, text, where, back, next, skip, extra } = on.nodes;
  // (the Pins tour says the Pins page's own words: its Thai "pins›…" entries in th.json where the app has another meaning)
  const say = (pair) => (step.ctx && thaiExact(`${step.ctx}›${pair[0]}`)) || L(...pair);
  title.textContent = say(step.t);
  text.textContent = say(typeof step.p === "function" ? step.p() : step.p);
  // (a step can start another tour, Data's or Settings': it comes back here, to the step after, when it ends)
  extra.hidden = !step.action;
  if (step.action) { extra.textContent = L(...step.action[0]); extra.onclick = () => startTour(on.go, step.action[1], { from: { which: on.which, at: on.at } }); }
  where.textContent = `${i + 1} / ${STEPS.length}`;
  back.hidden = i === 0;
  next.textContent = i < STEPS.length - 1 ? L("Next", "下一步") : on.from ? L("Back to the tour →", "繼續導覽 →") : L("Done", "完成");
  skip.hidden = i === STEPS.length - 1 && !on.from;
  on.go(step.tab, step.ask || {});
  // The tab draws (This week takes a moment): point once the target is there, scrolled into view.
  let tries = 0;
  clearInterval(on.wait);
  on.wait = setInterval(() => {
    const t = [...step.find, ...(step.or || [])].map((s) => document.querySelector(s)).find(Boolean);
    if (t || ++tries > 25) {
      clearInterval(on.wait);
      t?.scrollIntoView({ block: step.scroll || "nearest" });
      if (typeof step.p === "function") text.textContent = say(step.p()); // (words that depend on what's there: the focus screen's button)
      place();
      next.focus();
    }
  }, 120);
  place();
}

export function endTour() {
  if (!on) return;
  clearInterval(on.timer); clearInterval(on.wait);
  removeEventListener("resize", place); removeEventListener("scroll", place, true); removeEventListener("keydown", on.keys, true);
  on.nodes.block.remove();
  on = null;
  dispatchEvent(new Event("mlwh:tour-end")); // (Done, Skip or Esc: a pin moment that waited for the tour plays now, pins-moment.js)
}

/**
 * The end of a tour: one started from the window's tour goes back to it, on the step after. The window's own tour
 * tells the app it's been seen (done: its last step's Done; skipped: Skip or Esc), and a done one counts for the pins.
 */
function finish(how = "done") {
  const back = on?.from && { ...on.from, go: on.go };
  if (on && on.which === "app" && !on.from) tourSeen(how === "done" && on.at === STEPS.length - 1 ? "done" : "skipped");
  endTour();
  if (back) startTour(back.go, back.which, { at: back.at + 1 });
}
function tourSeen(how) {
  host?.settingText?.("tourSeen", how);
  if (how === "done") host?.pins?.note?.("tour-done")?.catch?.(() => {});
}

/**
 * Start the tour ("app": the window's; "settings": Settings card by card; "data"); go(tab) changes the window's tab.
 * from: { which, at }, the tour to go back to when this one ends; at: the step to start on.
 */
export function startTour(go, which = "app", { from = null, at = 0 } = {}) {
  endTour();
  STEPS = stepsOf(which);
  const title = el("b", { className: "tour-title" }), text = el("p", {}), where = el("span", { className: "muted" });
  const back = el("button", { type: "button", className: "btn small", textContent: L("Back", "上一步") });
  const next = el("button", { type: "button", className: "btn primary small" });
  const skip = el("button", { type: "button", className: "tour-skip", textContent: from ? L("Skip, back to the tour", "略過，回到導覽") : which === "app" ? L("Skip the tour", "略過導覽") : L("Stop", "結束") });
  const NAME = { settings: L("Tour of Settings", "設定導覽"), data: L("Tour of Data", "數據導覽"), pins: L("Tour of Pins", "徽章導覽") };
  const extra = el("button", { type: "button", className: "btn small tour-extra", hidden: true });
  const coach = el("div", { className: "tour-coach", role: "dialog", "aria-modal": "true", "aria-label": NAME[which] || L("Tour of the window", "視窗導覽") },
    el("img", { src: "deco/muv-cartoon.webp", alt: "" }),
    el("div", { className: "tour-bubble" }, title, text, extra, el("div", { className: "tour-row" }, skip, where, el("span", { className: "tour-btns" }, back, next))));
  const hole = el("div", { className: "tour-hole" });
  const block = el("div", { className: "tour-block" }, hole, coach); // (also keeps clicks off the page underneath)
  document.body.append(block);
  on = { at: 0, go, which, from, nodes: { block, hole, coach, title, text, where, back, next, skip, extra } };
  back.addEventListener("click", () => show(Math.max(0, on.at - 1)));
  next.addEventListener("click", () => (on.at === STEPS.length - 1 ? finish() : show(on.at + 1)));
  skip.addEventListener("click", () => finish("skip"));
  on.keys = (e) => {
    if (e.key === "Escape") { e.preventDefault(); if (on.which === "app" || on.from?.which === "app") tourSeen("skipped"); endTour(); } // (Esc: every tour, the one it came from too)
    else if (e.key === "ArrowRight") { e.preventDefault(); next.click(); }
    else if (e.key === "ArrowLeft" && on.at > 0) { e.preventDefault(); back.click(); }
  };
  addEventListener("keydown", on.keys, true);
  addEventListener("resize", place);
  addEventListener("scroll", place, true);
  on.timer = setInterval(place, 400); // (the page redraws as the clock ticks)
  show(Math.max(0, Math.min(STEPS.length - 1, at)));
}

export const tourSteps = (which = "app") => stepsOf(which).length;
export const tourWhich = () => on?.which || null;
/** The step on now: what it points at (its selectors), for the tests. */
export const tourTarget = () => (on ? [...STEPS[on.at].find, ...(STEPS[on.at].or || [])] : null);
export const tourOn = () => (on ? on.at : -1);
