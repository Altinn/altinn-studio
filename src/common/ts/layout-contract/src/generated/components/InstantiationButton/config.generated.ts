import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase, IMapping } from '@app/layout-contract/generated/common.generated';

export interface CompInstantiationButtonExternal extends ComponentBase {
  type: 'InstantiationButton';
  textResourceBindings?: { title?: ExprValToActualOrExpr<ExprVal.String> };
  mapping?: IMapping;
  dataModelBindings?: undefined;
}

export const componentConfig = {
  category: CompCategory.Action,
  availability: 'configurable',
  capabilities: {
    renderInTable: true,
    renderInButtonGroup: true,
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
  layout: CompInstantiationButtonExternal;
  summaryOverrides: undefined;
  summaryOverridesWithRef: undefined;
};

// Source hash: 76c88f20d544eabe9ad309b8e58228ffe49a15fbe47a70ecbe64c33fb21f1f5b
