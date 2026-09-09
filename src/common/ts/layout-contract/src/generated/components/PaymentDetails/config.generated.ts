import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase, IMapping } from '@app/layout-contract/generated/common.generated';

export interface CompPaymentDetailsExternal extends ComponentBase {
  type: 'PaymentDetails';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    description?: ExprValToActualOrExpr<ExprVal.String>;
    help?: ExprValToActualOrExpr<ExprVal.String>;
  };
  mapping?: IMapping;
  dataModelBindings?: undefined;
}

export const componentConfig = {
  category: CompCategory.Presentation,
  availability: 'configurable',
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: true,
    renderInAccordionGroup: false,
    renderInCards: true,
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
  layout: CompPaymentDetailsExternal;
  summaryOverrides: undefined;
  summaryOverridesWithRef: undefined;
};

// Source hash: 17d55f9d19ebe17f89a6ea1b82ac79b352b638874ca89be11f9fcc56aa47ffe8
