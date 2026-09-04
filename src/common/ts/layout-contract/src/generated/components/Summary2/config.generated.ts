import { AnySummaryOverride, ComponentBase } from '@app/layout-contract/generated/common.generated';
import { CompCategory } from '@app/layout-contract';

export interface CompSummary2External extends ComponentBase {
  type: 'Summary2';
  target?: SummaryTargetPage | SummaryTargetLayoutSet | SummaryTargetComponent;
  showPageInAccordion?: boolean;
  isCompact?: boolean;
  hideEmptyFields?: boolean;
  overrides?: (AnySummaryOverride | SummaryOverrideForPage)[];
  dataModelBindings?: undefined;
  textResourceBindings?: undefined;
}

export interface SummaryOverrideForPage {
  pageId: string;
  hidden?: boolean;
}

export interface SummaryTargetComponent {
  type?: 'component';
  id: string;
  taskId?: string;
}

export interface SummaryTargetLayoutSet {
  type: 'layoutSet';
  taskId?: string;
}

export interface SummaryTargetPage {
  type: 'page';
  id: string;
  taskId?: string;
}

export const componentConfig = {
  category: CompCategory.Presentation,
  availability: 'configurable',
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: false,
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
  layout: CompSummary2External;
  summaryOverrides: undefined;
  summaryOverridesWithRef: undefined;
};

// Source hash: a1d2a807db6592f0eb82eada4b6f4411efbd0fd8830748322eb4ba7f0ed6da33
