import { getDisplayValues } from './TextComponentUtils';
import { DataLookupFuncName, StringExpression } from '@studio/components';

describe('getDisplayValues', () => {
  it('should return an empty string when value is undefined', () => {
    const value = undefined;
    expect(getDisplayValues(value)).toBe(undefined);
  });

  it('should return the trimmed string when value is a single string', () => {
    const value = 'Hello World';
    expect(getDisplayValues(value)).toBe(value);
  });

  it('should return a comma-separated string when value is an array of strings', () => {
    const value: StringExpression = [DataLookupFuncName.DataModel, 'hello', 'world'];
    expect(getDisplayValues(value)).toBe('dataModel, hello, world');
  });
});
