import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

export interface RuleConfig {
  data: RuleConfigData;
}

export interface RuleConfigData {
  ruleConnection: RuleConnections;
  conditionalRendering: ConditionalRenderingConnections;
}

export type RuleConnections = KeyValuePairs<RuleConnection>;

export interface RuleConnection {
  selectedFunction: string;
  inputParams: KeyValuePairs<string>;
  outParams: KeyValuePairs<string>;
}

export type ConditionalRenderingConnections = KeyValuePairs<ConditionalRenderingConnection>;

export interface ConditionalRenderingConnection {
  selectedFields: KeyValuePairs<string>;
  selectedAction: string;
  selectedFunction: string;
  inputParams: KeyValuePairs<string>;
}
