import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase } from '@app/layout-contract/generated/common.generated';

export type PanelVariant = 'info' | 'warning' | 'error' | 'success';

export type CompPanelSerialized = {
  type: 'Panel';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    body?: ExprValToActualOrExpr<ExprVal.String>;
  };
  variant?: PanelVariant;
  showIcon?: boolean;
  dataModelBindings?: undefined;
} & ComponentBase;

// Source hash: f60ce1d8b25e30dbf45ccfb89849b6125047b61537b819b6ec5cff03e62ad05a
