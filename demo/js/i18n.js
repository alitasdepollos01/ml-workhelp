// English, Traditional Chinese or Thai, as the desktop app says (MLHost.lang, set in its welcome
// window or menu); English elsewhere (a browser tab). In code: L("English", "中文"); Thai is looked
// up by the English (th.json, th.js), and anything not there yet stays in English. In a page: the
// English in the markup, the Chinese beside it in data-zh (the element's HTML), data-zh-title,
// data-zh-placeholder or data-zh-aria-label; translatePage() swaps them in (Thai: by the English).
import "./th.js";

export const lang = ["zh", "th"].includes(globalThis.MLHost?.lang) ? globalThis.MLHost.lang : "en";
export const zh = lang === "zh";
export const th = lang === "th";
const TH = th ? globalThis.MLTH.make(await fetch(new URL("./th.json", import.meta.url)).then((r) => r.json()).catch(() => null)) : null;
export const L = (en, zhText) => (zh && zhText != null ? zhText : th ? TH.thai(en) : en);
/** Thai for a page's own HTML (an element's English), or null. */
export const thaiHtml = (html) => (th ? TH.html(html) : null);

export function translatePage(root = document) {
  document.documentElement.lang = zh ? "zh-Hant" : th ? "th" : "en";
  document.body?.classList.toggle("lang-zh", zh);
  document.body?.classList.toggle("lang-th", th);
  if (zh) {
    const title = document.querySelector("title[data-zh]");
    if (title) document.title = title.dataset.zh;
    for (const el of root.querySelectorAll("body [data-zh]")) el.innerHTML = el.dataset.zh;
    for (const attr of ["title", "placeholder", "aria-label", "alt", "src"]) {
      for (const el of root.querySelectorAll(`[data-zh-${attr}]`)) el.setAttribute(attr, el.getAttribute(`data-zh-${attr}`));
    }
  } else if (th) {
    document.title = TH.thai(document.title);
    // (inner ones first: an element's English is looked up before the one around it changes)
    for (const el of [...root.querySelectorAll("body [data-zh]")].reverse()) { const t = TH.html(el.innerHTML) ?? TH.thai(el.innerHTML.trim()); if (t != null && t !== el.innerHTML.trim()) el.innerHTML = t; }
    for (const attr of ["title", "placeholder", "aria-label", "alt"]) {
      for (const el of root.querySelectorAll(`[data-zh-${attr}]`)) el.setAttribute(attr, TH.thai(el.getAttribute(attr)));
    }
  }
}
