import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentPropsWithRequired,
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
  FormComponentPropsWithRequired &
  SummarizableComponentProps;

// Source hash: 0c32ea23c0bb8bc067e63d93dc8101009ce33eb6bfe72376cc8758a5e461b910
