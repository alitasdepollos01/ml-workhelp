// Fan corner › Pins: the collection. The Board (default: pins on felt with a quiet two-line caption) and the Box (pin
// packaging, a drawer per series with got / total), both with the series chips; the newest pin and what's next up;
// a pin's card (the hero pin on a quiet stage that turns over to its engraved back, "What it says" tier by tier, the
// tier ladder, the streak strip with its forgiven ♥ day, wearing it on the desktop buddy card).
// A pin not earned yet shows its rule and progress on a grey silhouette; a secret one only "???" and a hint
// (pinArt() in pins-common.js: no locked design is ever in the page). Opened on a pin: go("pins", { pin: id }).
import { T, tx, h, css, call, api, load, pinArt, backSrc, backLines, nameOf, tierLabel, unit, progress, saysAt, quoted, whoWhere,
  date, dayDate, LOC, fmt, svgIcon, ensureCss, SERIES } from "./pins-common.js";
import { pageTop } from "./app-common.js";
import { attach as lean } from "./pin3d.js";
import { stage as heroStage, preload as heroPreload } from "./pin-hero.js";

let FILTER = "all";   // all | earned | todo (this window only)
ensureCss();

/** The categories: the series in airing order, then MilkLove · MUVMUV together, then Special days. */
function GROUPS() {
  const SER = SERIES(), home = ["MilkLove", "Muv", "Special days"], one = (x) => ({ id: x.id, ids: [x.id], name: tx(x), color: x.color });
  const ml = SER.find((x) => x.id === "MilkLove"), muv = SER.find((x) => x.id === "Muv");
  return [...SER.filter((x) => !home.includes(x.id)).map(one),
    ...(ml ? [{ id: "MilkLove", ids: ["MilkLove", "Muv"], name: [ml, muv].filter(Boolean).map(tx).join(" · "), color: ml.color }] : []),
    ...SER.filter((x) => x.id === "Special days").map(one)];
}
const inCat = (c, v) => { if (!c || c === "all") return true; const g = GROUPS().find((x) => x.id === c); return !g || g.ids.includes(v.series); };
const byGroups = (list) => GROUPS().map((g) => ({ g, vs: list.filter((v) => g.ids.includes(v.series)) })).filter((x) => x.vs.length);
const passes = (v) => (FILTER === "earned" ? v.earned : FILTER === "todo" ? !v.earned : true);

/** The progress ring round a pin (stroke numbers are SVG attributes, not styles). */
function ring(frac, r = 21) {
  const NS = "http://www.w3.org/2000/svg", c = 2 * Math.PI * r, s = document.createElementNS(NS, "svg");
  s.setAttribute("class", "pn-ring"); s.setAttribute("viewBox", "0 0 48 48"); s.setAttribute("aria-hidden", "true");
  for (const [cls, dash] of [["bg", null], ["fg", `${(c * frac).toFixed(1)} ${c.toFixed(1)}`]]) {
    const e = document.createElementNS(NS, "circle"); e.setAttribute("cx", "24"); e.setAttribute("cy", "24"); e.setAttribute("r", String(r)); e.setAttribute("class", cls);
    if (dash) { e.setAttribute("stroke-dasharray", dash); e.setAttribute("transform", "rotate(-90 24 24)"); }
    s.append(e);
  }
  return s;
}
/** The words a pin says about itself in a tip / for a screen reader. */
function tipText(v) {
  if (v.locked === "secret") return `??? — ${tx(v.hint)}`;
  const pr = progress(v), say = v.earned ? saysAt(v) : null, stop = LOC === "zh-TW" ? "。" : LOC.startsWith("th") ? " " : ". ";
  return `${nameOf(v)}${v.earned ? " · " + tierLabel(v) : ""} — ${say ? quoted(tx(say)) : (tx(v.rule) + stop + pr.line + (LOC === "zh-TW" ? "。" : LOC.startsWith("th") ? "" : ".")).trim()}`;
}
/** One pin, as a button: its picture (pinArt), the ring, a quiet caption (name + tier / rule / hint). */
function pinEl(v, newest) {
  const vis = v.earned ? "earned" : v.locked === "secret" ? "secret" : "locked", pr = progress(v);
  const label = v.earned ? T(`${nameOf(v)}, ${tierLabel(v)}. ${pr.line}.`, `${nameOf(v)}，${tierLabel(v)}。${pr.line}。`, `${nameOf(v)} ${tierLabel(v)} ${pr.line}`) : tipText(v);
  const art = h("span", { className: "pn-art" }, pinArt(v), vis === "secret" ? h("span", { className: "pn-q", "aria-hidden": "true", textContent: "?" }) : null, vis !== "earned" || !pr.done ? ring(pr.frac) : null);
  const cap = h("span", { className: "pn-cap" + (vis === "secret" ? " secret" : "") }, h("b", { textContent: nameOf(v) }),
    h("span", { textContent: vis === "earned" ? tierLabel(v) : vis === "secret" ? tx(v.hint) : tx(v.rule) }));
  return h("button", { type: "button", className: `pn pn-${vis} t-${v.earned ? v.tierId : "none"}${newest ? " pn-new" : ""}`, "data-pin": v.id, "aria-label": label, "data-tip": tipText(v) },
    art, cap, newest && v.earned ? h("span", { className: "pn-newtag", textContent: T("new", "新", "ใหม่") }) : null);
}
function boardView(list, newest) {
  const vs = byGroups(list).flatMap((x) => x.vs);
  return h("div", { className: "pins-board cap-caption" }, h("div", { className: "pb-inner" },
    vs.length ? vs.map((v) => h("div", { className: "pb-cell" }, pinEl(v, v.id === newest))) : h("p", { className: "muted", textContent: T("Nothing here yet.", "這裡還沒有東西。", "ยังไม่มีอะไร") })));
}
function boxView(all, list, newest) {
  const n = all.filter((v) => v.earned).length, groups = byGroups(list);
  return h("div", { className: "pins-box" },
    h("div", { className: "px-lid" }, h("span", { className: "px-brand", textContent: "ML WorkHelp" }), h("b", { textContent: T("Pin collection · vol. 1", "徽章收藏 · 第一彈", "คอลเลกชันเข็มกลัด · ชุดที่ 1") }), h("span", { className: "px-count", textContent: `${n} / ${all.length}` })),
    h("div", { className: "px-drawers" }, groups.length ? groups.map(({ g, vs }) => {
      const of = all.filter((v) => g.ids.includes(v.series));
      return css(h("section", { className: "px-drawer", "data-group": g.id }, h("h4", { className: "px-dh" }, h("span", { textContent: g.name }), h("span", { className: "px-dn", textContent: `${of.filter((v) => v.earned).length} / ${of.length}` })),
        h("div", { className: "px-tray" }, vs.map((v) => h("div", { className: "px-slot" }, pinEl(v, v.id === newest))))), { "--c": g.color });
    }) : h("p", { className: "muted", textContent: T("Nothing here yet.", "這裡還沒有東西。", "ยังไม่มีอะไร") })),
    h("div", { className: "px-foot", textContent: T("Made with love for MilkLove fans · not for sale", "為 MilkLove 粉絲用心做的・非賣品", "ทำด้วยรักเพื่อแฟน MilkLove · ไม่ขาย") }));
}

export async function renderPins(main, { redraw, ask }) {
  ensureCss();
  const data = await load();
  if (!data) {   // a browser tab or the demo: the pins are counted by the desktop app
    main.append(pageTop({ crumb: T("Fan corner", "粉絲角落", "มุมแฟนคลับ"), title: T("Pins", "徽章", "เข็มกลัด"), className: "pins-top-band",
      sub: T("Pins are collected in the desktop app, from your own work log.", "徽章是在桌面版 App 裡，用你自己的工作紀錄收集的。", "เข็มกลัดสะสมได้ในแอปเดสก์ท็อป จากบันทึกงานของคุณเอง") }));
    return;
  }
  const { list, sum } = data, set = sum.settings || {}, n = list.filter((v) => v.earned).length;
  const view = set.view === "box" ? "box" : "board", catNow = set.cat || "all";
  const newest = list.find((v) => v.id === sum.newest && v.earned);
  const save = async (k, v) => { await call("setSetting", k, v); redraw(); };
  main.classList.add("pins-page");
  main.append(pageTop({ crumb: T("Fan corner", "粉絲角落", "มุมแฟนคลับ"), title: T("Pins", "徽章", "เข็มกลัด"), className: "pins-top-band",
    sub: T(`${n} of ${list.length} collected. They come with the work you already do: nothing to lose, no rush.`, `已收集 ${n} / ${list.length} 個。照平常工作就好，徽章會自己找上門：不會弄丟，也不用急。`, `สะสมแล้ว ${n} จาก ${list.length} ชิ้น ได้มาจากงานที่ทำอยู่แล้ว ไม่มีหาย ไม่ต้องรีบ`) }));

  // the newest pin, and the next ones up
  const nu = data.nextUp.map((x) => data.byId.get(x.id)).filter(Boolean);
  const head = h("section", { className: "pins-head" + (newest ? "" : " one") },
    newest ? h("div", { className: "card pins-newest" }, h("h3", { textContent: T("Newest pin", "最新的徽章", "เข็มกลัดล่าสุด") }),
      h("div", { className: "pnw-row" }, h("button", { type: "button", className: "pnw-art", "data-pin": newest.id, "aria-label": T(`Open ${nameOf(newest)}`, `打開 ${nameOf(newest)}`, `เปิด ${nameOf(newest)}`) }, pinArt(newest)),
        h("div", { className: "pnw-txt" }, h("b", { className: "pnw-name", textContent: nameOf(newest) }), h("span", { className: `pnw-tier t-${newest.tierId}`, textContent: tierLabel(newest) }),
          newest.flav ? h("span", { className: "muted", textContent: tx(newest.flav) }) : null, h("span", { className: "muted small", textContent: `${T("Earned", "獲得於", "ได้เมื่อ")} ${date(newest.at)}` })))) : null,
    h("div", { className: "card pins-next" }, h("h3", { textContent: T("Next up", "快到手了", "อีกนิดเดียว") }),
      nu.map((v) => { const pr = progress(v); return h("button", { type: "button", className: "pnx", "data-pin": v.id }, pinArt(v, v.earned ? v.tier : 0, v.earned ? "" : "dim"),
        h("span", { className: "pnx-t" }, h("b", { textContent: nameOf(v) }), h("span", { className: "muted small", textContent: pr.line }), h("span", { className: "gbar" }, css(h("i"), { width: (pr.frac * 100).toFixed(0) + "%" })))); }),
      h("p", { className: "muted small pins-kind", textContent: T("Only if you feel like it. A quiet week never takes anything away.", "想做再做就好；就算這週比較安靜，也不會少掉任何東西。", "ทำเมื่ออยากทำ สัปดาห์ที่เงียบ ๆ ไม่ทำให้อะไรหายไป") })));
  main.append(head);

  // Board / Box, the filter, the series
  const seg = (v, ico, label) => h("button", { type: "button", "data-pv": v, className: view === v ? "on" : "", "aria-pressed": String(view === v) }, svgIcon(ico, "pv-ico"), label);
  const chip = (f, label) => h("button", { type: "button", className: "chip" + (FILTER === f ? " on" : ""), "data-pf": f, "aria-pressed": String(FILTER === f) }, label);
  main.append(h("div", { className: "pins-bar" },
    h("div", { className: "seg pins-views", role: "group", "aria-label": T("View", "檢視", "มุมมอง") }, seg("board", "board", T("Board", "徽章板", "บอร์ด")), seg("box", "box", T("Box", "收藏盒", "กล่อง"))),
    h("div", { className: "row-flex pins-filter" }, chip("all", T("All", "全部", "ทั้งหมด")), chip("earned", T("Collected", "已收集", "ได้แล้ว")), chip("todo", T("Still to find", "還沒拿到", "ยังไม่ได้")))));
  main.append(h("div", { className: "pins-cats", role: "group", "aria-label": T("Series", "作品", "ซีรีส์") },
    h("button", { type: "button", className: "chip" + (catNow === "all" ? " on" : ""), "data-pc": "all", "aria-pressed": String(catNow === "all") }, T("All", "全部", "ทั้งหมด")),
    GROUPS().map((g) => css(h("button", { type: "button", className: "chip cat" + (catNow === g.id ? " on" : ""), "data-pc": g.id, "aria-pressed": String(catNow === g.id) }, h("i"), g.name), { "--c": g.color }))));
  const shown = list.filter((v) => inCat(catNow, v) && passes(v));
  const vw = h("section", { className: "pins-view", "data-view": view }, view === "box" ? boxView(list.filter((v) => inCat(catNow, v)), shown, sum.newest) : boardView(shown, sum.newest));
  main.append(vw,
    h("p", { className: "muted small pins-privacy" }, svgIcon("shield"), " ", T("Counted on this computer from your own work log. Nothing is sent anywhere.", "全部都在這台電腦上、依你自己的工作紀錄計算，不會傳送到任何地方。", "นับจากบันทึกงานของคุณบนคอมพิวเตอร์เครื่องนี้ ไม่มีอะไรถูกส่งออกไป")));
  const tip = h("div", { className: "pn-tipbox", role: "tooltip", hidden: true });
  main.append(tip);

  // earned pins lean towards the pointer and catch the light (never the silhouettes)
  lean(vw, { select: ".pn-earned .pn-art > img", info: (img) => { const v = data.byId.get(img.dataset.pinArt); return v?.earned ? { id: v.id, front: img.src, flip: "none" } : null; } });

  main.addEventListener("click", (e) => {
    const pv = e.target.closest("[data-pv]"); if (pv) return save("view", pv.dataset.pv);
    const pf = e.target.closest("[data-pf]"); if (pf) { FILTER = pf.dataset.pf; return redraw(); }
    const pc = e.target.closest("[data-pc]"); if (pc) return save("cat", pc.dataset.pc);
    const p = e.target.closest("[data-pin]"); if (p) openPin(p.dataset.pin, redraw);
  });
  const tipShow = (e) => {
    const b = e.target.closest?.(".pn"); if (!b) { tip.hidden = true; return; }
    tip.textContent = b.dataset.tip; tip.hidden = false;
    const r = b.getBoundingClientRect(), pr = main.getBoundingClientRect();
    css(tip, { left: Math.max(0, Math.min(pr.width - 260, r.left - pr.left + r.width / 2 - 130)) + "px", top: r.bottom - pr.top + 8 + "px" });
  };
  main.addEventListener("mouseover", tipShow); main.addEventListener("focusin", tipShow);
  main.addEventListener("mouseleave", () => { tip.hidden = true; }); main.addEventListener("focusout", () => { tip.hidden = true; });
  if (ask?.pin) setTimeout(() => openPin(ask.pin, redraw), 200);
  if (sum.unseen?.length || sum.note) call("seen");   // the page has shown them
}

// ---- a pin's card ----
/** "What it says", tier by tier: the lines reached are shown, the next ones wait (no spoilers ahead of time). */
function saysList(v) {
  const multi = v.tiers.length > 1;
  return h("div", { className: "pd-says" }, h("b", { textContent: T("What it says", "上面寫著", "สิ่งที่มันพูด") }),
    h("ol", {}, v.tiers.map((tid, i) => {
      const got = v.earned && v.tier >= i, s = (v.says || []).find((x) => x.tier === tid), tn = multi ? tierLabel(v, i) : tierLabel(v, 0);
      const at = (v.ladder || []).find((x) => x.tier === tid), atText = at ? (at.label ? tx(at.label) : unit(v.counter, at.at)) : "";
      return h("li", { className: got ? "got" : "" }, h("span", { className: `pd-st t-${tid}`, textContent: tn }),
        got && s ? h("span", {}, quoted(tx(s)), whoWhere(s) ? h("span", { className: "muted", textContent: ` — ${whoWhere(s)}` }) : null)
          : h("span", { className: "muted", textContent: multi ? T(`Reach ${tn} to hear it (${atText}).`, `升到${tn}就會聽到（${atText}）。`, `ถึง${tn}แล้วจะได้ยิน (${atText})`) : T("Earn it to hear it.", "拿到就會聽到。", "ได้แล้วจะได้ยิน") }));
    })));
}
/** The run, the last two weeks: weekends rest, one missed weekday a week is forgiven (♥), and it says so. */
function streakStrip(sk) {
  if (!sk?.days?.length) return null;
  const wd = (t, f) => new Date(t).toLocaleDateString(LOC, { weekday: f });
  const lab = { work: T("worked", "有工作", "ทำงาน"), off: T("weekend", "週末", "วันหยุด"), forgiven: T("forgiven", "不算中斷", "ยกให้"), missed: T("missed", "沒工作", "ขาด"), today: T("today", "今天", "วันนี้"), before: "" };
  const fg = sk.days.filter((d) => d.st === "forgiven");
  return h("div", { className: "pd-streak" }, h("b", { textContent: T("Your run, the last two weeks", "最近兩週的連續紀錄", "สองสัปดาห์ที่ผ่านมา") }),
    h("ol", { className: "sk" }, sk.days.map((d) => { const t = dayDate(d.day);
      return h("li", { className: `sk-${d.st}`, title: `${wd(t, "long")} ${new Date(t).getDate()}: ${lab[d.st] || ""}` }, h("span", { textContent: wd(t, "narrow") }),
        d.st === "forgiven" ? h("i", { "aria-hidden": "true", textContent: "♥" }) : d.st === "work" ? h("i", { "aria-hidden": "true", textContent: "✓" }) : null,
        h("span", { className: "sr", textContent: lab[d.st] || "" })); })),
    fg.map((d) => { const t = dayDate(d.day); return h("p", { className: "sk-note", textContent: "♥ " + T(`${wd(t, "long")} (${date(t)}) was forgiven: one missed weekday a week doesn't break your run.`, `${wd(t, "long")}（${date(t)}）不算中斷：每週可以有一個平日沒工作，連續紀錄照樣算。`, `${wd(t, "long")} (${date(t)}) ได้รับการยกให้ ขาดวันธรรมดาหนึ่งวันต่อสัปดาห์ ไม่ทำให้สถิติขาด`) }); }));
}
/** Open a pin's card (a dialog over the page). */
export async function openPin(id, redraw = () => {}) {
  ensureCss();
  const v = await call("detail", id); if (!v) return null;
  document.querySelector(".pins-dlg")?.remove();
  const secret = v.locked === "secret", k = Math.max(0, v.tier), pr = progress(v);
  if (v.earned) heroPreload();
  const flip = h("div", { className: "pd-flip", "data-side": "front" });
  if (v.earned) {
    const line = () => dlg.querySelector(".pd-back-line");
    const st = heroStage({ id: v.id, tier: v.tierId, front: pinArt(v).src, back: backSrc(v), lines: backLines(v, k, date(v.at)), lang: document.documentElement.lang === "zh-Hant" ? "zh" : document.documentElement.lang, label: nameOf(v) },
      { onSide: (b) => { flip.dataset.side = b ? "back" : "front"; const l = line(); if (l) l.hidden = !b; } });
    flip.classList.add("p3d-cab"); flip.append(st);
  } else flip.append(h("div", { className: "pd-card" }, pinArt(v, 0, "pd-front"), secret ? h("span", { className: "pd-q", "aria-hidden": "true", textContent: "?" }) : null));
  const flipBtn = v.earned ? h("button", { type: "button", className: "btn small pd-flipbtn" }, svgIcon("flip"), " ", T("Turn it over", "翻到背面", "พลิกดูด้านหลัง")) : null;
  const ladder = !secret && v.tiers.length > 1 ? h("ol", { className: "pd-ladder" }, v.tiers.map((tid, i) => { const got = v.earned && v.tier >= i, at = (v.ladder || [])[i];
    return h("li", { className: got ? "got" : "" }, pinArt(v, i), h("b", { textContent: tierLabel(v, i) }), h("span", { className: "muted small", textContent: at?.label ? tx(at.label) : unit(v.counter, v.t[i]) }), got ? svgIcon("check", "pd-ok") : null); })) : null;
  const sk = v.counter === "streak" ? await call("streak") : null;
  const wearing = (await call("summary"))?.settings?.buddyPin === v.id;
  const wear = v.earned ? h("input", { type: "checkbox", className: "pd-wear", checked: wearing }) : null;
  const ser = SERIES().find((x) => x.id === v.series);
  const dlg = h("div", { className: "pins-dlg", role: "dialog", "aria-modal": "true", "aria-label": nameOf(v) },
    h("div", { className: "pd-box card" },
      h("button", { type: "button", className: "pd-x linkish", "aria-label": T("Close", "關閉", "ปิด") }, svgIcon("x", "")),
      h("div", { className: "pd-main" }, flip, flipBtn),
      h("div", { className: "pd-text" },
        h("span", { className: "muted small", textContent: `${tx(ser) || v.series} · No. ${String(v.no).padStart(2, "0")}` }),
        h("h3", { className: "pd-name", textContent: nameOf(v) }),
        h("span", { className: `pnw-tier t-${v.earned ? v.tierId : "none"}`, textContent: v.earned ? tierLabel(v) : T("Not yet", "還沒拿到", "ยังไม่ได้") }),
        v.earned ? (v.flav ? h("p", { className: "pd-flav", textContent: tx(v.flav) }) : null)
          : h("p", { className: "pd-flav muted", textContent: secret ? T("A secret pin: its rule and its design are both a surprise.", "祕密徽章：怎麼拿、長什麼樣子，都是驚喜。", "เข็มกลัดลับ: ทั้งวิธีได้และหน้าตาเป็นเซอร์ไพรส์") : T("What it looks like, and what it says, is the surprise when you earn it.", "長什麼樣子、會說什麼話，拿到的時候才知道。", "หน้าตาและคำที่มันพูด จะรู้ตอนได้รับ") }),
        v.back ? h("p", { className: "pd-back-line", hidden: true }, svgIcon("flip"), " ", `${T("Engraved on the back", "背面刻著", "สลักไว้ด้านหลัง")}: ${tx(v.back)}`) : null,
        h("p", {}, h("b", { textContent: `${secret ? T("A hint", "提示", "คำใบ้") : T("How", "怎麼拿", "วิธีได้")}: ` }), tx(secret ? v.hint : v.rule)),
        v.dateLabel ? h("p", { className: "muted small", textContent: tx(v.dateLabel) }) : null,
        secret ? null : h("div", { className: "pd-prog" }, h("span", { className: "muted small", textContent: v.counter ? `${T("You have", "目前", "ตอนนี้")} ${unit(v.counter, v.value ?? 0)} · ${pr.line}` : pr.line }),
          h("span", { className: "gbar" }, css(h("i"), { width: (pr.frac * 100).toFixed(0) + "%" }))),
        ladder,
        v.earned ? saysList(v) : null,
        streakStrip(sk),
        v.earned && v.hist?.length ? h("ul", { className: "pd-hist muted small" }, v.hist.map((x) => h("li", { textContent: `${tierLabel(v, x.tier)} · ${date(x.at)}` }))) : null,
        v.earned ? h("div", { className: "pd-use" }, h("b", { textContent: T("Use it", "別起來", "ใช้งาน") }),
          h("label", {}, wear, " ", T("Wear it on the desktop buddy card", "別在桌面夥伴的卡片上", "ติดบนการ์ดของบัดดี้")),
          h("span", { className: "muted small", textContent: T("It's also in Decorate your card › Pins (only pins you've collected show there).", "在「裝飾圖卡 › 徽章」裡也找得到（只會列出你已收集的）。", "ใช้ได้ใน ตกแต่งการ์ด › เข็มกลัด ด้วย (แสดงเฉพาะที่สะสมแล้ว)") })) : null)));
  const close = () => { dlg.remove(); };
  const turn = () => { const st = flip.querySelector(".ph-stage"); st?.hero?.turn?.(); };
  dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target.closest(".pd-x")) close(); if (e.target.closest(".pd-flipbtn")) turn(); });
  dlg.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  wear?.addEventListener("change", async () => { await call("wear", wear.checked ? v.id : null); redraw(); });
  document.body.append(dlg);
  (dlg.querySelector(".pd-flipbtn") || dlg.querySelector(".pd-x")).focus();
  new MutationObserver((_, mo) => { if (!dlg.isConnected) { mo.disconnect(); flip.querySelector(".ph-stage")?.hero?.destroy?.(); } }).observe(document.body, { childList: true });
  return dlg;
}
export { api as pinsAvailable };
