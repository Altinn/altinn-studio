import 'jest';
import { flattenObject, removeGroupData } from '../../src/utils/databindings';
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
      'Group[1].prop1': 'value-1-1',
      'Group[1].prop2': 'value-1-2',
      'Group[1].prop3': 'value-1-3',
      'Group[2].prop1': 'value-2-1',
      'Group[2].prop2': 'value-2-2',
      'Group[2].prop3': 'value-2-3',
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
        ],
        maxCount: 3,
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

  it(' +++ should flatten object as expected', () => {
    testObj = {
      Group: [
        {
          prop1: 'value-0-1',
          prop2: 'value-0-2',
          prop3: 'value-0-3',
        },
        {
          prop1: 'value-1-1',
          prop2: 'value-1-2',
          prop3: 'value-1-3',
        },
        {
          prop1: 'value-2-1',
          prop2: 'value-2-2',
          prop3: 'value-2-3',
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
    const result = removeGroupData(testFormData, 1, testLayout, testGroupId, 2);
    const expected = {
      'Group[0].prop1': 'value-0-1',
      'Group[0].prop2': 'value-0-2',
      'Group[0].prop3': 'value-0-3',
      'Group[1].prop1': 'value-2-1',
      'Group[1].prop2': 'value-2-2',
      'Group[1].prop3': 'value-2-3',
    };
    expect(result).toEqual(expected);
  })
});
