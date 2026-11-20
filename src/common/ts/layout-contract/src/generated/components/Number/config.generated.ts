import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  IFormatting,
  ISummaryOverridesCommon,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export interface CompNumberExternal extends ComponentBase {
  type: 'Number';
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  textResourceBindings?: TRBSummarizable & TRBLabel;
  formatting?: IFormatting;
  value: ExprValToActualOrExpr<ExprVal.Number>;
  direction?: 'horizontal' | 'vertical';
  icon?: string;
  dataModelBindings?: undefined;
}

export type NumberSummaryOverridesWithRef =
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Number' } & ISummaryOverridesCommon);

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
  layout: CompNumberExternal;
  summaryOverrides: ISummaryOverridesCommon;
  summaryOverridesWithRef: NumberSummaryOverridesWithRef;
};

// Source hash: 38fb3c5a02116c0d43b72f514d27cf39a47c19e18609430c25cefb8e8452308e
