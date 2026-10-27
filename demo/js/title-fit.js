// Y2K emo's page titles stay on one line (SYNC.md round 11): a title that still wraps at 26 px (--title-size) steps
// down 1 px at a time to 22 px (--title-fit on the h2, through CSSOM), and only then wraps (balanced, skins-new.css).
// On Today, "Show me around" sits on the date line (skins-new.css), so the greeting gets the whole strip.
const R = document.documentElement;

export function fitTitle() {
  const h = document.querySelector("main .page .page-top h2");
  if (!h) return;
  if (!/^i/.test(R.dataset.style || "")) { if (h.style.getPropertyValue("--title-fit")) h.style.removeProperty("--title-fit"); delete h.dataset.fitKey; return; }
  const key = h.textContent + "|" + h.querySelectorAll("img").length + "|" + innerWidth + "|" + (R.lang || "");
  if (h.dataset.fitKey === key) return;
  h.style.removeProperty("--title-fit");
  const one = () => h.getBoundingClientRect().height < parseFloat(getComputedStyle(h).lineHeight) * 1.4;
  let fs = parseFloat(getComputedStyle(h).fontSize);
  while (!one() && fs > 22) { fs -= 1; h.style.setProperty("--title-fit", fs + "px"); }
  h.dataset.fitKey = key;
}

let t = 0;
const later = () => { if (!t) t = setTimeout(() => { t = 0; fitTitle(); }, 0); };
export function startTitleFit() {
  const main = document.getElementById("main");
  if (main) new MutationObserver(later).observe(main, { childList: true, subtree: true, characterData: true });
  new MutationObserver(later).observe(R, { attributes: true, attributeFilter: ["data-style", "lang"] });
  addEventListener("resize", later);
  document.fonts?.ready.then(() => { const h = document.querySelector("main .page .page-top h2"); if (h) delete h.dataset.fitKey; later(); });
  later();
}
