import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase } from '@app/layout-contract/generated/common.generated';

export type CompPrintButtonSerialized = {
  type: 'PrintButton';
  textResourceBindings?: { title?: ExprValToActualOrExpr<ExprVal.String> };
  dataModelBindings?: undefined;
} & ComponentBase;

// Source hash: 295560ae1e95ecaf6a6fdddade989132f729cc72768368741702458222d96eb5
