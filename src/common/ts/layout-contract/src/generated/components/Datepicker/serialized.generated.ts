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

export type CompDatepickerSerialized = {
  type: 'Datepicker';
  textResourceBindings?: TRBFormComp & TRBSummarizable & TRBLabel;
  renderAsSummary?: boolean;
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  required?: ExprValToActualOrExpr<ExprVal.Boolean>;
  readOnly?: ExprValToActualOrExpr<ExprVal.Boolean>;
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
  LabeledComponentProps;

// Source hash: 284792b8fca622c6b402da38867b528de7effe543fa2e420eb50a86553b6952e
