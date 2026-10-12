import {
  ComponentBase,
  FormComponentProps,
  LabeledComponentProps,
  SummarizableComponentProps,
  TRBFormComp,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { IDataModelBindingsSimple } from '@app/layout-contract/generated/serialized-common.generated';

export type CompTimePickerSerialized = {
  type: 'TimePicker';
  textResourceBindings?: TRBFormComp & TRBSummarizable & TRBLabel;
  required?: ExprValToActualOrExpr<ExprVal.Boolean>;
  readOnly?: ExprValToActualOrExpr<ExprVal.Boolean>;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: IDataModelBindingsSimple;
  autocomplete?: 'time';
  format?: 'HH:mm' | 'HH:mm:ss' | 'hh:mm a' | 'hh:mm:ss a';
  minTime?: ExprValToActualOrExpr<ExprVal.String> | string;
  maxTime?: ExprValToActualOrExpr<ExprVal.String> | string;
} & ComponentBase &
  FormComponentProps &
  SummarizableComponentProps &
  LabeledComponentProps;

// Source hash: 86049f27cdaa5aafaa1366594a3d6a427d0f67b14c7418beb1d03d8e1680eac2
