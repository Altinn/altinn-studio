import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase, PageValidation } from '@app/layout-contract/generated/common.generated';

export type CompNavigationButtonsSerialized = {
  type: 'NavigationButtons';
  textResourceBindings?: {
    back?: ExprValToActualOrExpr<ExprVal.String>;
    next?: ExprValToActualOrExpr<ExprVal.String>;
    backToPage?: ExprValToActualOrExpr<ExprVal.String>;
  };
  showBackButton?: boolean;
  validateOnNext?: PageValidation;
  validateOnPrevious?: PageValidation;
  dataModelBindings?: undefined;
} & ComponentBase;

// Source hash: a0e3dceacf5b4a6319f3227b9de9eb91a803245b4430fd3e1d076f2680454b7e
