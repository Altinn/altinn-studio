import {
  ComponentBase,
  SummarizableComponentProps,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { CompCategory } from '@app/layout-contract';

export interface CardConfig {
  media?: string;
  title?: string;
  description?: string;
  footer?: string;
  children?: string[];
}

export type CardsColor = 'neutral' | 'subtle';

export type CardsMediaPosition = 'top' | 'bottom';

export interface CompCardsExternal extends ComponentBase, SummarizableComponentProps {
  type: 'Cards';
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

// Source hash: 349a9299fc1f1b4d8f9bc843618c53204e1077702b6e7c44b1824173284f6ea8
