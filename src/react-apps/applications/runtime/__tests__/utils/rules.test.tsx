import 'jest';
import { IFormData } from '../../src/features/form/data/reducer';
import { ILayoutComponent } from '../../src/features/form/layout';
import { IDataModelFieldElement } from '../../src/features/form/rules';
import { checkIfRuleShouldRun, getRuleModelFields } from '../../src/utils/rules';

describe('>>> features/rules checkIfRuleShouldRun', () => {
  let mockRuleConnectionState: any;
  let mockFormDataState: IFormData;
  let mockFormDataModelState: any;
  let mockFormLayoutState: any;
  let mockRepeatingContainerId: string;
  let mockLastUpdatedDataBinding: IDataModelFieldElement;
  let mockRuleHandlerHelper;
  let mockRuleHandlerObject;
  let mockLayout: ILayoutComponent[];

  beforeEach(() => {
    mockRuleHandlerHelper = {
      sum: () => {
        return {
          number: '1',
        };
      },
    };
    mockRuleHandlerObject = {
      sum: (obj) => {
        obj.a = +obj.a;
        obj.b = +obj.b;
        obj.c = +obj.c;
        return obj.a + obj.b + obj.c;
      },
    };
    mockLayout = [
      {
        type: 'Input',
        dataModelBindings: { simpleBinding: 'mockDataModelBinding1' },
        disabled: false,
        hidden: false,
        id: '78e3616e-44cb-4a94-a1bd-83768539d31c',
        readOnly: false,
        required: false,
        textResourceBindings: { title: 'ServiceName' },
      },
      {
        dataModelBindings: { simpleBinding: 'mockDataModelBinding2' },
        disabled: false,
        hidden: false,
        id: 'd48096d4-7365-4392-b745-b7e4c8c933e6',
        readOnly: false,
        required: false,
        textResourceBindings: { title: 'ServiceName' },
        type: 'Input',
      },
      {
        dataModelBindings: { simpleBinding: 'mockDataModelBinding3' },
        disabled: false,
        hidden: false,
        id: '1d61265e-66a4-48c6-800a-a77c50a8ca41',
        readOnly: false,
        required: false,
        textResourceBindings: { title: 'ServiceName' },
        type: 'Input',
      },
      {
        dataModelBindings: { simpleBinding: 'mockDataModelBinding4' },
        disabled: false,
        hidden: false,
        id: '69fa4c53-6c04-490c-aadb-98a47b145a82',
        readOnly: false,
        required: false,
        textResourceBindings: { title: 'ServiceName' },
        type: 'Input',
      },
    ];
    mockRuleConnectionState = {
      'fc4136a0-73c3-11e9-acee-8f5155710498':
      {
        inputParams: {
          a: 'mockDataModelBinding1',
          b: 'mockDataModelBinding2',
          c: 'mockDataModelBinding3',
        },
        selectedFunction: 'sum',
        outParams: { outParam0: 'mockDataModelBinding4' },
      },
    };
    mockFormDataState = {
      error: null,
      formData: {
        mockDataModelBinding1: '1',
      },
      unsavedChanges: false,
    };
    mockFormDataModelState = {
      dataModel: [
        {
          ID: 'Skjema.mockDataModelBinding1',
          DataBindingName: 'mockDataModelBinding1',
        },
        {
          ID: 'Skjema.mockDataModelBinding2',
          DataBindingName: 'mockDataModelBinding2',
        },
        {
          ID: 'Skjema.mockDataModelBinding3',
          DataBindingName: 'mockDataModelBinding3',
        },
        {
          ID: 'Skjema.mockDataModelBinding4',
          DataBindingName: 'mockDataModelBinding4',
        },
      ],
      error: null,
    };
    mockFormLayoutState = {
      error: null,
      layout: mockLayout,
    };
    mockRepeatingContainerId = null; // Should be tests on repeating groups when it's implemented
    mockLastUpdatedDataBinding = {
      ID: 'Skjema.mockDataModelBinding2',
      DataBindingName: 'mockDataModelBinding2',
      DisplayString: 'Skjema.mockDataModelBinding2 : [0..1] String',
      IsReadOnly: false,
      IsTagContent: false,
      JsonSchemaPointer: '#/definitions/Skjema/properties/mockDataModelBinding2',
      MaxOccurs: 1,
      MinOccurs: 0,
      Name: 'mockDataModelBinding2',
      Restrictions: {},
      ParentElement: 'Skjema',
      Texts: {},
      Type: 'Attribute',
      TypeName: 'String',
      XName: 'etatid',
      XPath: '/Skjema/mockDataModelBinding2',
      XmlSchemaXPath: null,
      XsdValueType: 'String',
    };
    (window as any).ruleHandlerHelper = mockRuleHandlerHelper;
    (window as any).ruleHandlerObject = mockRuleHandlerObject;
  });

  it('+++ should return true if rule should be triggered', () => {
    const rules = checkIfRuleShouldRun(
      mockRuleConnectionState,
      mockFormDataState,
      mockFormDataModelState,
      mockFormLayoutState,
      mockRepeatingContainerId,
      mockLastUpdatedDataBinding,
    );
    expect(rules[0].ruleShouldRun).toBe(true);
    expect(rules[0].dataBindingName).toEqual('mockDataModelBinding4');
  });
  it('+++ should return false if no rule should be triggered', () => {
    mockLastUpdatedDataBinding = {
      ID: 'Skjema.mockDataModelBinding5',
      DataBindingName: 'mockDataModelBinding5',
      DisplayString: 'Skjema.mockDataModelBinding5 : [0..1] String',
      IsReadOnly: false,
      IsTagContent: false,
      JsonSchemaPointer: '#/definitions/Skjema/properties/mockDataModelBinding5',
      MaxOccurs: 1,
      MinOccurs: 0,
      Name: 'mockDataModelBinding5',
      Restrictions: {},
      ParentElement: 'Skjema',
      Texts: {},
      Type: 'Attribute',
      TypeName: 'String',
      XName: 'etatid',
      XPath: '/Skjema/mockDataModelBinding5',
      XmlSchemaXPath: null,
      XsdValueType: 'String',
    };

    const rules = checkIfRuleShouldRun(
      mockRuleConnectionState,
      mockFormDataState,
      mockFormDataModelState,
      mockFormLayoutState,
      mockRepeatingContainerId,
      mockLastUpdatedDataBinding,
    );
    expect(rules.length).toBe(0);
  });
  it('+++ no ruleConnection, no rules ', () => {
    mockRuleConnectionState = {};

    const rules = checkIfRuleShouldRun(
      mockRuleConnectionState,
      mockFormDataState,
      mockFormDataModelState,
      mockFormLayoutState,
      mockRepeatingContainerId,
      mockLastUpdatedDataBinding,
    );
    expect(rules.length).toBe(0);
  });
  it('+++ no dataBindingkey, no rules ', () => {
    mockFormLayoutState = {
      error: null,
      layout: [
        {
          type: 'Input',
          dataModelBindings: {},
          disabled: false,
          id: '78e3616e-44cb-4a94-a1bd-83768539d31c',
          readOnly: false,
          required: false,
          textResourceBindings: { title: 'ServiceName' },
        },
        {
          type: 'Input',
          dataModelBindings: {},
          id: 'd48096d4-7365-4392-b745-b7e4c8c933e6',
          readOnly: false,
          required: false,
          textResourceBindings: { title: 'ServiceName' },
        },
      ],
    };
    const rules = checkIfRuleShouldRun(
      mockRuleConnectionState,
      mockFormDataState,
      mockFormDataModelState,
      mockFormLayoutState,
      mockRepeatingContainerId,
      mockLastUpdatedDataBinding,
    );
    expect(rules.length).toBe(0);
  });
  it('+++ if no components, no rules ', () => {
    mockFormLayoutState = {
      error: null,
      layout: [],
    };
    const rules = checkIfRuleShouldRun(
      mockRuleConnectionState,
      mockFormDataState,
      mockFormDataModelState,
      mockFormLayoutState,
      mockRepeatingContainerId,
      mockLastUpdatedDataBinding,
    );
    expect(rules.length).toBe(0);
  });
  it('+++ if no input params, no rules ', () => {
    const rules = checkIfRuleShouldRun(
      {
        'fc4136a0-73c3-11e9-acee-8f5155710498':
        {
          inputParams: {},
          selectedFunction: 'sum',
          outParams: { outParam0: 'mockDataModelBinding4' },
        },
      },
      mockFormDataState,
      mockFormDataModelState,
      mockFormLayoutState,
      mockRepeatingContainerId,
      mockLastUpdatedDataBinding,
    );
    expect(rules.length).toBe(0);
  });
  it('+++ if no output params, no rules ', () => {
    const rules = checkIfRuleShouldRun(
      {
        'fc4136a0-73c3-11e9-acee-8f5155710498':
        {
          inputParams: {
            a: 'mockDataModelBinding1',
            b: 'mockDataModelBinding2',
            c: 'mockDataModelBinding3',
          },
          selectedFunction: 'sum',
          outParams: {},
        },
      },
      mockFormDataState,
      mockFormDataModelState,
      mockFormLayoutState,
      mockRepeatingContainerId,
      mockLastUpdatedDataBinding,
    );
    expect(rules.length).toBe(0);
  });
  it('+++ if container the function should continue ', () => {
    mockFormLayoutState = {
      error: null,
      layout: [{
        id: 'mockId',
        type: 'container',
        hidden: false,
        children: {},
      }],
    };
    const rules = checkIfRuleShouldRun(
      mockRuleConnectionState,
      mockFormDataState,
      mockFormDataModelState,
      mockFormLayoutState,
      mockRepeatingContainerId,
      mockLastUpdatedDataBinding,
    );
    expect(rules.length).toBe(0);
  });
});
describe('>>> features/rules getRuleModelFields', () => {
  beforeEach(() => {
    let mockRuleHandlerHelper;
    let mockConditionalRuleHandlerHelper;
    let mockConditionalRuleHandlerObject;
    let mockRuleHandlerObject;
    mockRuleHandlerHelper = {
      sum: () => {
        return {
          number: 'number',
        };
      },
    };
    mockConditionalRuleHandlerHelper = {
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
      sum: (obj) => {
        obj.a = +obj.a;
        obj.b = +obj.b;
        obj.c = +obj.c;
        return obj.a + obj.b + obj.c;
      },
    };
    const mockRuleScript =
      'var ruleHandlerObject = { sum: (obj) => { obj.a = +obj.a; obj.b = +obj.b; obj.c = +obj.c; return' +
      'obj.a + obj.b + obj.c; }, fullName: (obj) => { return obj.first + " " + obj.last; } } var ruleHandlerHelper' +
      ' = { fullName: () => { return { first: "first name", last: "last name" }; }, sum: () => { return { a: "a", b: ' +
      '"b", c: "c" } } } var conditionalRuleHandlerObject = { biggerThan10: (obj) => { obj.number = +obj.number;' +
      'return obj.number > 10; }, smallerThan10: (obj) => { obj.number = +obj.number; return obj.number > 10; }, ' +
      'lengthBiggerThan4: (obj) => { if (obj.value == null) return false; return obj.value.length >= 4; } } ' +
      'var conditionalRuleHandlerHelper = { biggerThan10: () => { return { number: "number" }; }, smallerThan10:' +
      ' () => { return { number: "number" } }, lengthBiggerThan4: () => { return { value: "value" } } }';

    const scriptEle = (window as any).document.createElement('script');
    scriptEle.innerHTML = mockRuleScript;
    (window as any).ruleHandlerHelper = mockRuleHandlerHelper;
    (window as any).conditionalRuleHandlerHelper = mockConditionalRuleHandlerHelper;
    (window as any).conditionalRuleHandlerObject = mockConditionalRuleHandlerObject;
    (window as any).ruleHandlerObject = mockRuleHandlerObject;
  });
  it('+++ should return an array ', () => {
    const ruleModelFields = getRuleModelFields();
    const expectedResult = [{
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
