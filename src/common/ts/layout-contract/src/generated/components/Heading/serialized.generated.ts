import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase } from '@app/layout-contract/generated/common.generated';

export type CompHeadingSerialized = {
  type: 'Heading';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    help?: ExprValToActualOrExpr<ExprVal.String>;
  };
  size: 'L' | 'M' | 'S' | 'h2' | 'h3' | 'h4';
  dataModelBindings?: undefined;
} & ComponentBase;

// Source hash: a028292cea83e4d5eae9499c30bf35299d44f643211ba85eb64cd96e1c329349
