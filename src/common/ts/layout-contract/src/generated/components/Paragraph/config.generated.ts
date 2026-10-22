import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  ISummaryOverridesCommon,
} from '@app/layout-contract/generated/common.generated';

export interface CompParagraphExternal extends ComponentBase {
  type: 'Paragraph';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    help?: ExprValToActualOrExpr<ExprVal.String>;
  };
  dataModelBindings?: undefined;
}

export type ParagraphSummaryOverridesWithRef =
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Paragraph' } & ISummaryOverridesCommon);

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
  layout: CompParagraphExternal;
  summaryOverrides: ISummaryOverridesCommon;
  summaryOverridesWithRef: ParagraphSummaryOverridesWithRef;
};

// Source hash: df38786240bc8e084d06df4f692b8a49fe56cc8466454261bdf50e282ae522a9
