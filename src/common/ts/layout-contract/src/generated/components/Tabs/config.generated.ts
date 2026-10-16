import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  ISummaryOverridesCommon,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export interface CompTabsExternal extends ComponentBase {
  type: 'Tabs';
  renderAsSummary?: boolean;
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
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

// Source hash: a7b46e5903e19f89d1d26d74374044e9ff343b396d9054af32e5e182b3344590
