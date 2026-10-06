import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentProps,
  IRawDataModelBinding,
  LabeledComponentProps,
  SummarizableComponentProps,
  TRBFormComp,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export interface IDataModelBindingsForCustom {
  [key: string]: IRawDataModelBinding;
}

export type CompCustomSerialized = {
  type: 'Custom';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    [key: string]: ExprValToActualOrExpr<ExprVal.String> | undefined;
  } & TRBFormComp &
    TRBSummarizable;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings?: IDataModelBindingsForCustom;
  tagName: string;
  [key: string]: unknown;
} & ComponentBase &
  FormComponentProps &
  SummarizableComponentProps &
  LabeledComponentProps;

// Source hash: a0fd17f966547e57c0a36fa2c555512248801127f3ec1366f25a78d6fc7f7786
