import { isAtLeastVersion } from 'src/utils/versionCompare';

describe('versionCompare', () => {
  interface TestCase {
    version: string;
    minVersion: string;
    expected: boolean;
  }

  const testCases: TestCase[] = [
    { version: '1.0.0', minVersion: '1.0.0', expected: true },
    { version: '1.0.0', minVersion: '1.0.1', expected: false },
    { version: '1.0.0', minVersion: '0.9.9', expected: true },
    { version: '8.0.0', minVersion: '7.9.9', expected: true },
    { version: '8.0.15', minVersion: '8.0.14', expected: true },
    { version: '8.1.15', minVersion: '8.0.16', expected: true },
    { version: '8.1.15', minVersion: '8.1.14', expected: true },
    { version: '8.1.15', minVersion: '8.1.15', expected: true },
    { version: '8.1.15', minVersion: '8.1.16', expected: false },
    { version: '8.1.15', minVersion: '8.2.14', expected: false },
    { version: '8.1.15', minVersion: '9.0.0', expected: false },
  ];

  test.each(testCases)('isAtLeastVersion($version, $minVersion) returns $expected', (testCase) => {
    expect(isAtLeastVersion(testCase.version, testCase.minVersion)).toBe(testCase.expected);
  });
});
