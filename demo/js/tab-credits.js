// Photo credits: who the photos and drawings come from (and many others we
// can't tell exactly), how to ask for credit or removal, and any sticker's
// original photo, watermark and all (also from a buddy's right-click menu).

import { L, el, host, toast, modal } from "./app-common.js";
import { pageTop } from "./app-common.js";

let data = null;
const enc = (s) => String(s).split("/").map(encodeURIComponent).join("/");
const stickerUrl = (s) => `photos/stickers/${s.set}/${enc(s.name)}`;
const photoUrl = (src) => `photos/shuffle/${enc(src)}`;

/** The people a photo is credited to, as links. */
function creditLine(tags) {
  const ppl = [].concat(tags || []).map((t) => data.people[t]).filter(Boolean);
  if (!ppl.length) return el("span", { className: "muted", textContent: L("We can't tell whose photo this is: check its watermark.", "不確定這是誰的照片：可以看看上面的浮水印。") });
  return el("span", {}, "", ...ppl.flatMap((p, i) => [i ? " · " : "", p.url ? el("a", { href: p.url, target: "_blank", rel: "noopener", textContent: `${p.name} ${p.handle}` }) : L(p.name, p.zh || p.name)]));
}

/** A sticker's original photo, with its credit. */
export function showOriginal(s) {
  const { box } = modal(L("The original photo", "原始照片"));
  const ph = s.source ? el("img", { className: "ph", src: photoUrl(s.source), alt: L("The original photo", "原始照片") }) : el("p", { className: "muted", textContent: L("This sticker's original photo isn't in this copy of the app.", "這個版本的 App 沒有這張貼圖的原始照片。") });
  if (s.source) ph.addEventListener("click", () => ph.classList.toggle("zoom"));
  const c = data.contact;
  box.append(el("div", { className: "orig" }, el("div", { style: "display:grid;gap:8px" }, el("img", { className: "st", src: stickerUrl(s), alt: "" }), creditLine(data.credits[s.source])), ph),
    el("p", { className: "muted" }, L("Look for a watermark on the photo to see who it belongs to (click it to zoom). Wrong or missing credit? Email ", "可以找找照片上的浮水印，看看是誰的照片（點照片可以放大）。來源標錯或漏掉了？請寄信到 "),
      el("a", { href: `mailto:${c.mail}`, textContent: c.mail }), L(" or message ", " 或在 X 私訊 "), el("a", { href: c.xUrl, target: "_blank", rel: "noopener", textContent: c.x }), L(" on X (Twitter).", "。")));
}

export async function renderCredits(main, { ask }) {
  try { data = await host.photoCredits(); } catch { data = null; }
  main.append(pageTop({ crumb: L("Photos & credits", "照片來源"), title: L("Thank you to the photographers and artist", "謝謝攝影師和畫家"),
    sub: L("We've been given permission to use photos by Blumoon, Lyrac, NGMin and otter, and the cartoon drawings by wanwannjeab. Click any sticker to see its original photo and who took it.",
      "我們已經得到 Blumoon、Lyrac、NGMin、otter 的照片，以及 wanwannjeab 的卡通插畫的使用許可。點任何一張貼圖，就能看到原始照片和拍攝者。"), spot: "app-credits-top", className: "credits-band" }));
  if (!data) { main.append(el("p", { className: "muted", textContent: "…" })); return; }
  const c = data.contact;
  // The ones who said yes: a card each.
  const FEATURED = [["Blumoon", "photo"], ["Lyrac", "photo"], ["NGMin", "photo"], ["otter", "photo"], ["wanwannjeab", "draw"]];
  const svg = (kind) => { const ns = "http://www.w3.org/2000/svg", s = document.createElementNS(ns, "svg");
    for (const [k, v] of Object.entries({ viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" })) s.setAttribute(k, v);
    for (const d of kind === "draw" ? ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"] : ["M4 8h3l2-3h6l2 3h3v11H4z", "M12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"]) { const p = document.createElementNS(ns, "path"); p.setAttribute("d", d); s.append(p); }
    return s; };
  // Everyone whose photos (or drawings) are in the app: the same card each; the ones who gave permission marked ✓.
  const featured = new Set(FEATURED.map(([k]) => k));
  const SHORT = { Milk: "Milk", Love: "Love", wanwannjeab: "wanwannjeab", alitasdepollo: "alitasdepollos" };
  const what = (k) => k === "wanwannjeab" ? L("Cartoon Muv drawings", "卡通 Muv 插畫") : k === "GMMTV" ? L("Official photos", "官方照片") : k === "Milk" || k === "Love" ? L("Her posts", "她的貼文")
    : k === "alitasdepollo" ? L("Photos & Muv drawings", "照片和 Muv 插畫") : L("Photos", "照片");
  const all = [...FEATURED.map(([k]) => k), ...data.order.filter((k) => !featured.has(k))].filter((k) => data.people[k]);
  main.append(el("section", { className: "credit-cards all" }, all.map((k) => { const p = data.people[k];
    return el("div", { className: "credit-card" + (featured.has(k) ? " ok" : "") },
      featured.has(k) ? el("span", { className: "cc-ok", textContent: "✓", title: L("Gave us permission", "已同意我們使用") }) : null,
      el("span", { className: "cc-ic" }, svg(k === "wanwannjeab" ? "draw" : "photo")), el("b", { textContent: SHORT[k] || p.name }),
      p.url ? el("a", { href: p.url, target: "_blank", rel: "noopener", textContent: p.handle }) : null,
      el("span", { className: "muted", textContent: what(k) })); })));
  main.append(el("section", { className: "credit-note" }, el("b", { textContent: "ⓘ" }),
    el("p", {}, L("For the other photos we tried to reach the photographers but haven't heard back. We've done our best to find and credit everyone; if a photo is yours and you'd like the credit changed or the photo removed, tell us any time at ",
      "其他照片我們都試著聯絡過攝影師，但還沒有收到回覆。我們已經盡力找出並標註每一位；如果其中有你的照片，想更改標註或希望移除，隨時告訴我們："),
      el("a", { href: `mailto:${c.mail}`, textContent: c.mail }), L(" or ", " 或 "), el("a", { href: c.xUrl, target: "_blank", rel: "noopener", textContent: c.x }),
      L(" on X, and we'll fix it in the next update and let everyone know.", "（X），我們會在下一次更新修正，並告訴大家。"))));
  // Sources you added yourself, crediting your own photos: only on this Mac. Tell us to add one for everyone.
  const mine = (data.mine || []).map((k) => data.people[k]).filter(Boolean);
  if (mine.length) main.append(el("section", { className: "card mine-card" }, el("h3", { textContent: L("Sources you added", "你加的來源") }),
    el("p", { className: "muted", textContent: L("From crediting photos you added. They're only on this Mac: tell us about one and we can add it for everyone.", "這些是你幫自己加的照片標註的來源，只存在這台 Mac 上。告訴我們，我們就能幫所有人加上。") }),
    el("ul", { className: "credit-list" }, mine.map((p) => {
      const tell = el("button", { type: "button", className: "linkish", textContent: L("Tell us about this source", "告訴我們這個來源") });
      tell.addEventListener("click", () => window.__mlwhApp?.go("help", { mail: { kind: 3, text: L(`A new photo source: ${p.name}${p.url ? " " + p.url : ""}`, `新的照片來源：${p.name}${p.url ? " " + p.url : ""}`) } }));
      return el("li", {}, el("b", { textContent: p.name }), " ", p.url ? el("a", { href: p.url, target: "_blank", rel: "noopener", textContent: p.handle || p.url }) : null,
        el("span", { className: "mine-badge", textContent: L("added by you", "你加的") }), " ", tell);
    }))));
  // Whose is this sticker?
  const withPhoto = data.stickers.filter((s) => s.source);
  const pick = withPhoto.filter((s) => (data.credits[s.source] || []).some((t) => data.people[t])).sort(() => Math.random() - 0.5).slice(0, 8);
  main.append(el("section", { className: "card whose-card" }, el("h3", { textContent: L("Whose is this sticker?", "這張貼圖是誰的？") }),
    el("p", { textContent: L("For many photos we can't tell exactly whose account they come from. Click any sticker (here, in Stickers, or right-click the desktop buddy) to see the original photo it was cut from, and check its watermark. If a photo is yours and you'd like to be credited, or would rather it were removed, please email or message us. We've surely missed someone or got a credit wrong, and we're happy to fix it.",
      "有很多照片我們不確定來自哪個帳號。點任何一張貼圖（這裡、「貼圖」分頁，或在桌面夥伴上按右鍵），就能看到原始照片和上面的浮水印。如果其中有你的照片，想被標註或希望移除，請寄信或私訊我們。一定有漏掉或標錯的地方，我們很樂意更正。") }),
    pick.length ? el("div", { className: "sticker-strip" }, pick.map((s) => { const i = el("img", { src: stickerUrl(s), alt: L("A sticker: see its original photo", "貼圖：看原始照片"), tabIndex: 0, "data-credit": L("Photo: ", "照片：") + [].concat(data.credits[s.source] || []).map((t) => data.people[t]?.name || t).join(" · ") }); i.addEventListener("click", () => showOriginal(s)); i.addEventListener("keydown", (e) => { if (e.key === "Enter") showOriginal(s); }); return i; }))
      : el("p", { className: "muted", textContent: L("No stickers with an original photo yet.", "還沒有附原始照片的貼圖。") })));
  main.append(el("section", { className: "credit-note please-note" }, el("b", { textContent: "♡" }), el("h3", { textContent: L("Please note", "請注意") }),
    el("p", { className: "muted", textContent: L("ML WorkHelp is unofficial and fan-made. The developer owns none of these photos; they're for your personal, non-commercial use only.", "ML WorkHelp 是粉絲自製的非官方 App。開發者並不擁有這些照片；只供個人、非商業用途使用。") })));
  // From a buddy's menu: that sticker's photo.
  if (ask?.sticker) {
    const s = data.stickers.find((x) => x.name === ask.sticker);
    if (s) showOriginal(s); else toast(L("That sticker's photo isn't known.", "找不到那張貼圖的原始照片。"));
  }
}
