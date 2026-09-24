/**
 * One-time import of settings saved while this tool lived at
 * blog.driftking.tw/Schnell-Keypad-Configuration-Tool/. localStorage is tied
 * to the origin, so the page left at that old URL packs its data into
 * `#migrate=<URI-encoded JSON>` and sends the visitor here.
 *
 * Must run before the app mounts: components read localStorage in setup().
 */

// Only the tool's own data. The Supabase session is deliberately left behind;
// signing in again on the new origin is the safe way to move a session.
const MIGRATED_KEYS = [
  "keyconfig",
  "macros",
  "rotaryEncoder",
  "locale",
  "showOnStart",
] as const;

// What the app writes on first load. Only values that differ from these are
// something a visitor would lose if an import overwrote them.
const DEFAULTS: Record<string, string> = {
  keyconfig: "[]",
  macros: '[{"type":0,"name":"Macro 0","keyStrokes":[],"stringContent":""}]',
  rotaryEncoder: '[{"rotaryMap":[0,0,0],"rotaryInfo":[" "," "," "]}]',
};

const PREFIX = "#migrate=";

export function importMigratedData() {
  if (!location.hash.startsWith(PREFIX)) return;

  try {
    const data = JSON.parse(
      decodeURIComponent(location.hash.slice(PREFIX.length))
    ) as Record<string, unknown>;

    const hasLocalData = Object.entries(DEFAULTS).some(([key, empty]) => {
      const value = localStorage.getItem(key);
      return value !== null && value !== empty;
    });
    const overwrite =
      !hasLocalData ||
      confirm(
        "This browser already has settings saved here. Replace them with the ones from the old site?\n\n" +
          "此瀏覽器在新網址已有設定，要用舊網址的設定取代嗎？"
      );

    if (overwrite) {
      for (const key of MIGRATED_KEYS) {
        if (typeof data[key] === "string") localStorage.setItem(key, data[key]);
      }
    }
  } catch (error) {
    console.error("Failed to import settings from the old site", error);
  }

  // Drop the payload so a reload or a shared link does not import it again.
  history.replaceState(null, "", location.pathname + location.search);
}
