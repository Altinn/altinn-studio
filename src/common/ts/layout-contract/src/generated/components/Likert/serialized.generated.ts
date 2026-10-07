import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentProps,
  ILikertColumnProperties,
  ISelectionComponent,
  LabeledComponentProps,
  ReadOnlyComponentProps,
  RequiredComponentProps,
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
    help?: ExprValToActualOrExpr<ExprVal.String>;
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
  RequiredComponentProps &
  ReadOnlyComponentProps &
  LabeledComponentProps &
  ILikertColumnProperties;

// Source hash: 55aca886ff37007407c8d2a46fac0f96821d95175f3b4a4224d8fbc4cdf42429
