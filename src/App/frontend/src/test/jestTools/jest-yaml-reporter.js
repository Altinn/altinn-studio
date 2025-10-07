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
    const m1 = line.match(/\((.*?):(\d+):(\d+)\)/);
    const m2 = !m1 && line.match(/\s+at\s+(.*?):(\d+):(\d+)/);
    const m = m1 || m2;
    if (m) {
      const file = m[1];
      if (file && (file.includes(path.sep) || /^[A-Za-z]:\\/.test(file))) {
        return { file, line: Number(m[2]), column: Number(m[3]) };
      }
    }
  }
  return null;
}

const shortMessage = (msg) =>
  msg
    ? (
        String(msg)
          .split('\n')
          .find((l) => l.trim().length > 0) || ''
      ).trim()
    : '';

const escapeForJestRegex = (title) => title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

class YamlAIFailuresReporter {
  constructor(_globalConfig, options) {
    this.options = options || {};
    this.outputFile = this.options.outputFile || 'jest-failures.yml';
    this.failuresOnly = this.options.failuresOnly !== false; // default true
    this._lastError = null; // so Jest can surface it
  }

  getLastError() {
    return this._lastError;
  }

  onRunComplete(_contexts, aggregatedResult) {
    try {
      const now = new Date().toISOString();
      const failures = [];
      const suites = Array.isArray(aggregatedResult?.testResults) ? aggregatedResult.testResults : [];

      for (const suite of suites) {
        const filePath = suite?.testFilePath || suite?.name || '';
        const relFile = filePath ? path.relative(process.cwd(), filePath) : filePath;

        // 1) Whole-suite execution errors
        if (suite?.testExecError) {
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
          continue;
        }

        // 2) Normal assertion failures
        const assertions = Array.isArray(suite?.testResults) ? suite.testResults : [];
        for (const a of assertions) {
          if (a?.status !== 'failed') {
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

      const summaryBase = {
        totalTests: aggregatedResult?.numTotalTests ?? 0,
        failedTests: aggregatedResult?.numFailedTests ?? failures.length,
        failedSuites: aggregatedResult?.numFailedTestSuites ?? 0,
        success: aggregatedResult?.success === true,
      };

      const doc = this.failuresOnly
        ? {
            schema: 'ai-test-failures@1',
            generatedAt: now,
            summary: summaryBase,
            failures,
          }
        : {
            schema: 'ai-jest-results@1',
            generatedAt: now,
            summary: {
              ...summaryBase,
              passedTests: aggregatedResult?.numPassedTests ?? 0,
            },
            results: suites.map((suite) => ({
              file: path.relative(process.cwd(), suite?.testFilePath || suite?.name || ''),
              status: suite?.numFailingTests > 0 || suite?.testExecError ? 'failed' : 'passed',
              assertions: (Array.isArray(suite?.testResults) ? suite.testResults : []).map((a) => ({
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

      // yaml.dump can throw on exotic values; guard with try/catch
      let yamlStr;
      try {
        yamlStr = yaml.dump(doc, { lineWidth: -1, noRefs: true, skipInvalid: true });
      } catch (e) {
        // Fallback to JSON if YAML fails, but DO NOT throw
        yamlStr = JSON.stringify(doc, null, 2);
      }

      fs.writeFileSync(outPath, yamlStr, 'utf8');

      // Avoid extra WriteStreams; do not console.log here in CI
      if (!process.env.CI && !process.env.JEST_SILENT_REPORTER) {
        console.log(`Wrote Jest YAML report to ${outPath}`);
      }
    } catch (err) {
      // Never throw from a reporter; let Jest finish
      this._lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
}

module.exports = YamlAIFailuresReporter;
