import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentPropsWithRequired,
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
  dataModelBindings: { orgnr: IRawDataModelBinding; name?: IRawDataModelBinding };
} & ComponentBase &
  FormComponentPropsWithRequired &
  SummarizableComponentProps;

// Source hash: 68b90f8c5b4b5f24ddfc721c675521fcb03c2a77fd15eab5d2e766ca2ef1fb0a
