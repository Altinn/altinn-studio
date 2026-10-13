import {
  ComponentBase,
  FormComponentProps,
  LabeledComponentProps,
  TRBFormComp,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { IDataModelBindingsSimple } from '@app/layout-contract/generated/serialized-common.generated';

export type CompTimePickerSerialized = {
  type: 'TimePicker';
  textResourceBindings?: TRBFormComp & TRBSummarizable & TRBLabel;
  renderAsSummary?: boolean;
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
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
  LabeledComponentProps;

// Source hash: 15d37eb69acecdc0bbb631948379f323ad6a31eb08b27ddf88be887f802390e9
