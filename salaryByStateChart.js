// salaryByStateChart.js

const margin = { top: 40, right: 60, bottom: 40, left: 60 };
const width = 600 - margin.left - margin.right;
const height = 350 - margin.top - margin.bottom;

const svg = d3.select("#salary-by-state")
  .append("svg")
  .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
  .attr("preserveAspectRatio", "xMidYMid meet")
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

d3.csv("Sal.csv", d3.autoType).then(data => {
  // Get top 5 most common states in dataset
  const stateCounts = d3.rollups(data, v => v.length, d => d.State_inferred)
    .sort((a, b) => d3.descending(a[1], b[1]))
    .slice(0, 5)
    .map(d => d[0]);

  const years = [...new Set(data.map(d => d.Year))].sort();
  const x = d3.scalePoint()
    .domain(years)
    .range([0, width])
    .padding(0.5);

  const y = d3.scaleLinear()
    .range([height, 0]);

  // Prepare line generator
  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.average));

  // Group data by state-year and calculate averages
  const grouped = d3.group(data, d => d.State_inferred, d => d.Year);
  const stateData = stateCounts.map(state => {
    const yearMap = grouped.get(state);
    return {
      state,
      values: yearMap ? Array.from(yearMap, ([year, rows]) => ({
        year,
        average: d3.mean(rows, d => d["Annual Base Salary"])
      })).sort((a, b) => a.year - b.year) : []
    };
  });

  // Set y domain
  const allValues = stateData.flatMap(d => d.values.map(v => v.average));
  y.domain([0, d3.max(allValues)]).nice();

  // Axes
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));
  svg.append("g").call(d3.axisLeft(y));

  // Color scale
  const color = d3.scaleOrdinal()
    .domain(stateCounts)
    .range(d3.schemeCategory10);

  // Add lines
  svg.selectAll(".state-line")
    .data(stateData)
    .join("path")
    .attr("class", "state-line")
    .attr("fill", "none")
    .attr("stroke", d => color(d.state))
    .attr("stroke-width", 2)
    .attr("d", d => line(d.values));

  const legendGroup = svg.append("g")
  .attr("class", "legend");

  legendGroup.selectAll("text")
    .data(stateCounts)
    .join("text")
    .attr("x", 5)
    .attr("y", (d, i) => -28 + i * 15)
    .text(d => d)
    .attr("fill", d => color(d))
    .style("font-size", "11px")
    .style("font-weight", "bold");

});
