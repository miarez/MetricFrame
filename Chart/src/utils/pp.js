// src/utils/pp.js

/**
 * Pretty Print (pp) — lightweight debugging helper.
 *
 * Usage:
 *   import { pp, debug } from "../utils/pp.js";
 *   debug(); // enable globally
 *   pp.log("Hello");
 *   pp.deep({ nested: { stuff: true } });
 *   pp.table(data);
 *   pp.error("Oops");
 *   pp.hr("Checkpoint");
 */

let DEBUG_ENABLED = true;

/**
 * Enable debug mode globally.
 * Simply call `debug()` (no params).
 */
export function debug() {
  DEBUG_ENABLED = true;
  console.log("%c[DEBUG] Mode Enabled", "color: lime; font-weight: bold;");
}

/**
 * Pretty Print helper — all methods are no-ops unless debug mode is enabled.
 */
export const pp = {
  log(...args) {
    if (!DEBUG_ENABLED) return;
    console.log(...args);
  },

  info(...args) {
    if (!DEBUG_ENABLED) return;
    console.info(...args);
  },

  warn(...args) {
    if (!DEBUG_ENABLED) return;
    console.warn(...args);
  },

  error(...args) {
    if (!DEBUG_ENABLED) return;
    console.error(...args);
  },

  /**
   * Deep inspection (formerly pp.dir)
   */
  deep(val) {
    if (!DEBUG_ENABLED) return;
    console.dir(val, { depth: null });
  },

  /**
   * Tabular display for arrays/objects.
   */
  table(val) {
    if (!DEBUG_ENABLED) return;
    console.table(val);
  },

  /**
   * Horizontal rule / visual separator.
   */
  hr(label = "") {
    if (!DEBUG_ENABLED) return;
    const msg = label ? `--- ${label} ---` : "-------------------------";
    console.log(`%c${msg}`, "color: cyan; font-weight: bold;");
  },
};

// Allow toggling from DevTools: window.debug = true
Object.defineProperty(window, "debug", {
  get: () => DEBUG_ENABLED,
  set: (v) => {
    DEBUG_ENABLED = Boolean(v);
    console.log(
      `%c[DEBUG] ${DEBUG_ENABLED ? "Enabled" : "Disabled"} via window.debug`,
      `color: ${DEBUG_ENABLED ? "lime" : "gray"}; font-weight: bold;`
    );
  },
});
