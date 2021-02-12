export interface IServiceConfigurationState {
  ruleConnection: IRuleConnectionState;
  conditionalRendering: IConditionalRenderingState;
  manageServiceConfiguration: IManageServiceConfigurationState;
  [key: string]: any;
}

export interface IConditionalRenderingState {
  [key: string]: IConditionalRendering;
}

export interface IConditionalRendering {
  selectedFields: ISelectedFields;
  selectedAction: string;
  selectedFunction: string;
  inputParams: IInputParams;
}

export interface IAddConditionalRendering {
  newConnection: any;
}

export interface ISetConditionalRendering {
  conditionalRenderingConnections: IConditionalRenderingState;
}

export interface ISelectedFields {
  [key: string]: string;
}

export interface IInputParams {
  [key: string]: string;
}
export interface IManageServiceConfigurationState {
  fetching: boolean;
  fetched: boolean;
  error: Error;
  saving: boolean;
  saved: boolean;
}

export interface IRuleConnectionState {
  [key: string]: IRuleConnection;
}

export interface IRuleConnection {
  selectedFunction: string;
  inputParams: IRuleParams;
  outParams: IRuleParams;
}

export interface IRuleParams {
  [key: string]: string;
}

export interface IAddRuleConnection {
  newConnection: any;
}

export interface ISetRuleConnection {
  ruleConnections: IRuleConnectionState;
}
