import type {
  ConditionalRenderingConnection,
  ConditionalRenderingConnections,
  RuleConfig,
  RuleConnection,
  RuleConnections,
} from 'app-shared/types/RuleConfig';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { component1IdMock, container1IdMock } from './layoutMock';

export const ruleConnection1Id = 'id1';
export const ruleConnection1: RuleConnection = {
  selectedFunction: 'selectedFunction1',
  inputParams: { inputParam1: 'inputParamValue' },
  outParams: { outParam1: 'outParamValue' },
};

export const ruleConnection2Id = 'id2';
export const ruleConnection2: RuleConnection = {
  selectedFunction: 'selectedFunction2',
  inputParams: { inputParam1: 'inputParamValue' },
  outParams: { outParam1: 'outParamValue' },
};

export const ruleConnection: RuleConnections = {
  [ruleConnection1Id]: ruleConnection1,
  [ruleConnection2Id]: ruleConnection2,
};

export const conditionalRenderingConnection1Id = 'id1';
export const conditionalRenderingConnection1SelectedField1Id = 'selectedField1';
export const conditionalRenderingConnection1SelectedField2Id = 'selectedField2';
export const conditionalRenderingConnection1SelectedField1Value = container1IdMock;
export const conditionalRenderingConnection1SelectedField2Value = component1IdMock;
export const conditionalRenderingConnection1SelectedFields: KeyValuePairs<string> = {
  [conditionalRenderingConnection1SelectedField1Id]:
    conditionalRenderingConnection1SelectedField1Value,
  [conditionalRenderingConnection1SelectedField2Id]:
    conditionalRenderingConnection1SelectedField2Value,
};

export const conditionalRenderingConnection1: ConditionalRenderingConnection = {
  selectedFields: conditionalRenderingConnection1SelectedFields,
  selectedAction: 'selectedAction1',
  selectedFunction: 'selectedFunction1',
  inputParams: { inputParam1: 'inputParamValue' },
};

export const conditionalRenderingConnection2Id = 'id2';
export const conditionalRenderingConnection2: ConditionalRenderingConnection = {
  selectedFields: { selectedField1: 'selectedFieldValue' },
  selectedAction: 'selectedAction2',
  selectedFunction: 'selectedFunction2',
  inputParams: { inputParam1: 'inputParamValue' },
};

export const conditionalRendering: ConditionalRenderingConnections = {
  [conditionalRenderingConnection1Id]: conditionalRenderingConnection1,
  [conditionalRenderingConnection2Id]: conditionalRenderingConnection2,
};

export const ruleConfig: RuleConfig = { data: { ruleConnection, conditionalRendering } };
