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

function checksToTestcase(checks, failures) {
  var testCases = [];
  if (checks.length > 0) {
    checks.forEach((check) => {
      if (check.passes >= 1 && check.fails === 0) {
        testCases.push(`<testcase name="${escapeHTML(check.name)}"/>`);
      } else {
        failures++;
        testCases.push(`<testcase name="${escapeHTML(check.name)}"><failure message="failed"/></testcase>`);
      }
    });
  }
  return [testCases, failures];
}

/**
 * Generate a junit xml string from the summary of a k6 run considering each checks as a test case
 * @param {*} data
 * @param {String} suiteName Name of the test ex., filename
 * @returns junit xml string
 */
export function generateJUnitXML(data, suiteName) {
  var failures = 0;
  var allTests = [],
    testSubset = [];
  var time = data.state.testRunDurationMs ? data.state.testRunDurationMs : 0;

  if (data.root_group.hasOwnProperty('groups') && data.root_group.groups.length > 0) {
    var groups = data.root_group.groups;
    groups.forEach((group) => {
      var testSubset = [];
      if (group.hasOwnProperty('checks')) [testSubset, failures] = checksToTestcase(group.checks, failures);
      allTests.push(...testSubset);
    });
  }

  if (data.root_group.hasOwnProperty('checks')) [testSubset, failures] = checksToTestcase(data.root_group.checks, failures);
  allTests.push(...testSubset);

  return (
    `<?xml version="1.0" encoding="UTF-8" ?>\n<testsuites tests="${allTests.length}" ` +
    `failures="${failures}\" time="${time}">\n` +
    `<testsuite name="${escapeHTML(suiteName)}" tests="${allTests.length}" failures="${failures}" ` +
    `time="${time}" timestamp="${new Date().toISOString()}">\n` +
    `${allTests.join('\n')}\n</testsuite>\n</testsuites>`
  );
}

/**
 * Returns string that is path to the reports based on the OS where the test in run
 * @param {String} reportName name of the file with extension
 * @returns path
 */
export function reportPath(reportName) {
  var path = `src/reports/${reportName}`;
  if (!(__ENV.OS || __ENV.AGENT_OS)) path = `/${path}`;
  return path;
}
