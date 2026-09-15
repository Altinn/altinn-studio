import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  IButtonProps,
  IMapping,
} from '@app/layout-contract/generated/common.generated';

export type ButtonMode = 'submit' | 'save' | 'instantiate';

export type CompButtonSerialized = {
  type: 'Button';
  textResourceBindings?: { title?: ExprValToActualOrExpr<ExprVal.String> };
  mode?: ButtonMode;
  mapping?: IMapping;
  dataModelBindings?: undefined;
} & ComponentBase &
  IButtonProps;

// Source hash: f24f614fb54a175a36636c1a98f02d5dbda24811e2e0e472b931a855688b4b9d
