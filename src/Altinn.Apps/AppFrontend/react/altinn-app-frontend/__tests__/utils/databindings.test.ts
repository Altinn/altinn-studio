import 'jest';
import { flattenObject, getKeyWithoutIndex, removeGroupData } from '../../src/utils/databindings';
import { ILayout, ILayoutComponent } from '../../src/features/form/layout';

describe('>>> utils/databindings.ts', () => {
  let testObj: any;
  let testFormData: any;
  let testLayout: ILayout;
  let testGroupId: string;

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
    testGroupId = 'group-1';

    testLayout = [
      {
        id: testGroupId,
        type: 'group',
        dataModelBindings: {
          group: 'Group',
        },
        children: [
          'field1',
          'field2',
          'field3',
          'group2',
        ],
        maxCount: 3,
      },
      {
        id: 'group2',
        type: 'Group',
        dataModelBindings: {
          group: 'Group.Group2',
        },
        maxCount: 4,
        children: [
          'field4',
        ],
      },
      {
        id: 'field1',
        type: 'Input',
        dataModelBindings: {
          simple: 'Group.prop1',
        },
        textResourceBindings: {
          title: 'Title',
        },
        readOnly: false,
        required: false,
        disabled: false,
      } as ILayoutComponent,
      {
        id: 'field2',
        type: 'Input',
        dataModelBindings: {
          simple: 'Group.prop2',
        },
        textResourceBindings: {
          title: 'Title',
        },
        readOnly: false,
        required: false,
        disabled: false,
      },
      {
        id: 'field3',
        type: 'Input',
        dataModelBindings: {
          simple: 'Group.prop3',
        },
        textResourceBindings: {
          title: 'Title',
        },
        readOnly: false,
        required: false,
        disabled: false,
      },
      {
        id: 'field4',
        type: 'Input',
        dataModelBindings: {
          simple: 'Group.Group2.group2prop',
        },
        textResourceBindings: {
          title: 'Title',
        },
        readOnly: false,
        required: false,
        disabled: false,
      },
    ];
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

  it('+++ should flatten object as expected', () => {
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
    };
    const result = flattenObject(testObj);
    expect(result).toEqual(testFormData);
  });

  it(' +++ should flatten nested object as expected', () => {
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

  it('+++ should remove form data with the specified index, for the specified group id', () => {
    const result = removeGroupData(testFormData, 1, testLayout, testGroupId, { count: 2 });
    const expected = {
      'Group[0].prop1': 'value-0-1',
      'Group[0].prop2': 'value-0-2',
      'Group[0].prop3': 'value-0-3',
      'Group[0].Group2[0].group2prop': 'group2-0-1-value',
      'Group[0].Group2[1].group2prop': 'group2-0-2-value',
      'Group[1].prop1': 'value-2-1',
      'Group[1].prop2': 'value-2-2',
      'Group[1].prop3': 'value-2-3',
      'Group[1].Group2[0].group2prop': 'group2-2-1-value',
      'Group[1].Group2[1].group2prop': 'group2-2-2-value',
    };
    expect(result).toEqual(expected);
  });

  it('+++ getKeyWithoutIndex should return stripped formdata key for nested groups', () => {
    const withIndex = 'somegroup[0].someprop.someothergroup[2].someotherprop';
    const expected = 'somegroup.someprop.someothergroup.someotherprop';
    const result = getKeyWithoutIndex(withIndex);
    expect(result).toEqual(expected);
  });
});
