/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

class JsonReporter {
  constructor(globalConfig, options) {
    this.options = options || {};
    this.outputFile = this.options.outputFile || 'jest-results.json';
    this.failuresOnly = !!this.options.failuresOnly;
  }

  onRunComplete(_contexts, aggregatedResult) {
    const data = this.failuresOnly
      ? {
          numFailedTests: aggregatedResult.numFailedTests,
          numFailedTestSuites: aggregatedResult.numFailedTestSuites,
          testResults: aggregatedResult.testResults
            .map((suite) => ({
              name: suite.name,
              status: suite.numFailingTests > 0 ? 'failed' : 'passed',
              assertionResults: suite.assertionResults
                .filter((a) => a.status === 'failed')
                .map((a) => ({
                  title: a.title,
                  fullName: (a.ancestorTitles || []).concat(a.title).join(' › '),
                  status: a.status,
                  failureMessages: a.failureMessages,
                })),
            }))
            .filter((s) => s.status === 'failed'),
        }
      : aggregatedResult;

    const outPath = this.outputFile.startsWith('<rootDir>')
      ? path.resolve(process.cwd(), this.outputFile.replace('<rootDir>/', ''))
      : path.resolve(process.cwd(), this.outputFile);

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
    console.log(`\nWrote Jest JSON report to ${outPath}\n`);
  }
}

module.exports = JsonReporter;
