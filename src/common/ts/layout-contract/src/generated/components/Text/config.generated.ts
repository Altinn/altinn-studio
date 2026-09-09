import {
  ComponentBase,
  ISummaryOverridesCommon,
  SummarizableComponentProps,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';

export interface CompTextExternal extends ComponentBase, SummarizableComponentProps {
  type: 'Text';
  textResourceBindings?: TRBSummarizable & TRBLabel;
  value: ExprValToActualOrExpr<ExprVal.String>;
  direction?: 'horizontal' | 'vertical';
  icon?: string;
  dataModelBindings?: undefined;
}

export type TextSummaryOverridesWithRef =
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Text' } & ISummaryOverridesCommon);

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
  summaryOverrides: ISummaryOverridesCommon;
  summaryOverridesWithRef: TextSummaryOverridesWithRef;
};

// Source hash: 6153ec63dab5c445074fdc99363ed9bc6f0b2f86e2cf9e48ba53bb1147cc4055
