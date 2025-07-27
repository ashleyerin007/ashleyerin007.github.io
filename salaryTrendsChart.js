// salaryTrendsChart.js
const margin = { top: 40, right: 40, bottom: 40, left: 60 };
const width = 800 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

const svg = d3.select("#salary-chart")
  .append("svg")
  //.attr("width", width + margin.left + margin.right)
  //.attr("height", height + margin.top + margin.bottom)
  .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
  .attr("preserveAspectRatio", "xMidYMid meet")
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

d3.csv("Sal.csv", d3.autoType).then(data => {
  const yearGroups = d3.group(data, d => d.Year);

  const avgByYear = Array.from(yearGroups, ([year, rows]) => {
    const salaries = rows
      .map(d => d["Annual Base Salary"])
      .filter(val => val && !isNaN(val));
    return {
      year,
      average: d3.mean(salaries)
    };
  }).sort((a, b) => a.year - b.year);

  //const x = d3.scaleLinear()
    //.domain(d3.extent(avgByYear, d => d.year))
    //.range([0, width]);

  const years = avgByYear.map(d => d.year);

  const x = d3.scalePoint()
    .domain(years)
    .range([0, width])
    .padding(0.5);


  const y = d3.scaleLinear()
    .domain([0, d3.max(avgByYear, d => d.average)])
    .nice()
    .range([height, 0]);

  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.average));

  // Axes
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    //.call(d3.axisBottom(x).tickFormat(d3.format("d")));
    //.call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(4)); // or `.ticks(years.length)` if you want exact
    .call(d3.axisBottom(x));

  svg.append("g")
    .call(d3.axisLeft(y));

  // Line
  svg.append("path")
    .datum(avgByYear)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 2.5)
    .attr("d", line);

  // Points
  svg.selectAll("circle")
    .data(avgByYear)
    .join("circle")
    .attr("cx", d => x(d.year))
    .attr("cy", d => y(d.average))
    .attr("r", 4)
    .attr("fill", "steelblue");

  // Labels (optional)
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Average Annual Biotech Salary (Nationwide)");
});
