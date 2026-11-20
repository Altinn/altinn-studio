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
  validateOnBackToSummary?: PageValidation;
  validateOnPrevious?: PageValidation;
  dataModelBindings?: undefined;
} & ComponentBase;

// Source hash: 98dbeb0e9d18e37b4ee30a28e59a2c2b9243a71cde58da66c0a099bdfec4320e
