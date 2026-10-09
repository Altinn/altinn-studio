import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentProps,
  IRawDataModelBinding,
  LabeledComponentProps,
  SummarizableComponentProps,
  TRBFormComp,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export interface IDataModelBindingsForPersonLookup {
  ssn: IRawDataModelBinding;
  fullName?: IRawDataModelBinding;
  lastName?: IRawDataModelBinding;
  middleName?: IRawDataModelBinding;
  firstName?: IRawDataModelBinding;
}

export type CompPersonLookupSerialized = {
  type: 'PersonLookup';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    description?: ExprValToActualOrExpr<ExprVal.String>;
    help?: ExprValToActualOrExpr<ExprVal.String>;
  } & TRBFormComp &
    TRBSummarizable;
  required?: ExprValToActualOrExpr<ExprVal.Boolean>;
  readOnly?: ExprValToActualOrExpr<ExprVal.Boolean>;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: IDataModelBindingsForPersonLookup;
} & ComponentBase &
  FormComponentProps &
  SummarizableComponentProps &
  LabeledComponentProps;

// Source hash: ba6bceb964fde627b52254656e57b6aaf1a56a76942ecab068b0a2e1d6e6b3d8
