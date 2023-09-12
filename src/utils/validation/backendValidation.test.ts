import { shouldExcludeValidationIssue, ValidationIssueSources } from 'src/utils/validation/backendValidation';
import type { BackendValidationIssue } from 'src/utils/validation/types';

describe('backendValidation', () => {
  describe('shouldExcludeValidationIssue', () => {
    const tests: {
      props: Parameters<typeof shouldExcludeValidationIssue>;
      expected: ReturnType<typeof shouldExcludeValidationIssue>;
    }[] = [
      {
        props: [
          {
            code: 'This is a custom validation',
            severity: 1,
            description: 'This is a custom validation',
            field: 'skjema.navn',
          } as BackendValidationIssue,
        ],
        expected: false,
      },
      {
        props: [
          {
            code: 'ContentTypeNotAllowed',
            severity: 1,
            description: 'Content type not allowed',
            customTextKey: 'contentNotAllowed',
            source: ValidationIssueSources.File,
            field: 'skjema.navn',
          } as BackendValidationIssue,
        ],
        expected: false,
      },
      {
        props: [
          {
            code: 'required',
            severity: 1,
            description: 'required',
            source: ValidationIssueSources.Required,
            field: 'skjema.navn',
          } as BackendValidationIssue,
        ],
        expected: true,
      },
      {
        props: [
          {
            code: 'regex',
            severity: 1,
            description: 'regex',
            source: ValidationIssueSources.ModelState,
            field: 'skjema.navn',
          } as BackendValidationIssue,
        ],
        expected: true,
      },
    ];
    tests.forEach(({ props, expected }) => {
      it(`should return ${expected} when called with ${JSON.stringify(props)}`, () => {
        const result = shouldExcludeValidationIssue(...props);
        expect(result).toEqual(expected);
      });
    });
  });
});
