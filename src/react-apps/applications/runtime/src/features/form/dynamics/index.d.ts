import { IConditionalRenderingRules } from "./types";

export interface IFormDynamicState {
  apis: any;
  ruleConnection: IRuleConnections;
  conditionalRendering: IConditionalRenderingRules;
  error: Error;
}

export interface IRuleConnection {
  inputParams: Object;
  outParams: {
    outParam0?: string
  };
  selectedFunction: string;
}

export interface IRuleConnections {
  [id: string]: IRuleConnection;
}
