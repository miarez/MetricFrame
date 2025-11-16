// src/decorators/withCursor.js

/**
 * Attach an XY cursor and optional axis tooltip.
 *
 * cursorConfig:
 *   {
 *     enabled: true,
 *     behavior: "none" | "zoomX" | "zoomY" | "zoomXY",
 *     showLineX: true,
 *     showLineY: true,
 *     xAxisTooltip: { enabled: true, categoryFormat: "{value}" | "{category}" }
 *   }
 */
export function withCursor(root, chart, xAxis, yAxis, cursorConfig = {}) {
  if (!cursorConfig.enabled) return null;

  const behavior = cursorConfig.behavior || "none";

  const cursor = chart.set(
    "cursor",
    am5xy.XYCursor.new(root, {
      behavior,
    })
  );

  cursor.lineX.set("visible", cursorConfig.showLineX ?? true);
  cursor.lineY.set("visible", cursorConfig.showLineY ?? true);

  const xTooltipCfg = cursorConfig.xAxisTooltip || {};
  if (xAxis && xTooltipCfg.enabled !== false) {
    // Try to detect if this is a CategoryAxis
    const isCategoryAxis =
      xAxis.className && String(xAxis.className).indexOf("CategoryAxis") !== -1;

    let labelText = xTooltipCfg.categoryFormat;

    // Pick sensible defaults
    if (!labelText) {
      labelText = isCategoryAxis ? "{category}" : "{value}";
    }

    // Backward compat: treat "{value}" as "{category}" on CategoryAxis
    if (isCategoryAxis && labelText.includes("{value}")) {
      labelText = labelText.replace("{value}", "{category}");
    }

    xAxis.set(
      "tooltip",
      am5.Tooltip.new(root, {
        labelText,
      })
    );
  }

  return cursor;
}
