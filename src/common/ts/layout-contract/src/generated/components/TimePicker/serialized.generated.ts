import {
  ComponentBase,
  FormComponentProps,
  LabeledComponentProps,
  ReadOnlyComponentProps,
  RequiredComponentProps,
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
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: IDataModelBindingsSimple;
  autocomplete?: 'time';
  format?: 'HH:mm' | 'HH:mm:ss' | 'hh:mm a' | 'hh:mm:ss a';
  minTime?: ExprValToActualOrExpr<ExprVal.String> | string;
  maxTime?: ExprValToActualOrExpr<ExprVal.String> | string;
} & ComponentBase &
  FormComponentProps &
  SummarizableComponentProps &
  RequiredComponentProps &
  ReadOnlyComponentProps &
  LabeledComponentProps;

// Source hash: ff68885581e5049d62ffc2e50655b715387b736612d5c4c8a46b22501e66641e
