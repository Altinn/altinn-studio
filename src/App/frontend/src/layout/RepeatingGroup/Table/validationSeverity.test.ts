import { getHighestSeverity } from 'src/layout/RepeatingGroup/Table/validationSeverity';
import type { ValidationSeverity } from 'src/features/validation';

it.each([
  { severities: [], expected: undefined },
  { severities: ['success'], expected: 'success' },
  { severities: ['success', 'info'], expected: 'info' },
  { severities: ['info', 'warning', 'success'], expected: 'warning' },
  { severities: ['warning', 'error', 'info', 'success'], expected: 'error' },
  { severities: ['error', 'warning'], expected: 'error' },
] satisfies { severities: ValidationSeverity[]; expected: ValidationSeverity | undefined }[])(
  'shows $expected for $severities',
  ({ severities, expected }) => {
    expect(getHighestSeverity(severities.map((severity) => ({ severity })))).toBe(expected);
  },
);
