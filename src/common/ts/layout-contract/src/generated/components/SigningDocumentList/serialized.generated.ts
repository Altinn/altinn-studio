import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase } from '@app/layout-contract/generated/common.generated';

export type CompSigningDocumentListSerialized = {
  type: 'SigningDocumentList';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    description?: ExprValToActualOrExpr<ExprVal.String>;
    help?: ExprValToActualOrExpr<ExprVal.String>;
    summaryTitle?: ExprValToActualOrExpr<ExprVal.String>;
  };
  dataModelBindings?: undefined;
} & ComponentBase;

// Source hash: 9ab3816433b04c48f3d6c7bbdad8b04f3c1a81499f46719c05857cfed4ebd13c
