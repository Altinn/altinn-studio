import { areObjectsEqual, mapByProperty } from 'app-shared/utils/objectUtils';

describe('objectUtils', () => {
  describe('areObjectsEqual', () => {
    it('Returns true if objects are equal', () => {
      expect(areObjectsEqual({}, {})).toBe(true);
      expect(areObjectsEqual({ a: 1 }, { a: 1 })).toBe(true);
      expect(areObjectsEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
      expect(areObjectsEqual({ a: 1, b: 2, c: 3 }, { a: 1, b: 2, c: 3 })).toBe(true);
    });

    it('Returns false if objects are not equal', () => {
      expect(areObjectsEqual({ a: 1 }, { a: 2 })).toBe(false);
      expect(areObjectsEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
      expect(areObjectsEqual({ a: 1, b: 2, c: 3 }, { a: 1, b: 2, c: 4 })).toBe(false);
    });
  });

  describe('mapByProperty', () => {
    const property = 'id';
    const value1 = 'value1';
    const value2 = 'value2';
    const value3 = 'value3';
    const object1 = { [property]: value1 };
    const object2 = { [property]: value2, otherProperty: 'Some irrelevant value' };
    const object3 = { [property]: value3, otherProperty: 'Another irrelevant value' };

    it('Maps an array of objects to a key-value pair object, where the key is the value of the property', () => {
      const objectList = [object1, object2, object3];
      expect(mapByProperty(objectList, property)).toEqual({
        [value1]: object1,
        [value2]: object2,
        [value3]: object3,
      });
    });

    it('Throws an error if the values of the given property are not unique', () => {
      const object4 = { [property]: value1 };
      const objectList = [object1, object2, object3, object4];
      const expectedError =
        'The values of the given property in the mapByProperty function should be unique.';
      expect(() => mapByProperty(objectList, property)).toThrowError(expectedError);
    });
  });
});
