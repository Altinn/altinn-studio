import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase, IMapping } from '@app/layout-contract/generated/common.generated';

export type CompPaymentDetailsSerialized = {
  type: 'PaymentDetails';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    description?: ExprValToActualOrExpr<ExprVal.String>;
  };
  mapping?: IMapping;
  dataModelBindings?: undefined;
} & ComponentBase;

// Source hash: e3c03b502788969912cbb8174f69373849bd5ddb7a776082606b5912f194ca57
