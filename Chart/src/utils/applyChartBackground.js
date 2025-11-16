// src/utils/applyChartBackground.js

/**
 * Apply a background to an amCharts chart.
 *
 * `background` can be:
 *   - a string color ("#000000", "red", etc.)
 *   - an object of am5.Rectangle settings ({ fill, fillOpacity, ... })
 */
export function applyChartBackground(root, chart, background) {
  if (!root || !chart || !background) return;

  let rectConfig;

  if (typeof background === "string") {
    rectConfig = {
      fill: am5.color(background),
    };
  } else if (typeof background === "object") {
    rectConfig = { ...background };
    if (rectConfig.fill && typeof rectConfig.fill === "string") {
      rectConfig.fill = am5.color(rectConfig.fill);
    }
  } else {
    // Unsupported type, bail out quietly
    return;
  }

  const bg = am5.Rectangle.new(root, rectConfig);
  chart.set("background", bg);
}
