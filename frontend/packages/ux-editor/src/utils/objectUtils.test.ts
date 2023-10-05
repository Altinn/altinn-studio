import { mapByProperty } from './objectUtils';

describe('objectUtils', () => {
  describe('mapByProperty', () => {
    it('Maps an array of objects to a key-value pair object, where the key is the value of the property', () => {
      const property = 'id';
      const value1 = 'value1';
      const value2 = 'value2';
      const value3 = 'value3';
      const object1 = { [property]: value1 };
      const object2 = { [property]: value2, otherProperty: 'Some irrelevant value' };
      const object3 = { [property]: value3, otherProperty: 'Another irrelevant value' };
      const objectList = [object1, object2, object3];
      expect(mapByProperty(objectList, property)).toEqual({
        [value1]: object1,
        [value2]: object2,
        [value3]: object3,
      });
    });
  });
});
