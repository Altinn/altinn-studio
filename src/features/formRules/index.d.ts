export interface IRuleModelFieldElement {
  type: string;
  name: string;
  inputs: any;
}

export interface IFormRuleState {
  model: IRuleModelFieldElement[];
  fetching: boolean;
  fetched: boolean;
  error: Error | null;
}

export interface IFetchRuleModelFulfilled {
  ruleModel: IRuleModelFieldElement[];
}

export interface IFetchRuleModelRejected {
  error: Error;
}
