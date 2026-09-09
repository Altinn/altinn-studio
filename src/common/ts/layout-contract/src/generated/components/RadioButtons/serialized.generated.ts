import {
  ComponentBase,
  FormComponentPropsWithRequired,
  ISelectionComponentFull,
  LabeledComponentProps,
  LayoutStyle,
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
  FormComponentPropsWithRequired &
  SummarizableComponentProps &
  ISelectionComponentFull &
  LabeledComponentProps;

// Source hash: 711f44960becfbcf17a0cd2dc9d514821d38a41009bedf1e2f20632a623d3b9d
