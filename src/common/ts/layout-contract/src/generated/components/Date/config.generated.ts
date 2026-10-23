import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  ISummaryOverridesCommon,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export interface CompDateExternal extends ComponentBase {
  type: 'Date';
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  textResourceBindings?: TRBSummarizable & TRBLabel;
  format?: string;
  value: ExprValToActualOrExpr<ExprVal.String>;
  direction?: 'horizontal' | 'vertical';
  icon?: string;
  dataModelBindings?: undefined;
}

export interface DateSummaryOverrides extends ISummaryOverridesCommon {
  emptyFieldText?: string;
}

export type DateSummaryOverridesWithRef =
  | ({ componentId: string } & DateSummaryOverrides)
  | ({ componentType: 'Date' } & DateSummaryOverrides);

export const componentConfig = {
  category: CompCategory.Presentation,
  availability: 'configurable',
  capabilities: {
    renderInTable: true,
    renderInButtonGroup: false,
    renderInAccordion: true,
    renderInAccordionGroup: false,
    renderInTabs: true,
    renderInCards: true,
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
  layout: CompDateExternal;
  summaryOverrides: DateSummaryOverrides;
  summaryOverridesWithRef: DateSummaryOverridesWithRef;
};

// Source hash: 3eb76340d45625b4f1b04a8575d423a7fd691c50b71432caaa8be6b8ff3fe3fa
