import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase, PageValidation } from '@app/layout-contract/generated/common.generated';

export interface CompNavigationButtonsExternal extends ComponentBase {
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
}

export const componentConfig = {
  category: CompCategory.Action,
  availability: 'configurable',
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: true,
    renderInAccordion: false,
    renderInAccordionGroup: false,
    renderInCards: false,
    renderInCardsMedia: false,
    renderInTabs: true,
  },
  behaviors: {
    isSummarizable: false,
    canHaveLabel: false,
    canHaveOptions: false,
    canHaveAttachments: false,
  },
} as const;

export type TypeConfig = {
  category: typeof componentConfig.category;
  availability: typeof componentConfig.availability;
  layout: CompNavigationButtonsExternal;
  summaryOverrides: undefined;
  summaryOverridesWithRef: undefined;
};

// Source hash: 8e3923799e9e1a95aad8976c4be4d328236712c17907945bd7f2ade061f4fc57
