import { beforeAll } from '@jest/globals';
import dot from 'dot-object';
import { v4 as uuidv4 } from 'uuid';

import { getHierarchyDataSourcesMock } from 'src/__mocks__/getHierarchyDataSourcesMock';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { runConditionalRenderingRules } from 'src/utils/conditionalRendering';
import { _private } from 'src/utils/layout/hierarchy';
import type { IConditionalRenderingRules } from 'src/features/form/dynamics';
import type { ILayout } from 'src/layout/layout';

const { resolvedNodesInLayouts } = _private;

describe('conditionalRendering', () => {
  beforeAll(() => {
    window.conditionalRuleHandlerObject = {
      biggerThan10: (obj) => {
        obj.number = +obj.number;
        return obj.number > 10;
      },
      lengthBiggerThan4: (obj) => {
        if (obj.value == null) {
          return false;
        }
        return obj.value.length >= 4;
      },
    };
  });

  const layout: ILayout = [
    {
      id: 'group_1',
      type: 'RepeatingGroup',
      dataModelBindings: {
        group: 'parentGroup',
      },
      maxCount: 3,
      children: ['input_1', 'group_2'],
    },
    {
      id: 'group_2',
      type: 'RepeatingGroup',
      dataModelBindings: {
        group: 'parentGroup.childGroup',
      },
      maxCount: 3,
      children: ['input_2'],
    },
    {
      id: 'input_1',
      type: 'Input',
      dataModelBindings: {
        simpleBinding: 'parentGroup.mockField',
      },
    },
    {
      id: 'input_2',
      type: 'Input',
      dataModelBindings: {
        simpleBinding: 'parentGroup.childGroup.mockField',
      },
    },
  ];

  function makeNodes(formData: object) {
    return resolvedNodesInLayouts({ FormLayout: layout }, 'FormLayout', {
      ...getHierarchyDataSourcesMock(),
      formDataSelector: (path: string) => dot.pick(path, formData),
    });
  }

  it('conditional rendering rules should run as expected for repeating groups', () => {
    const showRules: IConditionalRenderingRules = {
      ruleId: {
        selectedFunction: 'biggerThan10',
        inputParams: {
          number: 'parentGroup{0}.mockField',
        },
        selectedFields: {
          selectedField_1: 'layoutElement_2{0}',
          selectedField_2: 'layoutElement_3{0}',
        },
        selectedAction: 'Show',
        repeatingGroup: {
          groupId: 'group_1',
        },
      },
    };

    const formDataAsObj = { parentGroup: [{ [ALTINN_ROW_ID]: uuidv4(), mockField: '8' }] };
    const nodes = makeNodes(formDataAsObj);

    const result = runConditionalRenderingRules(showRules, nodes);
    expect([...result.values()]).toEqual(['layoutElement_2-0', 'layoutElement_3-0']);
  });

  it('conditional rendering rules should run as expected for nested repeating groups', () => {
    const showRules: IConditionalRenderingRules = {
      ruleId: {
        selectedFunction: 'biggerThan10',
        inputParams: {
          number: 'parentGroup{0}.childGroup{1}.mockField',
        },
        selectedFields: {
          selectedField_1: 'someField{0}{1}',
          selectedField_2: 'someOtherField{0}{1}',
        },
        selectedAction: 'Hide',
        repeatingGroup: {
          groupId: 'group_1',
          childGroupId: 'group_2',
        },
      },
    };

    const formDataAsObj = {
      parentGroup: [
        {
          [ALTINN_ROW_ID]: uuidv4(),
          childGroup: [
            { [ALTINN_ROW_ID]: uuidv4(), mockField: '11' },
            { [ALTINN_ROW_ID]: uuidv4(), mockField: '8' },
            { [ALTINN_ROW_ID]: uuidv4(), mockField: '8' },
          ],
        },
        {
          [ALTINN_ROW_ID]: uuidv4(),
          childGroup: [
            { [ALTINN_ROW_ID]: uuidv4(), mockField: '8' },
            { [ALTINN_ROW_ID]: uuidv4(), mockField: '8' },
            { [ALTINN_ROW_ID]: uuidv4(), mockField: '11' },
          ],
        },
      ],
    };
    const nodes = makeNodes(formDataAsObj);

    const result = runConditionalRenderingRules(showRules, nodes);

    expect([...result.values()]).toEqual([
      'someField-0-0',
      'someOtherField-0-0',
      'someField-1-2',
      'someOtherField-1-2',
    ]);
  });
});
