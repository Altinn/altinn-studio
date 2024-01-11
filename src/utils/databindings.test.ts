import { flattenObject, getKeyIndex, getKeyWithoutIndex, mapFormData } from 'src/utils/databindings';
import type { IFormData } from 'src/features/formData';
import type { IMapping } from 'src/layout/common.generated';

describe('utils/databindings.ts', () => {
  let testObj: any;
  let testFormData: any;

  beforeEach(() => {
    testObj = {};
    testFormData = {
      'Group[0].prop1': 'value-0-1',
      'Group[0].prop2': 'value-0-2',
      'Group[0].prop3': 'value-0-3',
      'Group[0].Group2[0].group2prop': 'group2-0-1-value',
      'Group[0].Group2[1].group2prop': 'group2-0-2-value',
      'Group[1].prop1': 'value-1-1',
      'Group[1].prop2': 'value-1-2',
      'Group[1].prop3': 'value-1-3',
      'Group[1].Group2[0].group2prop': 'group2-1-1-value',
      'Group[1].Group2[1].group2prop': 'group2-1-2-value',
      'Group[2].prop1': 'value-2-1',
      'Group[2].prop2': 'value-2-2',
      'Group[2].prop3': 'value-2-3',
      'Group[2].Group2[0].group2prop': 'group2-2-1-value',
      'Group[2].Group2[1].group2prop': 'group2-2-2-value',
    };
  });

  describe('getKeyIndex', () => {
    it('should return key indexes from string', () => {
      expect(getKeyIndex('Group[1].Group2[0].group2prop')).toEqual([1, 0]);
    });
  });

  describe('flattenObject', () => {
    it('should return empty string as undefined when inside an object', () => {
      // Testing brokenness to make sure the re-implementation to simplify flattenObject() keeps the
      // same behaviour as the older one. This should be fixed when releasing a breaking change to
      // support more data types.
      testObj.anEmptyString = '';
      testObj.anObject = { withEmptyString: '' };
      testObj.anOtherObject = { withEmptyString: '', withContent: 'content' };
      testObj.anArray = [{ withEmptyString: '', withContent: 'content' }];
      const result = flattenObject(testObj);
      expect(typeof result.anEmptyString).toBe('string');
      expect(typeof result['anObject.withEmptyString']).toBe('undefined');
      expect(typeof result['anObject.withContent']).toBe('undefined');
      expect(typeof result['anOtherObject.withContent']).toBe('string');
      expect(typeof result['anArray[0].withEmptyString']).toBe('undefined');
      expect(typeof result['anArray[0].withContent']).toBe('string');
    });

    it('should return property of type number as a string', () => {
      testObj.aNumber = 43;
      const result = flattenObject(testObj);
      expect(typeof result.aNumber).toBe('string');
      expect(result.aNumber).toBe('43');
    });

    it('should skip null values', () => {
      testObj.aNull = null;
      const result = flattenObject(testObj);
      expect(typeof result.aNull).toBe('undefined');
      expect('aNull' in result).toBe(false);
    });

    it('should skip empty arrays', () => {
      testObj.anEmptyArray = [];
      const result = flattenObject(testObj);
      expect(typeof result.aNull).toBe('undefined');
      expect('aNull' in result).toBe(false);
    });

    it('should return boolean as a string', () => {
      testObj.aBool = true;
      const result = flattenObject(testObj);
      expect(typeof result.aBool).toBe('string');
      expect(result.aBool).toBe('true');
    });

    it('should return float as a string', () => {
      testObj.aFloat = 3.14159265;
      const result = flattenObject(testObj);
      expect(typeof result.aFloat).toBe('string');
      expect(result.aFloat).toBe('3.14159265');
    });

    it('should return property of type number and value 0 as a string with character zero', () => {
      testObj.aNumber = 0;
      const result = flattenObject(testObj);
      expect(typeof result.aNumber).toBe('string');
      expect(result.aNumber).toBe('0');
    });

    it('should return property of type number and value -32 as a string with value -32', () => {
      testObj.aNumber = -32;
      const result = flattenObject(testObj);
      expect(typeof result.aNumber).toBe('string');
      expect(result.aNumber).toBe('-32');
    });

    it('should flatten object as expected', () => {
      testObj = {
        Group: [
          {
            prop1: 'value-0-1',
            prop2: 'value-0-2',
            prop3: 'value-0-3',
            Group2: [
              {
                group2prop: 'group2-0-1-value',
              },
              {
                group2prop: 'group2-0-2-value',
              },
            ],
          },
          {
            prop1: 'value-1-1',
            prop2: 'value-1-2',
            prop3: 'value-1-3',
            Group2: [
              {
                group2prop: 'group2-1-1-value',
              },
              {
                group2prop: 'group2-1-2-value',
              },
            ],
          },
          {
            prop1: 'value-2-1',
            prop2: 'value-2-2',
            prop3: 'value-2-3',
            Group2: [
              {
                group2prop: 'group2-2-1-value',
              },
              {
                group2prop: 'group2-2-2-value',
              },
            ],
          },
        ],
        EmptyGroup: [],
      };
      const result = flattenObject(testObj);
      expect(result).toEqual(testFormData);
    });

    it('should flatten nested object as expected', () => {
      const testObject = {
        person: {
          name: {
            firstName: 'Navn',
            lastName: 'Navnesen',
          },
        },
      };

      const expected = {
        'person.name.firstName': 'Navn',
        'person.name.lastName': 'Navnesen',
      };

      const result = flattenObject(testObject);
      expect(result).toEqual(expected);
    });

    it('should flatten arrays with primitive types as expected', () => {
      const testObject = {
        employees: [{ name: 'Jane Smith' }, { name: 'John Smith' }],
        industries: ['Carpentry', 'Construction'],
      };

      const expected = {
        'employees[0].name': 'Jane Smith',
        'employees[1].name': 'John Smith',
        'industries[0]': 'Carpentry',
        'industries[1]': 'Construction',
      };

      const result = flattenObject(testObject);
      expect(result).toEqual(expected);
    });
  });

  describe('getKeyWithouthIndex', () => {
    it('should return stripped formdata key for nested groups', () => {
      const withIndex = 'somegroup[0].someprop.someothergroup[2].someotherprop';
      const expected = 'somegroup.someprop.someothergroup.someotherprop';
      const result = getKeyWithoutIndex(withIndex);
      expect(result).toEqual(expected);
    });
  });

  describe('mapFormData', () => {
    it('should map form data according to the defined mapping', () => {
      const mapping: IMapping = {
        'some.nested.field': 'nestedValueField',
        'nested.group[0].field': 'nestedGroupField',
        'field.does.not.exist': 'undefinedField',
      };
      const formData: IFormData = {
        'some.nested.field': 'nested value',
        'nested.group[0].field': 'nested group value',
      };
      const expectedResult: object = {
        nestedValueField: 'nested value',
        nestedGroupField: 'nested group value',
        undefinedField: undefined,
      };
      const result = mapFormData(formData, mapping);
      expect(result).toEqual(expectedResult);
    });

    it.each([{}, undefined, null])('should return an empty object if form data is %p', (formData) => {
      const mapping: IMapping = {
        someSource: 'someTarget',
      };
      expect(mapFormData(formData as any, mapping)).toEqual({});
    });

    it.each([undefined, null])('should return whole form data object if mapping is %p', (mapping) => {
      const formData: IFormData = {
        someField: 'someValue',
        someOtherField: 'someOtherValue',
      };
      expect(mapFormData(formData, mapping as any)).toEqual(formData);
    });
  });
});
