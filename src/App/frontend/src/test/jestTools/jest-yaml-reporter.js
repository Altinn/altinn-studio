/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function firstStackFrameLoc(msg) {
  if (!msg) {
    return null;
  }
  const lines = String(msg).split('\n');
  for (const line of lines) {
    // Matches: at Foo (path:line:col)  OR  at path:line:col
    const m1 = line.match(/\((.*?):(\d+):(\d+)\)/);
    const m2 = !m1 && line.match(/\s+at\s+(.*?):(\d+):(\d+)/);
    const m = m1 || m2;
    if (m) {
      const file = m[1];
      if (file && file.includes(path.sep)) {
        return { file, line: Number(m[2]), column: Number(m[3]) };
      }
    }
  }
  return null;
}

function shortMessage(msg) {
  if (!msg) {
    return '';
  }
  const first =
    String(msg)
      .split('\n')
      .find((l) => l.trim().length > 0) || '';
  return first.trim();
}

function escapeForJestRegex(title) {
  return title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

class YamlAIFailuresReporter {
  constructor(_globalConfig, options) {
    this.options = options || {};
    this.outputFile = this.options.outputFile || 'jest-failures.yml';
    this.failuresOnly = this.options.failuresOnly !== false; // default true
  }

  onRunComplete(_contexts, aggregatedResult) {
    const now = new Date().toISOString();
    const failures = [];

    for (const suite of aggregatedResult.testResults) {
      const filePath = suite.testFilePath || suite.name || '';
      const relFile = filePath ? path.relative(process.cwd(), filePath) : filePath;

      // 1) Whole-suite execution errors (e.g., import error)
      if (suite.testExecError) {
        const msg = suite.testExecError.message || String(suite.testExecError);
        const loc = firstStackFrameLoc(msg);
        const locFile = loc ? path.relative(process.cwd(), loc.file) : relFile;
        failures.push({
          file: relFile,
          test: '(suite execution error)',
          name: '(suite execution error)',
          ancestors: [],
          status: 'failed',
          error: shortMessage(msg),
          location: loc ? { file: locFile, line: loc.line, column: loc.column } : null,
          rerun: relFile ? `npx jest ${JSON.stringify(relFile)}` : 'npx jest',
          stack: msg,
        });
        // continue to next suite; there are no assertion results here
        continue;
      }

      // 2) Normal assertion failures
      const assertions = Array.isArray(suite.testResults) ? suite.testResults : [];
      for (const a of assertions) {
        if (a.status !== 'failed') {
          continue;
        }

        const fullName = [...(a.ancestorTitles || []), a.title].join(' › ');
        const fm = (a.failureMessages && a.failureMessages[0]) || '';
        const loc = firstStackFrameLoc(fm);
        const locFile = loc ? path.relative(process.cwd(), loc.file) : relFile;

        failures.push({
          file: relFile,
          test: fullName,
          name: a.title,
          ancestors: a.ancestorTitles || [],
          status: a.status,
          error: shortMessage(fm),
          location: loc ? { file: locFile, line: loc.line, column: loc.column } : null,
          rerun: relFile
            ? `npx jest ${JSON.stringify(relFile)} -t "${escapeForJestRegex(fullName)}"`
            : `npx jest -t "${escapeForJestRegex(fullName)}"`,
          stack: fm,
        });
      }
    }

    const doc = this.failuresOnly
      ? {
          schema: 'ai-test-failures@1',
          generatedAt: now,
          summary: {
            totalTests: aggregatedResult.numTotalTests,
            failedTests: aggregatedResult.numFailedTests,
            failedSuites: aggregatedResult.numFailedTestSuites,
            success: aggregatedResult.success === true,
          },
          failures,
        }
      : {
          schema: 'ai-jest-results@1',
          generatedAt: now,
          summary: {
            totalTests: aggregatedResult.numTotalTests,
            passedTests: aggregatedResult.numPassedTests,
            failedTests: aggregatedResult.numFailedTests,
            failedSuites: aggregatedResult.numFailedTestSuites,
            success: aggregatedResult.success === true,
          },
          results: aggregatedResult.testResults.map((suite) => ({
            file: path.relative(process.cwd(), suite.testFilePath || suite.name || ''),
            status: suite.numFailingTests > 0 || suite.testExecError ? 'failed' : 'passed',
            assertions: (suite.testResults || []).map((a) => ({
              test: [...(a.ancestorTitles || []), a.title].join(' › '),
              status: a.status,
            })),
          })),
          failures,
        };

    const outPath = this.outputFile.startsWith('<rootDir>')
      ? path.resolve(process.cwd(), this.outputFile.replace('<rootDir>/', ''))
      : path.resolve(process.cwd(), this.outputFile);

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const yamlStr = yaml.dump(doc, { lineWidth: -1, noRefs: true, skipInvalid: true });
    fs.writeFileSync(outPath, yamlStr, 'utf8');
    console.log(`\nWrote Jest YAML report to ${outPath}\n`);
  }
}

module.exports = YamlAIFailuresReporter;
