import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase, TRBSummarizable } from '@app/layout-contract/generated/common.generated';

export type CompPaymentSerialized = {
  type: 'Payment';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    description?: ExprValToActualOrExpr<ExprVal.String>;
    help?: ExprValToActualOrExpr<ExprVal.String>;
  } & TRBSummarizable;
  dataModelBindings?: undefined;
} & ComponentBase;

// Source hash: 92396a0c18ab7c5dd545a88c3563022b5e15a66583e634d28bea802cd5a95a07
