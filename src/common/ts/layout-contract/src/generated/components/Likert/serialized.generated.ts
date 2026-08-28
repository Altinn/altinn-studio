import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentProps,
  ILikertColumnProperties,
  ISelectionComponent,
  SummarizableComponentProps,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { IDataModelBindingsLikert } from '@app/layout-contract/generated/serialized-common.generated';

export type ILikertFilter = { key: 'start' | 'stop'; value: string | number }[];

export type CompLikertSerialized = {
  type: 'Likert';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    description?: ExprValToActualOrExpr<ExprVal.String>;
    leftColumnHeader?: ExprValToActualOrExpr<ExprVal.String>;
    questions?: ExprValToActualOrExpr<ExprVal.String>;
    questionDescriptions?: ExprValToActualOrExpr<ExprVal.String>;
    questionHelpTexts?: ExprValToActualOrExpr<ExprVal.String>;
  } & TRBSummarizable;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: IDataModelBindingsLikert;
  filter?: ILikertFilter;
} & ComponentBase &
  SummarizableComponentProps &
  ISelectionComponent &
  FormComponentProps &
  ILikertColumnProperties;

// Source hash: 07d0a194171f21cc5ef02878df69bb328010cce9e72210942ed9e1e073c4ab52
