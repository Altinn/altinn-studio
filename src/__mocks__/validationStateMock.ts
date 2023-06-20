import type { IValidations } from 'src/types';

export function getMockValidationState(withFixed = false): IValidations {
  const fixed = withFixed ? [] : undefined;
  return {
    FormLayout: {
      componentId_1: {
        simpleBinding: {
          errors: ['Error message 1', 'Error message 2'],
          fixed,
        },
      },
      componentId_2: {
        customBinding: {
          warnings: ['Warning message 1', 'Warning message 2'],
          fixed,
        },
      },
      'componentId_4-1': {
        simpleBinding: {
          errors: ['test error'],
          fixed,
        },
      },
      'componentId_5-0-1': {
        simpleBinding: {
          errors: ['test error'],
          fixed,
        },
      },
    },
    unmapped: {
      unmapped: {
        random_key: {
          errors: ['test error'],
          warnings: ['test warning'],
          fixed,
        },
      },
    },
  };
}
