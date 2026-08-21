import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentProps,
  IRawDataModelBinding,
  SummarizableComponentProps,
  TRBFormComp,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export type CompOrganizationLookupSerialized = {
  type: 'OrganizationLookup';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    description?: ExprValToActualOrExpr<ExprVal.String>;
    help?: ExprValToActualOrExpr<ExprVal.String>;
  } & TRBFormComp &
    TRBSummarizable;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: {
    organization_lookup_orgnr: IRawDataModelBinding;
    organization_lookup_name?: IRawDataModelBinding;
  };
} & ComponentBase &
  FormComponentProps &
  SummarizableComponentProps;

// Source hash: cb8ab4ca8f4d7b8b8fd1f6624eba347cd96188c3f9af84207ccb94a76a2a1277
