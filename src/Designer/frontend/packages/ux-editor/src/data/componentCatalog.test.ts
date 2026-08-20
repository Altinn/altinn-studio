import type { PropertyDefinition } from '@app/layout-contract';
import {
  getAllowedValues,
  getArrayStringChoices,
  getBooleanDefault,
  getEditablePropertyType,
  getPropertyChoices,
} from './componentCatalog';

describe('componentCatalog', () => {
  it('classifies expressions by their result type', () => {
    expect(getEditablePropertyType({ type: 'boolean', expression: true })).toBe('boolean');
  });

  it('reads choices from allowed values and constants', () => {
    expect(getAllowedValues({ type: 'string', allowedValues: ['small', 'large'] })).toEqual([
      'small',
      'large',
    ]);
    expect(
      getAllowedValues({
        type: 'union',
        variants: [
          { type: 'constant', value: 'left' },
          { type: 'constant', value: 'right' },
        ],
      }),
    ).toEqual(['left', 'right']);
  });

  it('only exposes arrays with a finite set of choices to the generic editor', () => {
    expect(
      getEditablePropertyType({
        type: 'array',
        items: { type: 'string', allowedValues: ['pdf', 'docx'] },
      }),
    ).toBe('array');
    expect(getEditablePropertyType({ type: 'array', items: { type: 'string' } })).toBeUndefined();
  });

  it('exposes closed nested objects to the generic editor', () => {
    expect(
      getEditablePropertyType({
        type: 'object',
        properties: { enabled: { type: 'boolean', required: false } },
        additionalProperties: false,
      }),
    ).toBe('object');
  });

  it('uses examples as editor choices and preserves boolean defaults', () => {
    const definition: PropertyDefinition = {
      type: 'boolean',
      examples: [true, false],
      default: false,
      required: false,
    };
    expect(getPropertyChoices(definition)).toEqual([true, false]);
    expect(getBooleanDefault(definition)).toBe(false);
  });

  it('reads string choices from array item definitions', () => {
    const definition: PropertyDefinition = {
      type: 'array',
      items: { type: 'string', allowedValues: ['one', 'two'] },
      required: false,
    };
    expect(getArrayStringChoices(definition)).toEqual(['one', 'two']);
  });
});
