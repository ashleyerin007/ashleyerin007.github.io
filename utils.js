export async function getAverageSalariesByState(csvPath) {
  const data = await d3.csv(csvPath, d3.autoType);

  const salaryByState = {};

  data.forEach(row => {
    const salary = row["Annual Base Salary"];
    const state = row["US State"]?.trim() || row["State_inferred"]?.trim();

    if (state && salary && !isNaN(salary)) {
      if (!salaryByState[state]) {
        salaryByState[state] = [];
      }
      salaryByState[state].push(salary);
    }
  });

  // avg salary by state (only include states with ≥ 3 records)
  const averageSalaries = {};
  for (const [state, salaries] of Object.entries(salaryByState)) {
    if (salaries.length >= 3) {
      const avg = d3.mean(salaries);
      averageSalaries[state] = Math.round(avg);
    }
  }

  return averageSalaries;
}

export function cleanLayoffData(rawData) {
  const parseDate = (dateStr, yearStr) => {
    if (!dateStr) return "";

    const knownFormats = [
      d3.timeParse("%d-%b-%y"),  // 11-Dec-24
      d3.timeParse("%d-%b"),     // 28-Jan
      d3.timeParse("%b %d"),     // Jan 28
      d3.timeParse("%B %d"),     // January 28
    ];

    for (const parse of knownFormats) {
      const temp = parse(dateStr);
      if (temp) {
        const year = +yearStr;
        if (isNaN(temp.getFullYear()) || temp.getFullYear() < 100) {
          temp.setFullYear(year);
        }
        return d3.timeFormat("%Y-%m-%d")(temp);
      }
    }

    return "";
  };

  return rawData
    .filter(d => d["Location (US)"] && d["Location (US)"].trim() !== "")
    .map(d => {
      const cleanedDate = parseDate(d["Date"], d["Year"]);

      // Parse percent reduction
      const pctStr = d["% reduction"] || d["% Reduction"] || d["% Headcount Reduction"] || "";
      const match = pctStr.match(/(\d+)%/);
      const percentReduction = match ? +match[1] : null;

      return {
        ...d,
        "Date": cleanedDate || d["Date"], // fallback to original if can't parse
        "Percent Reduction": percentReduction,
      };
    });
}

export function getLayoffCountsByStateYear(cleanedLayoffs) {
  const layoffCounts = {};

  cleanedLayoffs.forEach(row => {
    const state = row["Location (US)"]?.trim();
    //const year = +row["Year"];

    //if (!state || isNaN(year)) return;

    //const yearRaw = row["Year"];
    //const year = /^\d{4}$/.test(yearRaw) ? yearRaw : "Unknown";

    const yearRaw = row["Year"]?.toString().trim();
    const year = yearRaw && yearRaw.length === 4 && /^\d{4}$/.test(yearRaw)
      ? yearRaw
      : (yearRaw === "22" ? "2022"
        : yearRaw === "23" ? "2023"
        : yearRaw === "24" ? "2024"
        : yearRaw === "25" ? "2025"
        : "Unknown");

    if (!state) return;

    if (!layoffCounts[state]) {
      layoffCounts[state] = {};
    }

    if (!layoffCounts[state][year]) {
      layoffCounts[state][year] = 0;
    }

    layoffCounts[state][year] += 1;
  });

  return layoffCounts;
}

export async function loadFullSalaryData(csvPath) {
  return d3.csv(csvPath, d3.autoType);
}