import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  IQueryParameters,
  ISummaryOverridesCommon,
} from '@app/layout-contract/generated/common.generated';

export interface CompPaymentDetailsExternal extends ComponentBase {
  type: 'PaymentDetails';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    description?: ExprValToActualOrExpr<ExprVal.String>;
    help?: ExprValToActualOrExpr<ExprVal.String>;
  };
  refetchDependencies?: IQueryParameters;
  dataModelBindings?: undefined;
}

export type PaymentDetailsSummaryOverridesWithRef =
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'PaymentDetails' } & ISummaryOverridesCommon);

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
  layout: CompPaymentDetailsExternal;
  summaryOverrides: ISummaryOverridesCommon;
  summaryOverridesWithRef: PaymentDetailsSummaryOverridesWithRef;
};

// Source hash: a9b76a3a30bbdbac3f57f78e2d7eabfc2150cb47183ba7e34e197c9af842632e
