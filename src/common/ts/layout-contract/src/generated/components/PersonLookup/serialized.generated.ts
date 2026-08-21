import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentProps,
  IRawDataModelBinding,
  SummarizableComponentProps,
  TRBFormComp,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export interface IDataModelBindingsForPersonLookup {
  person_lookup_ssn: IRawDataModelBinding;
  person_lookup_name?: IRawDataModelBinding;
  person_lookup_last_name?: IRawDataModelBinding;
  person_lookup_middle_name?: IRawDataModelBinding;
  person_lookup_first_name?: IRawDataModelBinding;
}

export type CompPersonLookupSerialized = {
  type: 'PersonLookup';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    description?: ExprValToActualOrExpr<ExprVal.String>;
    help?: ExprValToActualOrExpr<ExprVal.String>;
  } & TRBFormComp &
    TRBSummarizable;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: IDataModelBindingsForPersonLookup;
} & ComponentBase &
  FormComponentProps &
  SummarizableComponentProps;

// Source hash: 4055f82b6c4b3db61454cdb7c32586b4fa3a31ffeb56f65ef20cec09ed47ea59
