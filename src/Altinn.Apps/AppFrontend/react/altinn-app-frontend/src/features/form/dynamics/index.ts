import { IConditionalRenderingRules } from './types';

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
