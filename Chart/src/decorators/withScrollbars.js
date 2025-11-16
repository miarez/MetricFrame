// src/decorators/withScrollbars.js

/**
 * Attach horizontal / vertical scrollbars to an XYChart.
 *
 * scrollConfig:
 *   {
 *     x: { enabled: true },
 *     y: { enabled: true }
 *   }
 */
export function withScrollbars(root, chart, scrollConfig = {}) {
  const handles = {};

  const xCfg = scrollConfig.x || {};
  if (xCfg.enabled) {
    const scrollbarX = am5xy.XYChartScrollbar.new(root, {
      orientation: "horizontal",
    });
    chart.set("scrollbarX", scrollbarX);
    chart.bottomAxesContainer.children.push(scrollbarX);
    handles.x = scrollbarX;
  }

  const yCfg = scrollConfig.y || {};
  if (yCfg.enabled) {
    const scrollbarY = am5xy.XYChartScrollbar.new(root, {
      orientation: "vertical",
    });
    chart.set("scrollbarY", scrollbarY);
    chart.rightAxesContainer.children.push(scrollbarY);
    handles.y = scrollbarY;
  }

  return handles;
}
