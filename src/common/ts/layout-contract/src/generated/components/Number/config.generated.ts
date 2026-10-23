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

export interface NumberSummaryOverrides extends ISummaryOverridesCommon {
  emptyFieldText?: string;
}

export type NumberSummaryOverridesWithRef =
  | ({ componentId: string } & NumberSummaryOverrides)
  | ({ componentType: 'Number' } & NumberSummaryOverrides);

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
  summaryOverrides: NumberSummaryOverrides;
  summaryOverridesWithRef: NumberSummaryOverridesWithRef;
};

// Source hash: 6813698e3a8de0cd2667d873bab5e4cfc6b98db8b1627421e6b7bb62f115c88e
