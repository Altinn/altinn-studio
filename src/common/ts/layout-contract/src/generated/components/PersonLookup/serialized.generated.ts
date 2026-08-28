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
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: IDataModelBindingsForPersonLookup;
} & ComponentBase &
  FormComponentProps &
  SummarizableComponentProps;

// Source hash: 429203383e9b2de73155c1c7c41ecd4aa242a307fde042487ea342d957184f1e
