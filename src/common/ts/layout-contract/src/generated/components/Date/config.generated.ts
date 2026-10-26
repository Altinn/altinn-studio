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

export type DateSummaryOverridesWithRef =
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Date' } & ISummaryOverridesCommon);

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
  summaryOverrides: ISummaryOverridesCommon;
  summaryOverridesWithRef: DateSummaryOverridesWithRef;
};

// Source hash: 11fdf3fcb0d1ba07c87f14003e66e91cbb9c56974f83b39202cc1c9b62a7ee4f
