import 'jest';
import { IFormData } from '../../src/features/form/data/reducer';
import { IDataModelState } from '../../src/features/form/datamodell/reducer';
import { ILayoutState } from '../../src/features/form/layout/reducer';
import { IDataModelFieldElement } from '../../src/features/form/rules';
import { checkIfRuleShouldRun } from '../../src/utils/rules';

describe('>>> features/rules', () => {
  let mockRuleConnectionState: any;
  let mockFormDataState: IFormData;
  let mockFormDataModelState: IDataModelState;
  let mockFormLayoutState: ILayoutState;
  let mockRepeatingContainerId: string;
  let mockLastUpdatedDataBinding: IDataModelFieldElement;
  let mockRuleHandlerHelper;
  let mockRuleHandlerObject;

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
      layout: [
        {
          component: 'Input',
          dataModelBindings: { simpleBinding: 'mockDataModelBinding1' },
          id: '78e3616e-44cb-4a94-a1bd-83768539d31c',
          itemType: 'COMPONENT',
          readOnly: false,
          required: false,
          textResourceBindings: { title: 'ServiceName' },
        },
        {
          component: 'Input',
          dataModelBindings: { simpleBinding: 'mockDataModelBinding2' },
          id: 'd48096d4-7365-4392-b745-b7e4c8c933e6',
          itemType: 'COMPONENT',
          readOnly: false,
          required: false,
          textResourceBindings: { title: 'ServiceName' },
        },
        {
          component: 'Input',
          dataModelBindings: { simpleBinding: 'mockDataModelBinding3' },
          id: '1d61265e-66a4-48c6-800a-a77c50a8ca41',
          itemType: 'COMPONENT',
          readOnly: false,
          required: false,
          textResourceBindings: { title: 'ServiceName' },
        },
        {
          component: 'Input',
          dataModelBindings: { simpleBinding: 'mockDataModelBinding4' },
          id: '69fa4c53-6c04-490c-aadb-98a47b145a82',
          itemType: 'COMPONENT',
          readOnly: false,
          required: false,
          textResourceBindings: { title: 'ServiceName' },
        },
      ],
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
    const { ruleShouldRun, dataBindingName, result } = checkIfRuleShouldRun(
      mockRuleConnectionState,
      mockFormDataState,
      mockFormDataModelState,
      mockFormLayoutState,
      mockRepeatingContainerId,
      mockLastUpdatedDataBinding,
    );
    expect(ruleShouldRun).toBe(true);
    expect(dataBindingName).toEqual('mockDataModelBinding4');
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

    const { ruleShouldRun } = checkIfRuleShouldRun(
      mockRuleConnectionState,
      mockFormDataState,
      mockFormDataModelState,
      mockFormLayoutState,
      mockRepeatingContainerId,
      mockLastUpdatedDataBinding,
    );
    expect(ruleShouldRun).toBe(false);
  });
  it('+++ no ruleConnection, no rules ', () => {
    mockRuleConnectionState = {};

    const { ruleShouldRun } = checkIfRuleShouldRun(
      mockRuleConnectionState,
      mockFormDataState,
      mockFormDataModelState,
      mockFormLayoutState,
      mockRepeatingContainerId,
      mockLastUpdatedDataBinding,
    );
    expect(ruleShouldRun).toBe(false);
  });
  it('+++ no dataBindingkey, no rules ', () => {
    mockFormLayoutState = {
      error: null,
      layout: [
        {
          component: 'Input',
          dataModelBindings: {},
          id: '78e3616e-44cb-4a94-a1bd-83768539d31c',
          itemType: 'COMPONENT',
          readOnly: false,
          required: false,
          textResourceBindings: { title: 'ServiceName' },
        },
        {
          component: 'Input',
          dataModelBindings: {},
          id: 'd48096d4-7365-4392-b745-b7e4c8c933e6',
          itemType: 'COMPONENT',
          readOnly: false,
          required: false,
          textResourceBindings: { title: 'ServiceName' },
        },
      ],
    };
    const { ruleShouldRun } = checkIfRuleShouldRun(
      mockRuleConnectionState,
      mockFormDataState,
      mockFormDataModelState,
      mockFormLayoutState,
      mockRepeatingContainerId,
      mockLastUpdatedDataBinding,
    );
    expect(ruleShouldRun).toBe(false);
  });
});
