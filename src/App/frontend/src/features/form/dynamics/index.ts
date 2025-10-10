export type IFormDynamics = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  APIs: any;
  ruleConnection: IRuleConnections | null;
  conditionalRendering: IConditionalRenderingRules | null;
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

export interface IConditionalRenderingRules {
  [id: string]: IConditionalRenderingRule;
}

export interface IConditionalRenderingRule {
  selectedFunction: string;
  selectedAction: 'Show' | 'Hide';
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
