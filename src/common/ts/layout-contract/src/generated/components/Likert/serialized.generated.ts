import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentProps,
  ILikertColumnProperties,
  ISelectionComponent,
  LabeledComponentProps,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { IDataModelBindingsLikert } from '@app/layout-contract/generated/serialized-common.generated';

export type ILikertFilter = { key: 'start' | 'stop'; value: string | number }[];

export type CompLikertSerialized = {
  type: 'Likert';
  renderAsSummary?: boolean;
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    description?: ExprValToActualOrExpr<ExprVal.String>;
    help?: ExprValToActualOrExpr<ExprVal.String>;
    leftColumnHeader?: ExprValToActualOrExpr<ExprVal.String>;
    questions?: ExprValToActualOrExpr<ExprVal.String>;
    questionDescriptions?: ExprValToActualOrExpr<ExprVal.String>;
    questionHelpTexts?: ExprValToActualOrExpr<ExprVal.String>;
  } & TRBSummarizable;
  required?: ExprValToActualOrExpr<ExprVal.Boolean>;
  readOnly?: ExprValToActualOrExpr<ExprVal.Boolean>;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: IDataModelBindingsLikert;
  filter?: ILikertFilter;
} & ComponentBase &
  ISelectionComponent &
  FormComponentProps &
  LabeledComponentProps &
  ILikertColumnProperties;

// Source hash: b28b03040987f54b1a81607f129c46ea54fdcd1f648b1a46612dc86f68532624
