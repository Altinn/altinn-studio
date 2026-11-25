import { describe, expect, it } from 'vitest';
import { ComponentType } from 'app-shared/types/ComponentType';
import {
  getCodeListIds,
  getInlineOptions,
  getNextOptionValue,
  resolveOptions,
} from './optionUtils';

describe('resolveOptions', () => {
  it('gives inline options their texts', () => {
    const component = {
      id: 'a',
      type: ComponentType.RadioButtons,
      options: [{ value: '1', label: 'a.option1' }],
    };
    expect(resolveOptions(component, { 'a.option1': 'Ja' }, [])).toEqual([
      { value: '1', label: 'Ja' },
    ]);
  });

  it('offers yes and no before the app has the list', () => {
    const component = { id: 'a', type: ComponentType.RadioButtons, optionsId: 'janei' };
    expect(resolveOptions(component, {}, []).map(({ value }) => value)).toEqual(['ja', 'nei']);
  });
});

describe('getInlineOptions', () => {
  it('keeps the value as it is, and the description and help text', () => {
    const option = { value: 1, label: 'a.option1', description: 'd', helpText: 'h' };
    const component = { id: 'a', type: ComponentType.Checkboxes, options: [option] };
    expect(getInlineOptions(component)).toEqual([option]);
  });
});

describe('getCodeListIds', () => {
  it('puts yes and no first when the app does not have it', () => {
    expect(getCodeListIds([{ title: 'land', data: [] }])).toEqual(['janei', 'land']);
  });
});

describe('getNextOptionValue', () => {
  it('returns a value after the highest number', () => {
    expect(
      getNextOptionValue([
        { value: '1', label: '' },
        { value: '4', label: '' },
      ]),
    ).toBe('5');
  });
});
