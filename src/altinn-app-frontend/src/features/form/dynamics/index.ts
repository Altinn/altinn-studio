export interface IFormDynamicState {
  apis: any;
  ruleConnection: IRuleConnections;
  conditionalRendering: IConditionalRenderingRules;
  error: Error;
}

export interface IRuleConnection {
  // eslint-disable-next-line @typescript-eslint/ban-types
  inputParams: Object;
  outParams: {
    outParam0?: string;
  };
  selectedFunction: string;
}

export interface IRuleConnections {
  [id: string]: IRuleConnection;
}

export interface ICheckIfConditionalRulesShouldRun {
  repeatingContainerId?: string;
}

export interface IFetchServiceConfigFulfilled {
  apis: any;
  ruleConnection: any;
  conditionalRendering: any;
}

export interface IFetchServiceConfigRejected {
  error: Error;
}

export interface IConditionalRenderingRules {
  [id: string]: IConditionalRenderingRule;
}

export interface IConditionalRenderingRule {
  selectedFunction: string;
  selectedAction: string;
  selectedFields: ISelectedFields;
  inputParams: IParameters;
  repeatingGroup?: IConditionalRenderingRepeatingGroup;
}

export interface IConditionalRenderingRepeatingGroup {
  groupId: string;
  childGroupId?: string;
}

export interface IParameters {
  [id: string]: string;
}

export interface ISelectedFields {
  [id: string]: string;
}
