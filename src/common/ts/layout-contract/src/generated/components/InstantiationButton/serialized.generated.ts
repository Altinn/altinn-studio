import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase, IQueryParameters } from '@app/layout-contract/generated/common.generated';

export type CompInstantiationButtonSerialized = {
  type: 'InstantiationButton';
  textResourceBindings?: { title?: ExprValToActualOrExpr<ExprVal.String> };
  queryParameters?: IQueryParameters;
  dataModelBindings?: undefined;
} & ComponentBase;

// Source hash: 86ea1a4efb8c36fc414e878b3ff727e58e9b9688082682f6244eb73a5f830e2b
