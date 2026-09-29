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
  it('uses the custom text key with its parameters', () => {
    expect(
      getValidationIssueMessage(
        issue({ customTextKey: 'my.text', customTextParameters: { a: 'b' }, description: 'Translated' }),
      ),
    ).toEqual({ key: 'my.text', customTextParameters: { a: 'b' } });
  });

  it('uses the description the backend translated for a backend text key', () => {
    expect(
      getValidationIssueMessage(
        issue({ customTextKey: 'backend.xsd_validation', description: 'Et felt bryter reglene satt av XSD.' }),
      ),
    ).toEqual({ key: 'Et felt bryter reglene satt av XSD.' });
  });

  it('keeps a backend text key when there is no description', () => {
    expect(getValidationIssueMessage(issue({ customTextKey: 'backend.xsd_validation' }))).toEqual({
      key: 'backend.xsd_validation',
      customTextParameters: undefined,
    });
  });

  it('falls back to the description', () => {
    expect(getValidationIssueMessage(issue({ description: 'Some message', code: 'SomeCode' }))).toEqual({
      key: 'Some message',
    });
  });

  it('falls back to the code', () => {
    expect(getValidationIssueMessage(issue({ code: 'SomeCode' }))).toEqual({ key: 'SomeCode' });
  });
});
