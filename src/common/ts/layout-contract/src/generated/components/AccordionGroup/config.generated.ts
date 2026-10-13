import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase, TRBSummarizable } from '@app/layout-contract/generated/common.generated';

export interface CompAccordionGroupExternal extends ComponentBase {
  type: 'AccordionGroup';
  renderAsSummary?: boolean;
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  textResourceBindings?: { title?: ExprValToActualOrExpr<ExprVal.String> } & TRBSummarizable;
  children: string[];
  dataModelBindings?: undefined;
}

export const componentConfig = {
  category: CompCategory.Container,
  availability: 'configurable',
  capabilities: {
    renderInTable: true,
    renderInButtonGroup: false,
    renderInAccordion: false,
    renderInAccordionGroup: false,
    renderInCards: true,
    renderInCardsMedia: false,
    renderInTabs: true,
  },
  behaviors: {
    isSummarizable: true,
    canHaveLabel: false,
    canHaveOptions: false,
    canHaveAttachments: false,
  },
} as const;

export type TypeConfig = {
  category: typeof componentConfig.category;
  availability: typeof componentConfig.availability;
  layout: CompAccordionGroupExternal;
  summaryOverrides: undefined;
  summaryOverridesWithRef: undefined;
};

// Source hash: 27db92d4a7e57a50b43eb3951b9e077bc64da2d0d9f9ef2a0eedde43aba8a349
