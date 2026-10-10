import { BackendValidationSeverity } from 'src/features/validation';
import { getValidationIssueMessage } from 'src/features/validation/backendValidation/backendValidationUtils';
import type { BackendValidationIssue } from 'src/features/validation';

function issue(overrides: Partial<BackendValidationIssue>): BackendValidationIssue {
  return {
    dataElementId: 'data-element',
    severity: BackendValidationSeverity.Error,
    source: 'Custom',
    ...overrides,
  };
}

describe('getValidationIssueMessage', () => {
  it('uses the custom text key with its parameters, and the description as fallback', () => {
    expect(
      getValidationIssueMessage(
        issue({ customTextKey: 'my.text', customTextParameters: { a: 'b' }, description: 'Translated' }),
      ),
    ).toEqual({ key: 'my.text', customTextParameters: { a: 'b' }, fallback: 'Translated' });
  });

  it('uses the custom text key for backend texts too', () => {
    expect(
      getValidationIssueMessage(
        issue({ customTextKey: 'backend.xsd_validation', description: 'Et felt bryter reglene satt av XSD.' }),
      ),
    ).toEqual({
      key: 'backend.xsd_validation',
      customTextParameters: undefined,
      fallback: 'Et felt bryter reglene satt av XSD.',
    });
  });

  it('shows the description as it is when there is no key', () => {
    expect(getValidationIssueMessage(issue({ description: 'Some message', code: 'SomeCode' }))).toEqual({
      key: undefined,
      fallback: 'Some message',
    });
  });

  it('falls back to the code', () => {
    expect(getValidationIssueMessage(issue({ code: 'SomeCode' }))).toEqual({ key: undefined, fallback: 'SomeCode' });
  });
});
