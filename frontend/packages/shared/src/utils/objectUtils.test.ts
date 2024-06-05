import { areObjectsEqual, mapByProperty, flattenObjectValues } from 'app-shared/utils/objectUtils';

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
  });

  describe('flattenObjectValues', () => {
    it('Flattens the values of an object', () => {
      const object = {
        a: 'value1',
        b: 'value2',
        c: 'value3',
      };
      expect(flattenObjectValues(object)).toEqual(['value1', 'value2', 'value3']);
    });
  });
});
