import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase, IButtonProps } from '@app/layout-contract/generated/common.generated';

export type CompButtonSerialized = {
  type: 'Button';
  textResourceBindings?: { title?: ExprValToActualOrExpr<ExprVal.String> };
  dataModelBindings?: undefined;
} & ComponentBase &
  IButtonProps;

// Source hash: d1e6f5ab5be5cc02f22b48e3b2fc97e89bfff22fce4f6738407750fd2dfa083c
