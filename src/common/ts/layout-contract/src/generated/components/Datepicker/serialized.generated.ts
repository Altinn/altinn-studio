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

export type CompDatepickerSerialized = {
  type: 'Datepicker';
  textResourceBindings?: TRBFormComp & TRBSummarizable & TRBLabel;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: IDataModelBindingsSimple;
  autocomplete?: 'bday';
  minDate?:
    | ExprValToActualOrExpr<ExprVal.String>
    | 'today'
    | 'yesterday'
    | 'tomorrow'
    | 'oneYearAgo'
    | 'oneYearFromNow';
  maxDate?:
    | ExprValToActualOrExpr<ExprVal.String>
    | 'today'
    | 'yesterday'
    | 'tomorrow'
    | 'oneYearAgo'
    | 'oneYearFromNow';
  timeStamp?: boolean;
  format?: string;
} & ComponentBase &
  FormComponentProps &
  SummarizableComponentProps &
  RequiredComponentProps &
  ReadOnlyComponentProps &
  LabeledComponentProps;

// Source hash: fffd2e896e2ca5aa384af7c781fff0781cec15d06cbaa6e2325d269424d6e87f
