import { runConditionalRenderingRules } from 'src/utils/conditionalRendering';
import type { IConditionalRenderingRules } from 'src/features/form/dynamics';

describe('conditionalRendering', () => {
  let mockValidFormData;
  let mockInvalidFormData;
  let mockShowRules;
  let mockHideRules;
  let mockRuleHandlerHelper;
  let mockRuleHandler;

  beforeAll(() => {
    mockRuleHandlerHelper = {
      biggerThan10: () => ({
        number: 'number',
      }),
      lengthBiggerThan4: () => ({
        value: 'value',
      }),
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

    mockValidFormData = {
      mockField: '11',
    };

    mockInvalidFormData = {
      mockField: '4',
    };

    (window as any).conditionalRuleHandlerHelper = mockRuleHandlerHelper;
    (window as any).conditionalRuleHandlerObject = mockRuleHandler;
  });

  it('should HIDE element when rule is set to HIDE and condition is TRUE', () => {
    const result = runConditionalRenderingRules(mockHideRules, mockValidFormData);
    expect(result.has('layoutElement_2')).toBe(true);
  });

  it('should SHOW element when rule is set to HIDE and condition is FALSE', () => {
    const result = runConditionalRenderingRules(mockHideRules, mockInvalidFormData);
    expect(result.has('layoutElement_2')).toBe(false);
  });

  it('should SHOW element when rule is set to SHOW and condition is TRUE', () => {
    const result = runConditionalRenderingRules(mockShowRules, mockValidFormData);
    expect(result.has('layoutElement_1')).toBe(false);
  });

  it('should HIDE element when rule is set to SHOW and condition is FALSE', () => {
    const result = runConditionalRenderingRules(mockShowRules, mockInvalidFormData);
    expect(result.has('layoutElement_1')).toBe(true);
  });

  it('conditional rendering rules should only return elements to hide', () => {
    const result = runConditionalRenderingRules(mockShowRules, mockValidFormData);
    expect(result.size).toBe(0);
  });

  it('conditional rendering rules with several targets should be applied to all connected elements', () => {
    const result = runConditionalRenderingRules(mockHideRules, mockValidFormData);
    expect(result.size).toBe(2);
    expect(result.has('layoutElement_2')).toBe(true);
    expect(result.has('layoutElement_3')).toBe(true);
  });

  it('should run and return empty result array on null values', () => {
    const result = runConditionalRenderingRules(null, null);
    expect(result.size).toBe(0);
  });

  it('conditional rendering rules should run as expected for repeating groups', () => {
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
        index: 0,
      },
    };

    const formData = {
      'mockGroup[0].mockField': '8',
    };

    const result = runConditionalRenderingRules(showRules, formData, repeatingGroups);
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
    const repeatingGroups = {
      group_1: {
        index: 1,
      },
      'group_2-0': {
        index: 2,
      },
      'group_2-1': {
        index: 2,
      },
    };

    const formData = {
      'parentGroup[0].childGroup[0].mockField': '11',
      'parentGroup[0].childGroup[1].mockField': '8',
      'parentGroup[0].childGroup[2].mockField': '8',
      'parentGroup[1].childGroup[0].mockField': '8',
      'parentGroup[1].childGroup[1].mockField': '8',
      'parentGroup[1].childGroup[2].mockField': '11',
    };

    const result = runConditionalRenderingRules(showRules, formData, repeatingGroups);

    expect([...result.values()]).toEqual([
      'someField-0-0',
      'someOtherField-0-0',
      'someField-1-2',
      'someOtherField-1-2',
    ]);
  });
});
