export type IFormDynamics = {
  APIs: any;
  ruleConnection: IRuleConnections | null;
  conditionalRendering: IConditionalRenderingRules | null;
};

export type IFormDynamicState = IFormDynamics & {
  error: Error | null;
};

export interface IRuleConnection {
  inputParams: IParameters;
  outParams: {
    outParam0?: string;
  };
  selectedFunction: string;
}

export interface IRuleConnections {
  [id: string]: IRuleConnection;
}

export interface IFetchServiceConfigRejected {
  error: Error | null;
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
