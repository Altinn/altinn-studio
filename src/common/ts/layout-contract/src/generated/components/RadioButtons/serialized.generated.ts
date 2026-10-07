import {
  ComponentBase,
  FormComponentProps,
  ISelectionComponentFull,
  LabeledComponentProps,
  LayoutStyle,
  ReadOnlyComponentProps,
  RequiredComponentProps,
  SummarizableComponentProps,
  TRBFormComp,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { IDataModelBindingsOptionsSimple } from '@app/layout-contract/generated/serialized-common.generated';

export type CompRadioButtonsSerialized = {
  type: 'RadioButtons';
  textResourceBindings?: TRBFormComp & TRBSummarizable & TRBLabel;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: IDataModelBindingsOptionsSimple;
  layout?: LayoutStyle;
  alertOnChange?: ExprValToActualOrExpr<ExprVal.Boolean>;
  showLabelsInTable?: boolean;
  showAsCard?: boolean;
} & ComponentBase &
  FormComponentProps &
  SummarizableComponentProps &
  ISelectionComponentFull &
  RequiredComponentProps &
  ReadOnlyComponentProps &
  LabeledComponentProps;

// Source hash: 5994fff10c14c49fc52c16e68f99e045e2a1d434d5d63af6d54ee00106e53b90
