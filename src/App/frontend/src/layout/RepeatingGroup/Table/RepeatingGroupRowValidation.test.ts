import { getRowValidationSeverity } from 'src/layout/RepeatingGroup/Table/RepeatingGroupRowValidation';
import type { NodeRefValidation, ValidationSeverity } from 'src/features/validation';

function validation(severity: ValidationSeverity): NodeRefValidation {
  return {
    baseComponentId: 'field',
    nodeId: 'field-0',
    severity,
    category: 0,
    source: 'test',
    message: { key: undefined, fallback: 'Message' },
  };
}

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
    expect(getRowValidationSeverity(severities.map(validation))).toBe(expected);
  },
);
