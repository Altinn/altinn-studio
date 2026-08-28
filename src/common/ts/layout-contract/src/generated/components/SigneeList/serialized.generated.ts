import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase } from '@app/layout-contract/generated/common.generated';

export type CompSigneeListSerialized = {
  type: 'SigneeList';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    description?: ExprValToActualOrExpr<ExprVal.String>;
    help?: ExprValToActualOrExpr<ExprVal.String>;
    summaryTitle?: ExprValToActualOrExpr<ExprVal.String>;
  };
  dataModelBindings?: undefined;
} & ComponentBase;

// Source hash: 4008c5a88f6b1378095e6b738b308ca0022b17a94549796e8baf8d7e20402719
