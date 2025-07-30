const margin = { top: 40, right: 100, bottom: 50, left: 60 };
const width = 800 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

const svg = d3.select("#salary-role-bar")
  .append("svg")
  //.attr("width", width + margin.left + margin.right)
  //.attr("height", height + margin.top + margin.bottom)
  .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
  .attr("preserveAspectRatio", "xMidYMid meet")
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

d3.csv("Sal.csv", d3.autoType).then(data => {

  data.forEach(d => {
    if (d["Job Title"] === "Scientist I") {
      d["Job Title"] = "Scientist";
    }
  });

  const roleCounts = d3.rollup(data, v => v.length, d => d["Job Title"]);
  const topRoles = Array.from(roleCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(d => d[0]);

  // Filter data
  const filtered = data.filter(d => topRoles.includes(d["Job Title"]));

  // Group by Year + Role
  const grouped = d3.rollup(
    filtered,
    v => d3.mean(v, d => d["Annual Base Salary"]),
    d => d.Year,
    d => d["Job Title"]
  );

  const years = Array.from(grouped.keys()).sort((a, b) => a - b);

  const flatData = [];
  years.forEach(year => {
    const roles = grouped.get(year);
    topRoles.forEach(role => {
      flatData.push({
        year,
        role,
        average: roles.get(role) || 0
      });
    });
  });

  const x0 = d3.scaleBand()
    .domain(years)
    .range([0, width])
    .paddingInner(0.2);

  const x1 = d3.scaleBand()
    .domain(topRoles)
    .range([0, x0.bandwidth()])
    .padding(0.05);

  const y = d3.scaleLinear()
    .domain([0, d3.max(flatData, d => d.average)])
    .nice()
    .range([height, 0]);

  const color = d3.scaleOrdinal()
    .domain(topRoles)
    .range(d3.schemeCategory10);

  // X-axis
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x0).tickFormat(d3.format("d")));

  // Y-axis
  svg.append("g")
    .call(d3.axisLeft(y));

  // Bars
  svg.selectAll("g.year-group")
    .data(flatData)
    .join("g")
    .attr("transform", d => `translate(${x0(d.year)},0)`)
    .append("rect")
    .attr("x", d => x1(d.role))
    .attr("y", d => y(d.average))
    .attr("width", x1.bandwidth())
    .attr("height", d => height - y(d.average))
    .attr("fill", d => color(d.role));

  // Legend
  const legend = svg.append("g")
    .attr("transform", `translate(40,${-margin.top / 2})`);

  legend.selectAll("text")
    .data(topRoles)
    .join("text")
    .attr("x", (d, i) => (i % 4) * 150) // 4 items per row
    .attr("y", (d, i) => Math.floor(i / 4) * 16) // 16px per row
    .text(d => d)
    .style("fill", d => color(d))
    .style("font-size", "11px")
    .style("font-weight", "bold");
});
