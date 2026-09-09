import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase } from '@app/layout-contract/generated/common.generated';

export interface CompSummaryExternal extends ComponentBase {
  type: 'Summary';
  componentRef: string;
  largeGroup?: boolean;
  excludedChildren?: string[];
  textResourceBindings?: { returnToSummaryButtonTitle?: ExprValToActualOrExpr<ExprVal.String> };
  display?: SummaryDisplayProperties;
  dataModelBindings?: undefined;
}

export interface SummaryDisplayProperties {
  hideChangeButton?: boolean;
  hideValidationMessages?: boolean;
  useComponentGrid?: boolean;
  hideBottomBorder?: boolean;
  nextButton?: boolean;
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
  layout: CompSummaryExternal;
  summaryOverrides: undefined;
  summaryOverridesWithRef: undefined;
};

// Source hash: 51386ad7892d10d6f5269c0ff693c089b9c634505436480bfa1bd4b6b5884c31
