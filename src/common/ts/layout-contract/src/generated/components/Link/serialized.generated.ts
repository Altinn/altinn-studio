import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase, IButtonProps } from '@app/layout-contract/generated/common.generated';

export type LinkStyle = 'primary' | 'secondary' | 'link';

export type CompLinkSerialized = {
  type: 'Link';
  textResourceBindings?: {
    target?: ExprValToActualOrExpr<ExprVal.String>;
    title?: ExprValToActualOrExpr<ExprVal.String>;
    download?: ExprValToActualOrExpr<ExprVal.String>;
  };
  style: LinkStyle;
  openInNewTab?: boolean;
  dataModelBindings?: undefined;
} & ComponentBase &
  IButtonProps;

// Source hash: 907f41f88dda77bfb27948d457bf1850e4cd009d440da9ff22458694373856d6
