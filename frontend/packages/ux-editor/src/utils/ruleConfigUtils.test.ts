import { ConditionalRenderingConnection, RuleConnection } from 'app-shared/types/RuleConfig';
import {
  addConditionalRenderingConnection,
  addRuleConnection,
  deleteConditionalRenderingConnection,
  deleteRuleConnection,
  switchSelectedFieldId
} from './ruleConfigUtils';
import {
  conditionalRendering,
  conditionalRenderingConnection1,
  conditionalRenderingConnection1Id,
  conditionalRenderingConnection1SelectedField2Id,
  conditionalRenderingConnection1SelectedField2Value,
  conditionalRenderingConnection1SelectedFields,
  conditionalRenderingConnection2,
  conditionalRenderingConnection2Id,
  ruleConfig,
  ruleConnection,
  ruleConnection1,
  ruleConnection1Id,
  ruleConnection2,
  ruleConnection2Id
} from '../testing/ruleConfigMock';

describe('ruleConfigUtils', () => {
  test('addRuleConnection', () => {
    const newConnection: RuleConnection = {
      selectedFunction: 'selectedFunction3',
      inputParams: { inputParam1: 'inputParamValue' },
      outParams: { outParam1: 'outParamValue' }
    };
    const newId = 'id3';
    const newRuleConfig = addRuleConnection(ruleConfig, newId, newConnection);
    expect(newRuleConfig.ruleConnection[ruleConnection1Id]).toEqual(ruleConnection1);
    expect(newRuleConfig.ruleConnection[ruleConnection2Id]).toEqual(ruleConnection2);
    expect(newRuleConfig.ruleConnection[newId]).toEqual(newConnection);
    expect(newRuleConfig.conditionalRendering).toEqual(conditionalRendering);
  });

  test('deleteRuleConnection', () => {
    const newRuleConfig = deleteRuleConnection(ruleConfig, ruleConnection1Id);
    expect(newRuleConfig.ruleConnection[ruleConnection1Id]).toBeUndefined();
    expect(newRuleConfig.ruleConnection[ruleConnection2Id]).toEqual(ruleConnection2);
    expect(newRuleConfig.conditionalRendering).toEqual(conditionalRendering);
  });

  test('addConditionalRenderingConnection', () => {
    const newConnection: ConditionalRenderingConnection = {
      selectedFields: { selectedField1: 'selectedFieldValue' },
      selectedAction: 'selectedAction3',
      selectedFunction: 'selectedFunction3',
      inputParams: { inputParam1: 'inputParamValue' }
    };
    const newId = 'id3';
    const newRuleConfig = addConditionalRenderingConnection(ruleConfig, newId, newConnection); // eslint-disable-line testing-library/render-result-naming-convention
    expect(newRuleConfig.ruleConnection).toEqual(ruleConnection);
    expect(newRuleConfig.conditionalRendering[conditionalRenderingConnection1Id]).toEqual(conditionalRenderingConnection1);
    expect(newRuleConfig.conditionalRendering[conditionalRenderingConnection2Id]).toEqual(conditionalRenderingConnection2);
    expect(newRuleConfig.conditionalRendering[newId]).toEqual(newConnection);
  });

  test('deleteConditionalRenderingConnection', () => {
    const newRuleConfig = deleteConditionalRenderingConnection(ruleConfig, conditionalRenderingConnection1Id); // eslint-disable-line testing-library/render-result-naming-convention
    expect(newRuleConfig.ruleConnection).toEqual(ruleConnection);
    expect(newRuleConfig.conditionalRendering[conditionalRenderingConnection1Id]).toBeUndefined();
    expect(newRuleConfig.conditionalRendering[conditionalRenderingConnection2Id]).toEqual(conditionalRenderingConnection2);
  });

  describe('switchSelectedFieldId', () => {
    it('Does nothing if there is no selected field with the given id', () => {
      const callback = jest.fn();
      switchSelectedFieldId(ruleConfig, 'nonExistingId', 'newId', callback);
      expect(callback).not.toHaveBeenCalled();
    });

    it('Calls the callback function with the updated rule config when a selected field id is changed', () => {
      const callback = jest.fn();
      const newId = 'newId';
      switchSelectedFieldId(ruleConfig, conditionalRenderingConnection1SelectedField2Value, newId, callback);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({
        ruleConnection,
        conditionalRendering: {
          [conditionalRenderingConnection1Id]: {
            ...conditionalRenderingConnection1,
            selectedFields: {
              ...conditionalRenderingConnection1SelectedFields,
              [conditionalRenderingConnection1SelectedField2Id]: newId
            }
          },
          [conditionalRenderingConnection2Id]: conditionalRenderingConnection2
        }
      });
    });
  });
});
