// src/charts/xy/seriesSeries/beeswarm.js

import { createXYChart } from "../../../engines/xyEngine.js";
import { applyChartBackground } from "../../../utils/applyChartBackground.js";
import { withLegend } from "../../../decorators/withLegend.js";
import { withCursor } from "../../../decorators/withCursor.js";
import { withScrollbars } from "../../../decorators/withScrollbars.js";

export function beeswarmChart(root, config) {
  const d3 = window.d3;
  if (!d3) {
    throw new Error(
      "Beeswarm charts require d3 to be loaded (window.d3 is missing)."
    );
  }

  const engine = config.engine || {};
  const data = Array.isArray(config.data) ? config.data : [];

  const axesCfg = engine.axes || {};
  const xCfg = axesCfg.x || {};
  const yCfgs = Array.isArray(axesCfg.y)
    ? axesCfg.y
    : axesCfg.y
    ? [axesCfg.y]
    : [];

  const firstYCfg = yCfgs[0] || {};

  const seriesDefs = Array.isArray(engine.series) ? engine.series : [];
  const sDef = seriesDefs[0] || {};

  // ---- FIELDS ----
  const xField = sDef.xField || engine.xField || engine.fields?.x || "x";
  const yField = sDef.yField || engine.yField || engine.fields?.y || "y";
  const valueField =
    sDef.valueField ||
    sDef.field ||
    engine.valueField ||
    engine.fields?.value ||
    "value";

  // ---- CHART ----
  const { chart } = createXYChart(root, engine);

  // Hug container, similar to legacy
  chart.setAll({
    panX: true,
    panY: true,
    wheelY: "zoomXY",
    pinchZoomX: true,
    pinchZoomY: true,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
  });

  // ---- AXES ----

  const xAxis = chart.xAxes.push(
    am5xy.ValueAxis.new(root, {
      renderer: am5xy.AxisRendererX.new(root, {
        minGridDistance: 30,
      }),
      min: xCfg.min ?? undefined,
      max: xCfg.max ?? undefined,
      strictMinMax: xCfg.strictMinMax ?? false,
      extraMin: 0.01,
      extraMax: 0.01,
    })
  );

  const yRenderer = am5xy.AxisRendererY.new(root, {
    minGridDistance: 20,
  });

  const yAxis = chart.yAxes.push(
    am5xy.ValueAxis.new(root, {
      renderer: yRenderer,
      visible: true,
      strictMinMax: true,
      min: firstYCfg.min,
      max: firstYCfg.max,
    })
  );

  // hide Y grid, keep axis line + labels
  yRenderer.grid.template.set("forceHidden", true);

  yRenderer.labels.template.setAll({
    visible: true,
    forceHidden: false,
  });

  yRenderer.ticks.template.setAll({
    visible: true,
    forceHidden: false,
  });

  // ---- SERIES ----

  const series = chart.series.push(
    am5xy.LineSeries.new(root, {
      calculateAggregates: true,
      xAxis,
      yAxis,
      valueXField: xField,
      valueYField: yField,
    })
  );

  // no connecting line – bullets only
  series.strokes.template.set("visible", false);

  // bullet appearance
  const circleTemplate = am5.Template.new({});

  series.bullets.push(() => {
    const bulletCircle = am5.Circle.new(
      root,
      {
        radius: 5,
        fill: series.get("fill"),
        fillOpacity: 0.8,
        tooltipText: `{${xField}}`,
        tooltipY: 0,
      },
      circleTemplate
    );

    bulletCircle.states.create("hover", {
      fill: chart.get("colors").getIndex(4),
    });

    return am5.Bullet.new(root, {
      sprite: bulletCircle,
    });
  });

  // Heat rule: radius based on valueField
  const minRadius = sDef.minRadius ?? engine.options?.minRadius ?? 2;
  const maxRadius = sDef.maxRadius ?? engine.options?.maxRadius ?? 9;

  series.set("heatRules", [
    {
      target: circleTemplate,
      min: minRadius,
      max: maxRadius,
      dataField: valueField,
      key: "radius",
    },
  ]);

  // ---- DATA + AXIS FITTING ----

  // ensure yField exists; if not, default to 0
  const normalizedData = data.map((row) => {
    if (row[yField] == null) {
      return { ...row, [yField]: 0 };
    }
    return row;
  });

  series.data.setAll(normalizedData);

  // auto-fit X to data
  let xMin = Infinity;
  let xMax = -Infinity;

  for (const row of normalizedData) {
    const v = Number(row[xField]);
    if (!Number.isNaN(v)) {
      if (v < xMin) xMin = v;
      if (v > xMax) xMax = v;
    }
  }

  if (xMin < Infinity && xMax > -Infinity) {
    const padding = (xMax - xMin) * 0.02; // 2% each side
    xAxis.setAll({
      min: xMin - padding,
      max: xMax + padding,
      strictMinMax: true,
      extraMin: 0,
      extraMax: 0,
    });
  }

  // vertical extent around 0; D3 will jitter within this
  const verticalExtent = (maxRadius || 9) * 0.8;

  yAxis.setAll({
    min: -verticalExtent,
    max: verticalExtent,
    strictMinMax: true,
  });

  // ---- D3 FORCE LAYOUT ----

  const simulation = d3.forceSimulation();
  const collisionForce = d3.forceCollide();
  const nodes = [];

  function updatePositions() {
    if (!nodes.length) return;

    const plotHeight = chart.plotContainer.innerHeight();
    if (!plotHeight) return;

    let minY = Infinity;
    let maxY = -Infinity;
    for (const node of nodes) {
      if (node.y < minY) minY = node.y;
      if (node.y > maxY) maxY = node.y;
    }
    const span = maxY - minY || 1;

    const targetSpan = plotHeight * 0.7;
    const scale = targetSpan / span;

    const simMid = (minY + maxY) / 2;
    const plotMid = plotHeight / 2;

    am5.array.each(nodes, function (node) {
      const circle = node.circle;
      const scaledY = (node.y - simMid) * scale + plotMid;

      circle.setAll({
        dy: scaledY - circle.y(),
      });

      node.fx = circle.x();
    });
  }

  simulation.on("tick", updatePositions);

  function addNode(dataItem) {
    const bullets = dataItem.bullets;
    if (!bullets || !bullets.length) return;

    const bullet = bullets[0];
    const circle = bullet.get("sprite");
    if (!circle) return;

    const node = {
      fx: circle.x(),
      y: circle.y(),
      circle,
    };

    nodes.push(node);
  }

  function updateForces() {
    simulation.force("collision", collisionForce);

    collisionForce.radius(function (node) {
      const circle = node.circle;
      return circle.get("radius", 1) + 1;
    });
  }

  series.events.on("datavalidated", function () {
    setTimeout(function () {
      nodes.length = 0;
      am5.array.each(series.dataItems, function (dataItem) {
        addNode(dataItem);
      });
      simulation.nodes(nodes);
      updateForces();
      simulation.alpha(1).restart();
    }, 500);
  });

  chart.plotContainer.events.on("boundschanged", function () {
    updateForces();
    simulation.alpha(1).restart();
  });

  chart.appear(1000, 100);

  // ---- DECORATORS ----

  if (config.theme && config.theme.background) {
    applyChartBackground(root, chart, config.theme.background);
  }

  const legend = withLegend(root, chart, [series], config.legend || {});
  const cursor = withCursor(root, chart, xAxis, yAxis, config.cursor || {});
  const scrollbars = withScrollbars(root, chart, config.scrollbars || {});

  const cleanup = () => {
    simulation.stop();
    if (!root.isDisposed()) {
      root.dispose();
    }
  };

  return {
    chart,
    xAxis,
    yAxis,
    series: [series],
    legend,
    cursor,
    scrollbars,
    cleanup,
  };
}
