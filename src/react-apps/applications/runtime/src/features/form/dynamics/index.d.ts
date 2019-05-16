export interface IFormDynamicState {
  apis: any;
  ruleConnection: <T>() => IRuleConnection;
  conditionalRendering: any;
  error: Error;
}

export interface IRuleConnection {
  inputParams: Object;
  outParams: Object;
  selectedFunction: string;
}
