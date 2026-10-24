// Stickers: the sticker maker (mlwh://maker, the sorter) in the window, with
// a one-line note about the photos you add (open it for the rest) and a line of credits.

import { L, el, host, state, pageTop } from "./app-common.js";
import { buddyStickersCard } from "./buddy-picker.js";

export function renderStickers(main, { go }) {
  const lang = ["zh", "th"].includes(host?.lang) ? host.lang : "en";
  const theme = host?.themes?.().theme || "";
  const st = state.st || {};
  main.append(pageTop({ title: L("Stickers", "貼圖"), sub: L("Add your own photos, sort the cut-outs, and click any sticker to see its original photo and who took it.", "加入自己的照片、把去背的圖分類；點任何一張貼圖，就能看到原始照片和拍攝者。"), spot: "app-stickers-title", className: "stickers-band" }),
    el("div", { className: "stk-top" }, el("details", { className: "stk-notice" }, el("summary", {}, el("b", { textContent: L("Use photos you have the right to use, with their credit. ", "請用你有權使用的照片，並標上來源。") }), L("Stickers you make stay in this app.", "做好的貼圖只會留在這個 App 裡。"), el("span", { className: "muted", textContent: " " + L("More", "看更多") })),
      el("p", { textContent: L("Add only your own photos, or photos whose owner lets people edit them, and say who took each one. Don't use photos marked as not to be edited, reposted or reused. The stickers you make are for you, in this app only: they can't be copied, saved or pasted anywhere else, and please don't share, post or sell them. You're responsible for the photos you add.",
        "只加入你自己拍的照片，或照片主人允許編輯的照片，並標明每張是誰拍的。標明禁止編輯、轉載或二次使用的照片請不要用。你做的貼圖只給你自己在這個 App 裡用：不能複製、另存或貼到其他地方，也請不要分享、發布或販售。你加入的照片由你自行負責。") })),
      host?.setBuddyOff ? buddyStickersCard() : null),
    el("iframe", { className: "maker-frame", src: `stickers-demo.html?lang=${lang}&theme=${encodeURIComponent(theme)}&style=${encodeURIComponent(host?.themes?.().style || "")}&edge=${st.stkEdge || "thin"}&shadow=${st.stkShadow || "soft"}&embedded=1`, title: L("Sticker maker", "貼圖製作") }));
  const more = el("button", { type: "button", className: "btn small", textContent: L("Photo credits…", "照片來源⋯"), style: "justify-self:start" });
  more.addEventListener("click", () => go("credits"));
  main.append(more);
}

// The maker's "how it looks on your desktop" chips: one setting for every sticker on the desktop.
addEventListener("message", (e) => {
  if (!(e.origin === location.origin) || e.data?.type !== "stk-look") return;
  for (const k of ["stkEdge", "stkShadow"]) if (e.data[k]) { host?.settingText?.(k, e.data[k]); if (state.st) state.st[k] = e.data[k]; }
});
