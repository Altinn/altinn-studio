import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  ISummaryOverridesCommon,
  SummarizableComponentProps,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export interface CompHeadingExternal extends ComponentBase, SummarizableComponentProps {
  type: 'Heading';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    help?: ExprValToActualOrExpr<ExprVal.String>;
  } & TRBSummarizable;
  size: 'L' | 'M' | 'S' | 'h2' | 'h3' | 'h4';
  dataModelBindings?: undefined;
}

export type HeadingSummaryOverridesWithRef =
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Heading' } & ISummaryOverridesCommon);

export const componentConfig = {
  category: CompCategory.Presentation,
  availability: 'configurable',
  capabilities: {
    renderInTable: true,
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
  layout: CompHeadingExternal;
  summaryOverrides: ISummaryOverridesCommon;
  summaryOverridesWithRef: HeadingSummaryOverridesWithRef;
};

// Source hash: b798913838720c0da2017fb1255990a9fc957e26a6f7e143f8f6527dae90a4cc
