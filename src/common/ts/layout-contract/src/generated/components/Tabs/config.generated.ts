import {
  ComponentBase,
  ISummaryOverridesCommon,
  SummarizableComponentProps,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { CompCategory } from '@app/layout-contract';

export interface CompTabsExternal extends ComponentBase, SummarizableComponentProps {
  type: 'Tabs';
  textResourceBindings?: TRBSummarizable;
  size?: 'small' | 'medium' | 'large';
  defaultTab?: string;
  tabs: TabConfig[];
  dataModelBindings?: undefined;
}

export interface TabConfig {
  id: string;
  title: string;
  icon?: string;
  children: string[];
}

export type TabsSummaryOverridesWithRef =
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Tabs' } & ISummaryOverridesCommon);

export const componentConfig = {
  category: CompCategory.Container,
  availability: 'configurable',
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: false,
    renderInAccordionGroup: false,
    renderInTabs: false,
    renderInCards: false,
    renderInCardsMedia: false,
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
  layout: CompTabsExternal;
  summaryOverrides: ISummaryOverridesCommon;
  summaryOverridesWithRef: TabsSummaryOverridesWithRef;
};

// Source hash: 6952e037193f9c3ebe743fabd2cf77c460363b2ffa45a86e84fa94ba32769a0d
