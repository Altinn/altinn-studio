import type { IValidations } from '../src/types';
import { getParsedTextResourceByKey } from '../src/utils/textResource';

export function getMockValidationState(withFixed = false): IValidations {
  const fixed = withFixed ? [] : undefined;
  return {
    FormLayout: {
      componentId_1: {
        simpleBinding: {
          errors: [
            getParsedTextResourceByKey('Error message 1', []),
            getParsedTextResourceByKey('Error message 2', []),
          ],
          fixed,
        },
      },
      componentId_2: {
        customBinding: {
          warnings: [
            getParsedTextResourceByKey('Warning message 1', []),
            getParsedTextResourceByKey('Warning message 2', []),
          ],
          fixed,
        },
      },
      'componentId_4-1': {
        simpleBinding: {
          errors: [getParsedTextResourceByKey('test error', [])],
          fixed,
        },
      },
      'componentId_5-0-1': {
        simpleBinding: {
          errors: [getParsedTextResourceByKey('test error', [])],
          fixed,
        },
      },
    },
    unmapped: {
      unmapped: {
        random_key: {
          errors: [getParsedTextResourceByKey('test error', [])],
          warnings: [getParsedTextResourceByKey('test warning', [])],
          fixed,
        },
      },
    },
  };
}
