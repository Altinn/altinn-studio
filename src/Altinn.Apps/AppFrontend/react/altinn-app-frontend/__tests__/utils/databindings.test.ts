import 'jest';
import { flattenObject } from '../../src/utils/databindings';

describe('>>> utils/databindings.ts', () => {
  let testObj: any;
  beforeEach(() => {
    testObj = {};
  });

  it('+++ should return property of type number as a string', () => {
    testObj.aNumber = 43;
    const result = flattenObject(testObj);
    expect(typeof result.aNumber).toBe('string');
    expect(result.aNumber).toBe('43');
  });

  it('+++ should return property of type number and value 0 as a string with character zero', () => {
    testObj.aNumber = 0;
    const result = flattenObject(testObj);
    expect(typeof result.aNumber).toBe('string');
    expect(result.aNumber).toBe('0');
  });

  it('+++ should return property of type number and value -32 as a string with value -32', () => {
    testObj.aNumber = -32;
    const result = flattenObject(testObj);
    expect(typeof result.aNumber).toBe('string');
    expect(result.aNumber).toBe('-32');
  });
});
