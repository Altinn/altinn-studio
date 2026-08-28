import {
  ComponentBase,
  ISummaryOverridesCommon,
  SummarizableComponentProps,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { CompCategory } from '@app/layout-contract';

export interface CompDividerExternal extends ComponentBase, SummarizableComponentProps {
  type: 'Divider';
  textResourceBindings?: TRBSummarizable;
  dataModelBindings?: undefined;
}

export type DividerSummaryOverridesWithRef =
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Divider' } & ISummaryOverridesCommon);

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
    isSummarizable: true,
    canHaveLabel: false,
    canHaveOptions: false,
    canHaveAttachments: false,
  },
} as const;

export type TypeConfig = {
  category: typeof componentConfig.category;
  availability: typeof componentConfig.availability;
  layout: CompDividerExternal;
  summaryOverrides: ISummaryOverridesCommon;
  summaryOverridesWithRef: DividerSummaryOverridesWithRef;
};

// Source hash: 4e74d528493ee5a8a40272f1d0d8908e983f7cce171649ad50f1a04d2ee9c441
