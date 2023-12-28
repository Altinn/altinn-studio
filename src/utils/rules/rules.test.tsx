import { getRuleModelFields } from 'src/utils/rules';

const ruleHandleFn = (obj) => {
  obj.a = +obj.a;
  obj.b = +obj.b;
  obj.c = +obj.c;
  return obj.a + obj.b + obj.c;
};

describe('rules getRuleModelFields', () => {
  let mockRuleHandlerHelper: any;
  let mockConditionalRuleHandlerHelper: any;
  let mockConditionalRuleHandlerObject: any;
  let mockRuleHandlerObject: any;

  beforeEach(() => {
    const numberFn = () => ({
      number: 'number',
    });

    mockRuleHandlerHelper = {
      sum: numberFn,
    };
    mockConditionalRuleHandlerHelper = {
      biggerThan10: numberFn,
      lengthBiggerThan4: () => ({
        value: 'value',
      }),
    };
    mockConditionalRuleHandlerObject = {
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
    mockRuleHandlerObject = {
      sum: ruleHandleFn,
    };
    const mockRuleScript =
      'var ruleHandlerObject = { sum: (obj) => { obj.a = +obj.a; obj.b = +obj.b; obj.c = +obj.c; return; ' +
      'obj.a + obj.b + obj.c; }, fullName: (obj) => { return obj.first + " " + obj.last; } } var ruleHandlerHelper' +
      ' = { fullName: () => { return { first: "first name", last: "last name" }; }, sum: () => { return { a: "a", b: ' +
      '"b", c: "c" } } } var conditionalRuleHandlerObject = { biggerThan10: (obj) => { obj.number = +obj.number;' +
      'return obj.number > 10; }, smallerThan10: (obj) => { obj.number = +obj.number; return obj.number > 10; }, ' +
      'lengthBiggerThan4: (obj) => { if (obj.value == null) return false; return obj.value.length >= 4; } } ' +
      'var conditionalRuleHandlerHelper = { biggerThan10: () => { return { number: "number" }; }, smallerThan10:' +
      ' () => { return { number: "number" } }, lengthBiggerThan4: () => { return { value: "value" } } }';

    const scriptEle = window.document.createElement('script');
    scriptEle.innerHTML = mockRuleScript;
    window.ruleHandlerHelper = mockRuleHandlerHelper;
    window.conditionalRuleHandlerHelper = mockConditionalRuleHandlerHelper;
    window.conditionalRuleHandlerObject = mockConditionalRuleHandlerObject;
    window.ruleHandlerObject = mockRuleHandlerObject;
  });

  it('should return an array ', () => {
    const ruleModelFields = getRuleModelFields();
    const expectedResult = [
      {
        inputs: { number: 'number' },
        name: 'sum',
        type: 'rule',
      },
      {
        inputs: { number: 'number' },
        name: 'biggerThan10',
        type: 'condition',
      },
      {
        inputs: { value: 'value' },
        name: 'lengthBiggerThan4',
        type: 'condition',
      },
    ];
    expect(Array.isArray(ruleModelFields)).toBe(true);
    expect(ruleModelFields).toEqual(expectedResult);
  });
});
