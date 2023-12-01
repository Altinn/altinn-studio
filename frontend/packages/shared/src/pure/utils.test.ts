import { deepCopy } from 'app-shared/pure/utils';

describe('deepCopy', () => {
  it('should create a deep copy of an object', () => {
    const originalObject = {
      test: 'Test',
      test2: 25,
    };

    const copiedObject = deepCopy(originalObject);

    expect(copiedObject).toEqual(originalObject);
    expect(copiedObject).not.toBe(originalObject);
  });

  it('should create a deep copy of an array', () => {
    const originalArray = [1, 2, [3, 4]];

    const copiedArray = deepCopy(originalArray);

    expect(copiedArray).toEqual(originalArray);
    expect(copiedArray).not.toBe(originalArray);
  });
});
