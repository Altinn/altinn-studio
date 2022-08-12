import type { IValidations } from '../src/types';
import { getTextResourceByKey } from '../src/utils/textResource';

export function getMockValidationState(withFixed = false): IValidations {
  const fixed = withFixed ? [] : undefined;
  return {
    FormLayout: {
      componentId_1: {
        simpleBinding: {
          errors: [
            getTextResourceByKey('Error message 1', []),
            getTextResourceByKey('Error message 2', []),
          ],
          fixed,
        },
      },
      componentId_2: {
        customBinding: {
          warnings: [
            getTextResourceByKey('Warning message 1', []),
            getTextResourceByKey('Warning message 2', []),
          ],
          fixed,
        },
      },
      'componentId_4-1': {
        simpleBinding: {
          errors: [getTextResourceByKey('test error', [])],
          fixed,
        },
      },
      'componentId_5-0-1': {
        simpleBinding: {
          errors: [getTextResourceByKey('test error', [])],
          fixed,
        },
      },
    },
    unmapped: {
      unmapped: {
        random_key: {
          errors: [getTextResourceByKey('test error', [])],
          warnings: [getTextResourceByKey('test warning', [])],
          fixed,
        },
      },
    },
  };
}
