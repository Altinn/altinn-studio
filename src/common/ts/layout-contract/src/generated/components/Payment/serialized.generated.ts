import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase, TRBSummarizable } from '@app/layout-contract/generated/common.generated';

export type CompPaymentSerialized = {
  type: 'Payment';
  renderAsSummary?: boolean;
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    description?: ExprValToActualOrExpr<ExprVal.String>;
    help?: ExprValToActualOrExpr<ExprVal.String>;
  } & TRBSummarizable;
  dataModelBindings?: undefined;
} & ComponentBase;

// Source hash: f1a010215b9e6eba19f752b39e5ccbac9ed24dd830b3739110426b9715ebfd3f
