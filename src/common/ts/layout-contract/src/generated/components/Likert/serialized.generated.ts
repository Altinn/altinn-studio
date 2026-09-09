import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentPropsWithRequired,
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
  FormComponentPropsWithRequired &
  ILikertColumnProperties;

// Source hash: 716e7eab0f8f0b45aec2627c47d15df2e18a1c9a2840471e54e8e6a388b09287
