import { findCodeListErrors } from './findCodeListErrors';
import { CodeList } from '../types/CodeList';

describe('findCodeListErrors', () => {
  it('Returns an empty array when there are no errors', () => {
    const codeList: CodeList = [
      {
        value: 'value1',
        label: 'Label 1',
      },
      {
        value: 'value2',
        label: 'Label 2',
      },
    ];
    const errors = findCodeListErrors(codeList);
    expect(errors).toEqual([]);
  });

  it('Returns an array with "emptyValues" when there is at least one empty value', () => {
    const codeList: CodeList = [
      {
        value: 'value1',
        label: 'Label 1',
      },
      {
        value: '',
        label: 'Label 2',
      },
    ];
    const errors = findCodeListErrors(codeList);
    expect(errors).toEqual(['emptyValues']);
  });

  it('Returns an array with "emptyValues" when there are several empty values', () => {
    const codeList: CodeList = [
      {
        value: '',
        label: 'Label 1',
      },
      {
        value: '',
        label: 'Label 2',
      },
    ];
    const errors = findCodeListErrors(codeList);
    expect(errors).toEqual(['emptyValues']);
  });

  it('Returns an array with "duplicateValues" when there is at least one duplicated value', () => {
    const codeList: CodeList = [
      {
        value: 'value1',
        label: 'label1',
      },
      {
        value: 'value1',
        label: 'label2',
      },
    ];
    const errors = findCodeListErrors(codeList);
    expect(errors).toEqual(['duplicateValues']);
  });

  it('Returns an array with "emptyValues" and "duplicateValues" when there are both empty and duplicated values', () => {
    const codeList: CodeList = [
      {
        value: 'value1',
        label: 'Label 1',
      },
      {
        value: '',
        label: 'Label 2',
      },
      {
        value: 'value1',
        label: 'Label 3',
      },
    ];
    const errors = findCodeListErrors(codeList);
    expect(errors).toEqual(['emptyValues', 'duplicateValues']);
  });
});
