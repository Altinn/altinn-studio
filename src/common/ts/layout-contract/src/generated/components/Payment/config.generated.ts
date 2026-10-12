import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  ISummaryOverridesCommon,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export interface CompPaymentExternal extends ComponentBase {
  type: 'Payment';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    description?: ExprValToActualOrExpr<ExprVal.String>;
    help?: ExprValToActualOrExpr<ExprVal.String>;
  } & TRBSummarizable;
  dataModelBindings?: undefined;
}

export type PaymentSummaryOverridesWithRef =
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Payment' } & ISummaryOverridesCommon);

export const componentConfig = {
  category: CompCategory.Presentation,
  availability: 'configurable',
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: false,
    renderInAccordionGroup: false,
    renderInCards: false,
    renderInCardsMedia: false,
    renderInTabs: false,
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
  layout: CompPaymentExternal;
  summaryOverrides: ISummaryOverridesCommon;
  summaryOverridesWithRef: PaymentSummaryOverridesWithRef;
};

// Source hash: 89496cd202cbeec237d2f8183d40229f4ccd8d1cf78150fa760be6bf4fad41dd
