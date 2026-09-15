import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase, IMapping } from '@app/layout-contract/generated/common.generated';

export type CompPaymentDetailsSerialized = {
  type: 'PaymentDetails';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    description?: ExprValToActualOrExpr<ExprVal.String>;
    help?: ExprValToActualOrExpr<ExprVal.String>;
  };
  mapping?: IMapping;
  dataModelBindings?: undefined;
} & ComponentBase;

// Source hash: f5d2a8ec42e44eebc45ffcd58811f2bf4cf6d6d323a3f7ddf495b3556d3f36aa
