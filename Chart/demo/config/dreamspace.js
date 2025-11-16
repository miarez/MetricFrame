/**
 * DreamSpace
 */
new Chart()
  .div("chartdiv")
  .data(csv("./data/category-single-series.csv"))
  .engine(
    new XY()
      .category("month")
      .geom(line("revenue").size(10).alpha(0.5))
      .geom(new column("profit").axis("y2"))
  );

new Chart()
  .div("chartdiv")
  .data(csv("./data/category-single-series.csv"))
  .engine(
    new XY()
      .category("month")
      .geom(line("revenue").color("country"))
      .geom(line("profit"))
  );

new Chart()
  .div("chartdiv")
  .data(csv("./data/category-single-series.csv"))
  .engine(
    new Scatter().x("month").y("revenue").color("country").size(10).alpha(0.5)
  );
