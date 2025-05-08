import type { TextResource } from '@studio/components-legacy';
import type { Option } from 'app-shared/types/Option';
import { useConcatOptionsLabels } from './useConcatOptionsLabels';
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

describe('useConcatOptionsLabels', () => {
  it('returns a string of labels with no textResources provided', () => {
    const optionList: Option[] = [
      {
        value: 'value',
        label: 'random-text',
      },
    ];
    const result = useConcatOptionsLabels(optionList);
    expect(result).toEqual(optionList[0].label);
  });

  it('return a string of labels translated from textResources', () => {
    const optionList: Option[] = [
      {
        value: 'value',
        label: 'text-with-value',
      },
    ];
    const result = useConcatOptionsLabels(optionList, textResources);
    expect(result).toEqual(textResources[0].value);
  });

  it('return a string of labels with placeholder value for empty values', () => {
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
    const result = useConcatOptionsLabels(optionList, textResources);
    const expectedString = `${textMock('general.empty_string')} | ${textMock('general.empty_string')}`;
    expect(result).toEqual(expectedString);
  });
});
