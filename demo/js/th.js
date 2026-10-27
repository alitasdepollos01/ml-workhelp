// ไทย: the app's Thai, looked up by its English (th.json: { x: { english: thai }, p: [[pattern, thai]], h: { page HTML: thai HTML } }).
// A pattern has {0}, {1}… where the words change ("Round {0}" → "รอบที่ {0}"). Anything not there stays in English.
// Shared by the windows (i18n.js), the app itself (main.js) and the sticker maker (review.js).
(function (root) {
  function make(data) {
    const x = data?.x || {}, h = data?.h || {};
    // Patterns by what they start with (the words before the first {n}), so a lookup tries only a few.
    const byStart = new Map();
    for (const [en, th] of data?.p || []) {
      const start = en.split(/\{\d+\}/)[0];
      const order = [...en.matchAll(/\{(\d+)\}/g)].map((m) => +m[1]);
      // (a placeholder inside a word, "photo{1}", is a plural ending: then every value in it is short and has no spaces,
      // so "{0} photo{1}" can't swallow a whole sentence that happens to say "photo")
      const plural = /[A-Za-z]\{\d+\}|\{\d+\}[A-Za-z]/.test(en);
      const re = new RegExp("^" + en.split(/\{\d+\}/).map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(plural ? "(\\S{0,12}?)" : "([\\s\\S]*?)") + "$");
      const key = start.slice(0, 1); // ("" for a pattern that starts with {0})
      if (!byStart.has(key)) byStart.set(key, []);
      byStart.get(key).push({ re, order, th });
    }
    const memo = new Map();
    function thai(en) {
      if (en == null) return en;
      if (x[en] != null) return x[en];
      if (memo.has(en)) return memo.get(en);
      let out = en;
      for (const p of [...(byStart.get(String(en).slice(0, 1)) || []), ...(byStart.get("") || [])]) {
        const m = p.re.exec(en);
        // (the parts that change can be English too, "12% more": those are looked up as well)
        if (m) { const vals = {}; p.order.forEach((n, i) => { vals[n] = m[i + 1] && m[i + 1] !== en ? thai(m[i + 1]) : m[i + 1]; }); out = p.th.replace(/\{(\d+)\}/g, (_, n) => vals[n] ?? ""); break; }
      }
      if (memo.size < 5000) memo.set(en, out);
      return out;
    }
    const html = (en) => h[String(en).split(/\s+/).join(" ").trim()] ?? null;
    const exact = (en) => x[en] ?? null; // (its own entry only: no patterns)
    return { thai, html, exact };
  }
  if (typeof module === "object" && module.exports) module.exports = { make };
  else root.MLTH = { make };
})(typeof globalThis !== "undefined" ? globalThis : this);
