import 'jest';
import { IConditionalRenderingRules } from '../../src/features/form/dynamics/types';
import { runConditionalRenderingRules } from '../../src/utils/conditionalRendering';

describe('>>> utils/conditionalRendering.ts', () => {

  let mockValidFormData;
  let mockInvalidFormData;
  let mockShowRules;
  let mockHideRules;
  let mockLayout;
  let mockRuleHandlerHelper;
  let mockRuleHandler;

  beforeAll(() => {
    mockRuleHandlerHelper = {
      biggerThan10: () => {
        return {
          number: 'number',
        };
      },
      lengthBiggerThan4: () => {
        return {
          value: 'value',
        };
      },

    };
    mockRuleHandler = {
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
    mockShowRules = {
      ruleId: {
        selectedFunction: 'biggerThan10',
        inputParams: {
          number: 'mockField',
        },
        selectedAction: 'Show',
        selectedFields: {
          selectedField_1: 'layoutElement_1',
        },
      },
    };

    mockHideRules = {
      ruleId: {
        selectedFunction: 'biggerThan10',
        inputParams: {
          number: 'mockField',
        },
        selectedAction: 'Hide',
        selectedFields: {
          selectedField_1: 'layoutElement_2',
          selectedField_2: 'layoutElement_3',
        },
      },
    };

    mockLayout = [
      {
        type: 'Input',
        id: 'layoutElement_1',
        hidden: false,
      },
      {
        type: 'Input',
        id: 'layoutElement_2',
        hidden: false,
      },
      {
        type: 'Input',
        id: 'layoutElement_3',
        hidden: false,
      },
    ];

    mockValidFormData = {
      mockField: '11',
    };

    mockInvalidFormData = {
      mockField: '4',
    };

    (window as any).conditionalRuleHandlerHelper = mockRuleHandlerHelper;
    (window as any).conditionalRuleHandlerObject = mockRuleHandler;
  });

  it('+++ should HIDE element when rule is set to HIDE and condition is TRUE', () => {
    const result = runConditionalRenderingRules(mockHideRules, mockValidFormData);
    expect(result.findIndex((e) => e === 'layoutElement_2') >= 0).toBe(true);
  });

  it('+++ should SHOW element when rule is set to HIDE and condition is FALSE', () => {
    const result = runConditionalRenderingRules(mockHideRules, mockInvalidFormData);
    expect(result.findIndex((e) => e === 'layoutElement_2') >= 0).toBe(false);
  });

  it('+++ should SHOW element when rule is set to SHOW and condition is TRUE', () => {
    const result = runConditionalRenderingRules(mockShowRules, mockValidFormData);
    expect(result.findIndex((e) => e === 'layoutElement_1') >= 0).toBe(false);
  });

  it('+++ should HIDE element when rule is set to SHOW and condition is FALSE', () => {
    const result = runConditionalRenderingRules(mockShowRules, mockInvalidFormData);
    expect(result.findIndex((e) => e === 'layoutElement_1') >= 0).toBe(true);
  });

  it('+++ conditional rendering rules should only return elements to hide', () => {
    const result = runConditionalRenderingRules(mockShowRules, mockValidFormData);
    expect(result.length).toBe(0);
  });

  it('+++ conditional rendering rules with several targets should be applied to all connected elements', () => {
    const result = runConditionalRenderingRules(mockHideRules, mockValidFormData);
    expect(result.length).toBe(2);
    expect(result[0]).toBe('layoutElement_2');
    expect(result[1]).toBe('layoutElement_3');
  });

  it('+++ should run and return empty result array on null values', () => {
    const result = runConditionalRenderingRules(null, null);
    expect(result.length).toBe(0);
  });

  it('+++ conditional rendering rules should run as expected for repeating groups', () => {
    const showRules: IConditionalRenderingRules = {
      ruleId: {
        selectedFunction: 'biggerThan10',
        inputParams: {
          number: 'mockGroup{0}.mockField',
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
    const repeatingGroups = {
      group_1: {
        count: 0,
      },
    };

    const formData = {
      'mockGroup[0].mockField': '8',
    };

    const result = runConditionalRenderingRules(showRules, formData, repeatingGroups);
    expect(result).toEqual(['layoutElement_2-0', 'layoutElement_3-0']);
  });
});
