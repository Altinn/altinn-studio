import {
  ComponentBase,
  ISummaryOverridesCommon,
} from '@app/layout-contract/generated/common.generated';
import { CompCategory } from '@app/layout-contract';

export interface CompDividerExternal extends ComponentBase {
  type: 'Divider';
  dataModelBindings?: undefined;
  textResourceBindings?: undefined;
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

// Source hash: 5d2a7b7921d98bbae16ae33f2b870af1120667b6690030b624a2a8e2e32e6b22
