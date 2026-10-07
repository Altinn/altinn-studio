import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentProps,
  ILikertColumnProperties,
  ISelectionComponent,
  LabeledComponentProps,
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
  LabeledComponentProps &
  ILikertColumnProperties;

// Source hash: 337972442c3bebd3937c2437cf1f1ed50e0ef75e76886c40ef443ca00259a21a
