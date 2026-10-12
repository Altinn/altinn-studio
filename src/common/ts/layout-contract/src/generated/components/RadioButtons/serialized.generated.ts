import {
  ComponentBase,
  FormComponentProps,
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
  required?: ExprValToActualOrExpr<ExprVal.Boolean>;
  readOnly?: ExprValToActualOrExpr<ExprVal.Boolean>;
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
  LabeledComponentProps;

// Source hash: 99f10521cd9d8c593284685f52b2098705953c583dd9e1daa278589695e3c6b8
