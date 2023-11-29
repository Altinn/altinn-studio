export interface IRuleModelFieldElement {
  type: string;
  name: string;
  inputs: any;
}

export interface IFormRuleState {
  model: IRuleModelFieldElement[];
}

export interface IFetchRuleModelFulfilled {
  ruleModel: IRuleModelFieldElement[];
  taskId?: string;
  layoutSetId?: string;
}
