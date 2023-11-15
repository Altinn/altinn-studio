export interface IRuleModelFieldElement {
  type: string;
  name: string;
  inputs: any;
}

export interface IFormRuleState {
  model: IRuleModelFieldElement[];
  error: Error | null;
}

export interface IFetchRuleModelFulfilled {
  ruleModel: IRuleModelFieldElement[];
  taskId?: string;
  layoutSetId?: string;
}

export interface IFetchRuleModelRejected {
  error: Error | null;
}
