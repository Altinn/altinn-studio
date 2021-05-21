var replacements = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;',
};

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, function (char) {
    return replacements[char];
  });
}

/**
 * Generate a junit xml string from the summary of a k6 run considering each checks as a test case
 * @param {*} data
 * @param {String} suiteName Name of the test ex., filename
 * @returns junit xml string
 */
export function generateJUnitXML(data, suiteName) {
  var failures = 0;
  var cases = [];
  var time = data.metrics.iteration_duration.values.max ? data.metrics.iteration_duration.values.max : 0;
  if (data.root_group.hasOwnProperty('checks') && data.root_group.checks.length > 0) {
    var checks = data.root_group.checks;
    checks.forEach((check) => {
      if (check.passes >= 1 && check.fails === 0) {
        cases.push(`<testcase name="${escapeHTML(check.name)}"/>`);
      } else {
        failures++;
        cases.push(`<testcase name="${escapeHTML(check.name)}"><failure message="failed"/></testcase>`);
      }
    });
  }
  return (
    `<?xml version="1.0" encoding="UTF-8" ?>\n<testsuites tests="${cases.length}" ` +
    `failures="${failures}\" time="${time}">\n` +
    `<testsuite name="${escapeHTML(suiteName)}" tests="${cases.length}" failures="${failures}" ` +
    `time="${time}" timestamp="${new Date().toISOString()}">\n` +
    `${cases.join('\n')}\n</testsuite>\n</testsuites>`
  );
}

/**
 * Returns string that is path to the reports based on the OS where the test in run
 * @param {String} reportName
 * @returns path
 */
export function reportPath(reportName) {
  var path = `src/reports/${reportName}.xml`;
  if (!(__ENV.OS || __ENV.AGENT_OS)) path = `/${path}`;
  return path;
}
