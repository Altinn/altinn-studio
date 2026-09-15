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
  dataModelBindings: { orgnr: IRawDataModelBinding; name?: IRawDataModelBinding };
} & ComponentBase &
  FormComponentProps &
  SummarizableComponentProps;

// Source hash: 4091d3191c5d5c0764bf84421f6bb2a08cb77a7d16d23591f0b91463d14c1344
