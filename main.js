//OLD - not in use

// Entry point
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  loadUSMap();
});

// csv values mapped to TopoJSON state keys
const stateAbbrev = {
  "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
  "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
  "Florida": "FL", "Georgia": "GA", "Hawaii": "HI", "Idaho": "ID",
  "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
  "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
  "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS",
  "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
  "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
  "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT",
  "Vermont": "VT", "Virginia": "VA", "Washington": "WA", "West Virginia": "WV",
  "Wisconsin": "WI", "Wyoming": "WY"
};

function setupNavigation() {
  document.getElementById('btn-us').addEventListener('click', loadUSMap);
  document.getElementById('btn-global').addEventListener('click', loadGlobalView);
  document.getElementById('btn-role').addEventListener('click', loadByRole);
  document.getElementById('btn-education').addEventListener('click', loadEducation);
}

function clearVis() {
  d3.select('#vis-container').html('');
}

// Placeholder views
function loadUSMap() {
  clearVis();
  //d3.select('#vis-container').append('p').text('Loading salary overview map...');
  // TODO: render map + summary stats
  const width = 960;
  const height = 600;

  const svg = d3.select('#vis-container')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  // projection and path generator
  const projection = d3.geoAlbersUsa()
    .translate([width / 2, height / 2])
    .scale(1000);

  const path = d3.geoPath().projection(projection);

  // Salary data
  d3.csv("2025 Biotech Salary.csv").then(data => {
    // U.S. entries
    const usData = data.filter(d => d["Country"] == "United States");
    console.log("Filtered US entries:", usData.length);

    // salary value as number
    usData.forEach(d => {
      //d.Salary = +d["Annual Base Salary"].replace(/[^0-9.]/g, '');
      const rawSalary = d["Annual Base Salary"];
      if (rawSalary) {
        d.Salary = +rawSalary.replace(/[^0-9.]/g, '');
      } else {
        d.Salary = undefined;
      }
    });

    // Remove undefined values
    const cleanData = usData.filter(d => d.Salary !== undefined);

    // Group by US State and find avg salary
    const salaryByState = d3.rollup(
      cleanData,
      v => d3.mean(v, d => d.Salary),
      d => d["US State"]);

    console.log("Average salaries by state:", Object.fromEntries(salaryByState));

  // Map conversion to plain object
  const salaryObj = Object.fromEntries(salaryByState);

  // color scale
  const color = d3.scaleQuantize()
    .domain(d3.extent(Array.from(salaryByState.values())))
    .range(d3.schemeBlues[7]);

  // Load TopoJSON and draw map
  d3.json("states-10m.json").then(cleanData => {
    const states = topojson.feature(cleanData, cleanData.objects.states).features;

    console.log("Average salaries by state:", Object.fromEntries(salaryByState));

    svg.append('g')
      .selectAll('path')
      .data(states)
      .enter()
      .append('path')
      .attr('d', path)
      .attr('fill', d => {
        const stateName = d.properties.name;
        const abbrev = stateAbbrev[stateName];
        const avgSalary = salaryByState.get(stateName); // or .get(abbrev)
        return avgSalary ? color(avgSalary) : '#ccc';
      })
      .attr('stroke', '#333')
      .attr('stroke-width', 0.5);

    // State borders
    svg.append("path")
      .datum(topojson.mesh(cleanData, cleanData.objects.states, (a,b) => a !== b))
      .attr("fill", "none")
      .attr("stroke", "#333")
      .attr("stroke-linejoin", "round")
      .attr("d", path);

    // Add legend
    const legendValues = color.range().map(d => {
      const [min, max] = color.invertExtent(d);
      return {
        color: d,
        range: [Math.round(min), Math.round(max)]
      };
    });

    // Position legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width - 100}, 30)`);

    legend.selectAll('rect')
      .data(legendValues)
      .enter()
      .append('rect')
      .attr('x', 0)
      .attr('y', (d, i) => i * 25)
      .attr('width', 20)
      .attr('height', 20)
      .attr('fill', d => d.color)
      .attr('stroke', '#333');

    legend.selectAll('text')
      .data(legendValues)
      .enter()
      .append('text')
      .attr('x', 30)
      .attr('y', (d, i) => i * 25 + 15)
      .text( d => `$${d.range[0].toLocaleString()} - $${d.range[1].toLocaleString()}`)
      .attr('font-size', '12px');

    });

  });

}

function loadGlobalView() {
  clearVis();

  const svg = d3.select('#vis-container')
    .append('svg')
    .attr('width', 960)
    .attr('height', 600);

  d3.csv("2025 Biotech Salary.csv").then(data => { 
    //const globalData = data.filter(d => !d["US State"] && d["Country"] && d["Annual Base Salary"]);
    const globalData = data.filter(d => d["Country"] && d["Annual Base Salary"]);

  globalData.forEach(d => {
    d.Salary = +d["Annual Base Salary"].replace(/[^0-9.]/g, '');
  });

  const avgSalaryByCountry = d3.rollup(
    globalData,
    v => d3.mean(v, d => d.Salary),
    d => d["Country"]
  );

  const salaryArray = Array.from(avgSalaryByCountry, ([country, avgSalary]) => ({ country, avgSalary }));
  salaryArray.sort((a, b) => d3.descending(a.avgSalary, b.avgSalary));

  const margin = { top: 40, right: 20, bottom: 120, left: 80 };
  const width = 960 - margin.left - margin.right;
  const height = 600 - margin.top - margin.bottom;

  const chart = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .domain(salaryArray.map(d => d.country))
    .range([0, width])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(salaryArray, d => d.avgSalary)])
    .range([height, 0]);

  chart.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  chart.append("g")
    .call(d3.axisLeft(y));

  chart.selectAll("rect")
    .data(salaryArray)
    .enter()
    .append("rect")
    .attr("x", d => x(d.country))
    .attr("y", d => y(d.avgSalary))
    .attr("width", x.bandwidth())
    .attr("height", d => height - y(d.avgSalary))
    .attr("fill", "#4682b4");

  svg.append("text")
    .attr("x", margin.left)
    .attr("y", 20)
    .text("Average Annual Salary by Country")
    .style("font-size", "16px")
    .style("font-weight", "bold");

  })
}

function loadByRole() {
  clearVis();
  d3.select('#vis-container').append('p').text('Salaries by Role and Level (Coming Soon)');
}

function loadByCompany() {
  clearVis();
  d3.select('#vis-container').append('p').text('Compensation Breakdown by Company Type (Coming Soon)');
}

function loadEquity() {
  clearVis();
  d3.select('#vis-container').append('p').text('Equity, Gender, and Race Analysis (Coming Soon)');
}

function loadEducation() {
  clearVis();
  d3.select('#vis-container').append('p').text('Education vs Salary (Coming Soon)');
}
