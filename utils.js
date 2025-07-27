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

  // Compute the average salary for each state
  const averageSalaries = {};
  for (const [state, salaries] of Object.entries(salaryByState)) {
    const avg = d3.mean(salaries);
    averageSalaries[state] = Math.round(avg);
  }

  return averageSalaries;
}

export function cleanLayoffData(rawData) {
  const parseDate = (dateStr, yearStr) => {
    if (!dateStr) return "";

    // Example formats: "11-Dec-24", "28-Jan", "March 3"
    let dateObj;

    // Try known formats
    const knownFormats = [
      d3.timeParse("%d-%b-%y"),  // 11-Dec-24
      d3.timeParse("%d-%b"),     // 28-Jan
      d3.timeParse("%b %d"),     // Jan 28
      d3.timeParse("%B %d"),     // January 28
    ];

    for (const parse of knownFormats) {
      const temp = parse(dateStr);
      if (temp) {
        // If year is missing, insert it from Year column
        const year = +yearStr;
        if (isNaN(temp.getFullYear()) || temp.getFullYear() < 100) {
          temp.setFullYear(year);
        }
        return d3.timeFormat("%Y-%m-%d")(temp);
      }
    }

    // If nothing worked, return original
    return "";
  };

  return rawData
    .filter(d => d["Location (US)"] && d["Location (US)"].trim() !== "")
    .map(d => {
      const cleanedDate = parseDate(d["Date"], d["Year"]);

      return {
        ...d,
        "Date": cleanedDate || d["Date"], // fallback to original if unparseable
      };
    });
}

export function getLayoffCountsByStateYear(cleanedLayoffs) {
  const layoffCounts = {};

  cleanedLayoffs.forEach(row => {
    const state = row["Location (US)"]?.trim();
    //const year = +row["Year"];

    //if (!state || isNaN(year)) return;

    const yearRaw = row["Year"];
    const year = /^\d{4}$/.test(yearRaw) ? yearRaw : "Unknown";

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
