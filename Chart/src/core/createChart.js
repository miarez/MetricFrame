// src/core/createChart.js

import { resolveChartBuilder } from "./registry.js";

/**
 * Create a chart from a config.
 *
 * Assumes:
 * - Config has been fully normalized at authoring time
 *   (no applyBaseConfig, no runtime merging).
 * - At minimum:
 *     config.container   (DOM id)
 *     config.engine = {
 *       engineType: "XY" | "Radial" | ...,
 *       chartType:  "column" | "line" | "treemap" | ...
 *     }
 * - Data is already attached as config.data (array of objects).
 */
export function createChart(config) {
  if (!config) {
    throw new Error("createChart() requires a config object");
  }

  const containerId = config.container || "chartdiv";

  // --- Root + themes ---

  const root = am5.Root.new(containerId);

  const themes = [];

  // Always animate unless the user explicitly disables it
  const themeCfg = config.theme || {};
  const animated = themeCfg.animated !== false;

  if (animated && typeof am5themes_Animated !== "undefined") {
    themes.push(am5themes_Animated.new(root));
  }

  const mode = (themeCfg.mode || "").toLowerCase();
  if (mode === "dark" && typeof am5themes_Dark !== "undefined") {
    themes.push(am5themes_Dark.new(root));
  }

  if (themes.length > 0) {
    root.setThemes(themes);
  }

  // --- Resolve chart builder from registry ---

  const engine = config.engine || {};
  const { engineType, chartType } = engine;

  const builder = resolveChartBuilder(engineType, chartType);
  if (!builder) {
    // Avoid leaking the root if we can't build the chart
    if (!root.isDisposed()) root.dispose();
    throw new Error(
      `No chart builder registered for engine="${engineType}", chartType="${chartType}"`
    );
  }

  // --- Build the chart via the registered builder ---

  let result;
  try {
    result = builder(root, config);
  } catch (err) {
    if (!root.isDisposed()) root.dispose();
    throw err;
  }

  if (!result || !result.chart) {
    if (!root.isDisposed()) root.dispose();
    throw new Error(
      `Chart builder for engine="${engineType}", chartType="${chartType}" did not return a chart instance`
    );
  }

  // wtf is this todo
  const userCleanup =
    typeof result.cleanup === "function" ? result.cleanup : null;

  const cleanup = () => {
    try {
      if (userCleanup) {
        userCleanup();
      }
    } finally {
      if (!root.isDisposed()) {
        root.dispose();
      }
    }
  };

  // Standardized return shape
  return {
    root,
    cleanup,
    ...result,
  };
}
