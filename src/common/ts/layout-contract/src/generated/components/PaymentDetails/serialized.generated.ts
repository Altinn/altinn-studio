import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase, IQueryParameters } from '@app/layout-contract/generated/common.generated';

export type CompPaymentDetailsSerialized = {
  type: 'PaymentDetails';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    description?: ExprValToActualOrExpr<ExprVal.String>;
    help?: ExprValToActualOrExpr<ExprVal.String>;
  };
  queryParameters?: IQueryParameters;
  dataModelBindings?: undefined;
} & ComponentBase;

// Source hash: 3f34d8e330ee30863f1ee8ee3dd02d4b105c7a81ba2bb135f37b95f6271a44a0
