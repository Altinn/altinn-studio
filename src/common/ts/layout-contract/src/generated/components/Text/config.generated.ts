import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  ISummaryOverridesCommon,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export interface CompTextExternal extends ComponentBase {
  type: 'Text';
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  textResourceBindings?: TRBSummarizable & TRBLabel;
  value: ExprValToActualOrExpr<ExprVal.String>;
  direction?: 'horizontal' | 'vertical';
  icon?: string;
  dataModelBindings?: undefined;
}

export interface TextSummaryOverrides extends ISummaryOverridesCommon {
  emptyFieldText?: string;
}

export type TextSummaryOverridesWithRef =
  | ({ componentId: string } & TextSummaryOverrides)
  | ({ componentType: 'Text' } & TextSummaryOverrides);

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
  layout: CompTextExternal;
  summaryOverrides: TextSummaryOverrides;
  summaryOverridesWithRef: TextSummaryOverridesWithRef;
};

// Source hash: 0ba02ac1878cb90c2ab701ee707db685c61fb0d7b44f3f7025e2df0690dfd4b9
