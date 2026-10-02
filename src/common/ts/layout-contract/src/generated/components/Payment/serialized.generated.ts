import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  SummarizableComponentProps,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export type CompPaymentSerialized = {
  type: 'Payment';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    description?: ExprValToActualOrExpr<ExprVal.String>;
    help?: ExprValToActualOrExpr<ExprVal.String>;
  } & TRBSummarizable;
  dataModelBindings?: undefined;
} & ComponentBase &
  SummarizableComponentProps;

// Source hash: 6238867c27935e3bf5197d0b1666bd668e0fe7a588ccda336d54a1e3f811e2b8
