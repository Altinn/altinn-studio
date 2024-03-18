import { selectionIsValid } from './attachmentListUtils';
import type { InternalDataTypesFormat } from './types';

describe('validateSelection', () => {
  it('should return false when no selection', () => {
    const output: InternalDataTypesFormat = {
      currentTask: false,
      includePdf: false,
      selectedDataTypes: [],
    };
    expect(selectionIsValid(output)).toBeFalsy();
  });

  it('should return true when there is a selection', () => {
    const output: InternalDataTypesFormat = {
      currentTask: false,
      includePdf: false,
      selectedDataTypes: ['attachment1'],
    };
    expect(selectionIsValid(output)).toBeTruthy();
  });

  it('should return true when there is a selection and current task', () => {
    const output: InternalDataTypesFormat = {
      currentTask: true,
      includePdf: false,
      selectedDataTypes: ['attachment1'],
    };
    expect(selectionIsValid(output)).toBeTruthy();
  });

  it('should return false when there is only current task', () => {
    const output: InternalDataTypesFormat = {
      currentTask: true,
      includePdf: false,
      selectedDataTypes: [],
    };
    expect(selectionIsValid(output)).toBeFalsy();
  });

  it('should return true when there is only pdf', () => {
    const output: InternalDataTypesFormat = {
      currentTask: false,
      includePdf: true,
      selectedDataTypes: [],
    };
    expect(selectionIsValid(output)).toBeTruthy;
  });
});
