// src/engines/radialEngine.js

/**
 * Create a base RadarChart for circular series (radar/polar).
 *
 * engine config may contain:
 *  - startAngle, endAngle
 *  - innerRadius (number or am5.percent)
 *  - panX, panY, wheelX, wheelY overrides
 */
export function createRadialChart(root, engine = {}) {
  const radialCfg = engine.radial || {};

  const chart = root.container.children.push(
    am5radar.RadarChart.new(root, {
      startAngle: engine.startAngle ?? radialCfg.startAngle ?? -90,
      endAngle: engine.endAngle ?? radialCfg.endAngle ?? 270,
      innerRadius: engine.innerRadius ?? radialCfg.innerRadius ?? 0,
      panX: radialCfg.panX ?? false,
      panY: radialCfg.panY ?? false,
      wheelX: radialCfg.wheelX ?? "none",
      wheelY: radialCfg.wheelY ?? "none",
    })
  );

  return { chart };
}
