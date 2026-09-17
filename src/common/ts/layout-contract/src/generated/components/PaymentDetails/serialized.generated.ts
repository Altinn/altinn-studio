import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase, IQueryParameters } from '@app/layout-contract/generated/common.generated';

export type CompPaymentDetailsSerialized = {
  type: 'PaymentDetails';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    description?: ExprValToActualOrExpr<ExprVal.String>;
    help?: ExprValToActualOrExpr<ExprVal.String>;
  };
  refetchDependencies?: IQueryParameters;
  dataModelBindings?: undefined;
} & ComponentBase;

// Source hash: de42d0f72b920fb55184626650f876dd95f9b46d12bcd4d864e5c2828747fc72
