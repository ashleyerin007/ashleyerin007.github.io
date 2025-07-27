// salaryByStateChart.js

const margin = { top: 40, right: 60, bottom: 40, left: 60 };
const width = 600 - margin.left - margin.right;
const height = 350 - margin.top - margin.bottom;

const svg = d3.select("#salary-by-state")
  .append("svg")
  //.attr("width", width + margin.left + margin.right)
  //.attr("height", height + margin.top + margin.bottom)
  .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
  .attr("preserveAspectRatio", "xMidYMid meet")
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

d3.csv("Sal.csv", d3.autoType).then(data => {
  const grouped = d3.group(data, d => d["State_inferred"], d => d.Year);

  const states = Array.from(grouped.keys()).sort();

  const select = d3.select("#state-select");
  select
    .selectAll("option")
    .data(states)
    .join("option")
    .attr("value", d => d)
    .text(d => d);

  const years = [...new Set(data.map(d => d.Year))].sort();
  const x = d3.scalePoint()
    .domain(years)
    .range([0, width])
    .padding(0.5);

  const y = d3.scaleLinear()
    .range([height, 0]);

  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.average));

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    //.call(d3.axisBottom(x).tickFormat(d3.format("d")));
      .call(d3.axisBottom(x));

  const yAxis = svg.append("g");

  const path = svg.append("path")
    .attr("fill", "none")
    .attr("stroke", "seagreen")
    .attr("stroke-width", 2);

  const updateChart = state => {
    const yearMap = grouped.get(state);
    const values = yearMap
      ? Array.from(yearMap, ([year, rows]) => ({
          year,
          average: d3.mean(rows, d => d["Annual Base Salary"])
        }))
        .sort((a, b) => a.year - b.year)
      : [];

    y.domain([0, d3.max(values, d => d.average) || 100000]).nice();
    yAxis.transition().duration(500).call(d3.axisLeft(y));

    path
      .datum(values)
      .transition()
      .duration(500)
      .attr("d", line);
  };

  select.on("change", function () {
    const state = this.value;
    updateChart(state);
  });

  // Initialize with first state
  updateChart(states[0]);
});
