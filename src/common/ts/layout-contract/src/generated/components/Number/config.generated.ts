import {
  ComponentBase,
  IFormatting,
  ISummaryOverridesCommon,
  SummarizableComponentProps,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';

export interface CompNumberExternal extends ComponentBase, SummarizableComponentProps {
  type: 'Number';
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

// Source hash: 34f01e73d1588c2abe35a31055fdc77cc03e9701e6f35c45f71e323821e7cb1b
