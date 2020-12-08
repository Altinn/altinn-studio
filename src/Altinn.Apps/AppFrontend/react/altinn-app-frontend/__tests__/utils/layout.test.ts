import 'jest';
import { ILayout, ILayoutComponent, ILayoutGroup } from '../../src/features/form/layout';
import { IRepeatingGroups } from '../../src/types';
import { getRepeatingGroups, removeRepeatingGroupFromUIConfig } from '../../src/utils/formLayout';

describe('>>> layout.ts', () => {
  it('+++ getRepeatingGroups should handle nested groups', () => {
    const testLayout: ILayout = [
      {
        id: 'Group1',
        type: 'group',
        dataModelBindings: {
          group: 'Group1',
        },
        children: [
          'field1',
          'Group2',
        ],
        maxCount: 3,
      } as ILayoutGroup,
      {
        id: 'Group2',
        type: 'Group',
        dataModelBindings: {
          group: 'Group1.Group2',
        },
        maxCount: 4,
        children: [
          'field2',
        ],
      } as ILayoutGroup,
      {
        id: 'field1',
        type: 'Input',
        dataModelBindings: {
          simple: 'Group1.prop1',
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
          simple: 'Group1.Group2.prop1',
        },
        textResourceBindings: {
          title: 'Title',
        },
        readOnly: false,
        required: false,
        disabled: false,
      } as ILayoutComponent,
    ];
    const formData = {
      'Group1[0].prop1': 'value-0-1',
      'Group1[0].Group2[0].group2prop': 'group2-0-0-value',
      'Group1[1].prop1': 'value-1-1',
      'Group1[1].Group2[0].group2prop': 'group2-1-0-value',
      'Group1[1].Group2[1].group2prop': 'group2-1-1-value',
      'Group1[1].Group2[2].group2prop': 'group2-1-2-value',
      'Group1[1].Group2[3].group2prop': 'group2-1-3-value',
      'Group1[1].Group2[4].group2prop': 'group2-1-3-value',
      'Group1[2].prop1': 'value-2-1',
      'Group1[2].Group2[0].group2prop': 'group2-2-1-value',
      'Group1[2].Group2[1].group2prop': 'group2-2-2-value',
    };
    const expected = {
      Group1: {
        count: 2,
      },
      'Group2-0': {
        count: 0,
        baseGroupId: 'Group2',
      },
      'Group2-1': {
        count: 4,
        baseGroupId: 'Group2',
      },
      'Group2-2': {
        count: 1,
        baseGroupId: 'Group2',
      },
    };
    const result = getRepeatingGroups(testLayout, formData);
    expect(result).toEqual(expected);
  });

  it('+++ getRepeatingGroups should return correct count', () => {
    const testLayout: ILayout = [
      {
        id: 'Group1',
        type: 'group',
        dataModelBindings: {
          group: 'Group1',
        },
        children: [
          'field1',
        ],
        maxCount: 3,
      } as ILayoutGroup,
      {
        id: 'Group2',
        type: 'group',
        dataModelBindings: {
          group: 'Group2',
        },
        children: [
          'field2',
        ],
        maxCount: 3,
      } as ILayoutGroup,
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
          simple: 'Group2.prop1',
        },
        textResourceBindings: {
          title: 'Title',
        },
        readOnly: false,
        required: false,
        disabled: false,
      } as ILayoutComponent,
    ];
    const formData = {
      'Group1[0].prop1': 'value-0-1',
      'Group1[1].prop1': 'value-1-1',
      'Group1[2].prop1': 'value-2-1',
      'Group1[3].prop1': 'value-3-1',
      'Group2[0].prop1': 'value-0-1',
      'Group2[1].prop1': 'value-1-1',
      'Group2[2].prop1': 'value-2-1',
    };
    const expected = {
      Group1: {
        count: 3,
      },
      Group2: {
        count: 2,
      },
    };
    const result = getRepeatingGroups(testLayout, formData);
    expect(result).toEqual(expected);
  });

  it('+++ removeRepeatingGroupFromUIConfig should delete given index', () => {
    const repeatingGroups: IRepeatingGroups = {
      Group: {
        count: 1,
      },
      'Group2-0': {
        count: 2,
      },
      'Group2-1': {
        count: 3,
      },
    };
    const result = removeRepeatingGroupFromUIConfig(repeatingGroups, 'Group2', 1, false);
    const expected: IRepeatingGroups = {
      Group: {
        count: 1,
      },
      'Group2-0': {
        count: 2,
      },
    };
    expect(result).toEqual(expected);
  });

  it('+++ removeRepeatingGroupFromUIConfig should shift successfully', () => {
    const repeatingGroups: IRepeatingGroups = {
      Group: {
        count: 1,
      },
      'Group2-0': {
        count: 2,
      },
      'Group2-1': {
        count: 3,
      },
    };
    const result = removeRepeatingGroupFromUIConfig(repeatingGroups, 'Group2', 0, true);
    const expected: IRepeatingGroups = {
      Group: {
        count: 1,
      },
      'Group2-0': {
        count: 3,
      },
    };
    expect(result).toEqual(expected);
  });
});
