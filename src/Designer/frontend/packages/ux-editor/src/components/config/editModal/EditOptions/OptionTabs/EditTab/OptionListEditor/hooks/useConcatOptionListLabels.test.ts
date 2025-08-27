import type { TextResource } from 'libs/studio-components-legacy/src';
import type { Option } from 'app-shared/types/Option';
import { useConcatOptionListLabels } from './useConcatOptionListLabels';
import { textMock } from '@studio/testing/mocks/i18nMock';

// Test data:
const textResources: TextResource[] = [
  {
    id: 'text-with-value',
    value: 'some-text',
  },
  {
    id: 'empty-text',
    value: '',
  },
];

describe('useConcatOptionListLabels', () => {
  it('returns an empty string when option list is empty', () => {
    const optionList: Option[] = [];
    const result = useConcatOptionListLabels(optionList, textResources);
    expect(result).toEqual('');
  });

  it('returns a string of labels when no text resources provided', () => {
    const optionList: Option[] = [
      {
        value: 'value1',
        label: 'random-text',
      },
      {
        value: 'value2',
        label: 'another-random-text',
      },
    ];
    const result = useConcatOptionListLabels(optionList);
    const expectedString = `${optionList[0].label} | ${optionList[1].label}`;
    expect(result).toEqual(expectedString);
  });

  it('returns a string of labels translated from text resources', () => {
    const optionList: Option[] = [
      {
        value: 'value1',
        label: 'text-with-value',
      },
      {
        value: 'value2',
        label: 'random-text',
      },
    ];
    const result = useConcatOptionListLabels(optionList, textResources);
    const expectedString = `${textResources[0].value} | ${optionList[1].label}`;
    expect(result).toEqual(expectedString);
  });

  it('returns a string of labels with 1 placeholder value for empty string and 1 translated value', () => {
    const optionList: Option[] = [
      {
        value: 'value1',
        label: '',
      },
      {
        value: 'value2',
        label: 'text-with-value',
      },
    ];
    const result = useConcatOptionListLabels(optionList, textResources);
    const expectedString = `${textMock('general.empty_string')} | ${textResources[0].value}`;
    expect(result).toEqual(expectedString);
  });

  it('returns a string of labels with 2 placeholder values for empty value', () => {
    const optionList: Option[] = [
      {
        value: 'value1',
        label: '',
      },
      {
        value: 'value2',
        label: 'empty-text',
      },
    ];
    const result = useConcatOptionListLabels(optionList, textResources);
    const expectedString = `${textMock('general.empty_string')} | ${textMock('general.empty_string')}`;
    expect(result).toEqual(expectedString);
  });
});
