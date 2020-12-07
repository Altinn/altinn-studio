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
}

export interface IParameters {
  [id: string]: string;
}

export interface ISelectedFields {
  [id: string]: string;
}
