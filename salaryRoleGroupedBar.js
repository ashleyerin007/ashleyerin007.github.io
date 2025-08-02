const margin = { top: 40, right: 100, bottom: 50, left: 60 };
const width = 800 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

const svg = d3.select("#salary-role-bar")
  .append("svg")
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

  const filtered = data.filter(d => topRoles.includes(d["Job Title"]));

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

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x0).tickFormat(d3.format("d")));

  svg.append("g")
    .call(d3.axisLeft(y));

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

  const legend = svg.append("g")
    .attr("transform", `translate(40,${-margin.top / 2})`);

  legend.selectAll("text")
    .data(topRoles)
    .join("text")
    .attr("x", (d, i) => (i % 4) * 150)
    .attr("y", (d, i) => Math.floor(i / 4) * 16)
    .text(d => d)
    .style("fill", d => color(d))
    .style("font-size", "11px")
    .style("font-weight", "bold");

  // === Annotation for Director 2025 bar ===

  const annotationGroup = svg.append("g")
    .attr("class", "annotation-group");

  svg.append("defs").append("marker")
    .attr("id", "arrowhead")
    .attr("viewBox", "0 0 10 10")
    .attr("refX", 8)
    .attr("refY", 5)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto-start-reverse")
    .append("path")
    .attr("d", "M 0 0 L 10 5 L 0 10 z")
    .attr("fill", "#2c7fb8");

  const director2025 = flatData.find(d => d.year === 2025 && d.role === "Director");

  if (director2025) {
    const barX = x0(2025) + x1("Director") + x1.bandwidth() / 2;
    const barY = y(director2025.average);

    annotationGroup.append("line")
      .attr("x1", barX)
      .attr("y1", barY - 20)
      .attr("x2", barX)
      .attr("y2", barY)
      .attr("stroke", "#2c7fb8")
      .attr("stroke-width", 2)
      .attr("marker-end", "url(#arrowhead)");

    annotationGroup.append("text")
      .attr("x", barX + 5)
      .attr("y", barY - 10)
      .text("Steady growth")
      .style("font-size", "12px")
      .style("fill", "#2c7fb8");
  }

  const baselineRoles = ["Director", "Scientist", "Research Associate"];

  baselineRoles.forEach(role => {
    const datum = flatData.find(d => d.year === 2022 && d.role === role);
    if (datum) {
      const baselineY = y(datum.average);

      annotationGroup.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", baselineY)
        .attr("y2", baselineY)
        .attr("stroke", "#999")
        .attr("stroke-dasharray", "4,4");

      annotationGroup.append("text")
        .attr("x", width - 10)
        .attr("y", baselineY - 6)
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .style("fill", "#3C41DD") 
        .style("text-anchor", "end");
      }
    });
});