import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentProps,
  IRawDataModelBinding,
  LabeledComponentProps,
  SummarizableComponentProps,
  TRBFormComp,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export interface CustomReactOptions {
  [key: string]: unknown;
}

export interface IDataModelBindingsForCustomReact {
  [key: string]: IRawDataModelBinding;
}

export type CompCustomReactSerialized = {
  type: 'CustomReact';
  textResourceBindings?: { [key: string]: ExprValToActualOrExpr<ExprVal.String> } & TRBFormComp &
    TRBSummarizable &
    TRBLabel;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings?: IDataModelBindingsForCustomReact;
  componentName: string;
  options?: CustomReactOptions;
} & ComponentBase &
  FormComponentProps &
  SummarizableComponentProps &
  LabeledComponentProps;

// Source hash: 95a6226d84da0f06ec10f059cb9b286abd91604ac9895fef6915cb46b1af06e8
