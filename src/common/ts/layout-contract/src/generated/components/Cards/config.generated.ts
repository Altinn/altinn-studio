import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase, TRBSummarizable } from '@app/layout-contract/generated/common.generated';

export interface CardConfig {
  media?: string;
  title?: string;
  description?: string;
  footer?: string;
  children?: string[];
}

export type CardsColor = 'neutral' | 'subtle';

export type CardsMediaPosition = 'top' | 'bottom';

export interface CompCardsExternal extends ComponentBase {
  type: 'Cards';
  renderAsSummary?: boolean;
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  textResourceBindings?: TRBSummarizable;
  mediaPosition?: CardsMediaPosition;
  minMediaHeight?: string;
  minWidth?: string;
  color: CardsColor;
  cards: CardConfig[];
  dataModelBindings?: undefined;
}

export const componentConfig = {
  category: CompCategory.Container,
  availability: 'configurable',
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: true,
    renderInAccordionGroup: false,
    renderInCardsMedia: false,
    renderInCards: false,
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
  layout: CompCardsExternal;
  summaryOverrides: undefined;
  summaryOverridesWithRef: undefined;
};

// Source hash: 29bae1866a45c0da9c5bc1396fa4f0fb57ab263e479232bf9f6622e11260c008
