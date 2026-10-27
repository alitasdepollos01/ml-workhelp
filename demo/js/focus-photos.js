// The focus screen's photos behind the clock (focus-screen.js; no page needed, so a test can load it).

/** The photographers whose photos may be shown (they gave permission). */
export const PHOTOGRAPHERS = ["Blumoon", "NGMin", "Lyrac", "otter", "KIU", "PKYU"];

/**
 * The photos to shuffle, for the ticks in "Photos by" (by): the photographers ticked (by their credit), and with
 * "mine", the photos you added: any photo that didn't come with the app and isn't one of theirs. Only shown, never changed.
 * photos: [{ url, by: [credits], shipped }]
 */
export function photosFor(photos, by = []) {
  const mine = by.includes("mine");
  return photos.filter((p) => (p.by || []).some((w) => by.includes(w)) || (mine && !p.shipped && !(p.by || []).some((w) => PHOTOGRAPHERS.includes(w))));
}
