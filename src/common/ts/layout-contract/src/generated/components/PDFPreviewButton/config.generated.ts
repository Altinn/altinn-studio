import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase } from '@app/layout-contract/generated/common.generated';

export type ActionButtonStyle = 'primary' | 'secondary';

export interface CompPDFPreviewButtonExternal extends ComponentBase {
  type: 'PDFPreviewButton';
  textResourceBindings?: { title?: ExprValToActualOrExpr<ExprVal.String> };
  buttonStyle: ActionButtonStyle;
  dataModelBindings?: undefined;
}

export const componentConfig = {
  category: CompCategory.Action,
  availability: 'configurable',
  capabilities: {
    renderInTable: true,
    renderInButtonGroup: true,
    renderInAccordion: true,
    renderInAccordionGroup: false,
    renderInCards: true,
    renderInCardsMedia: false,
    renderInTabs: true,
  },
  behaviors: {
    isSummarizable: false,
    canHaveLabel: false,
    canHaveOptions: false,
    canHaveAttachments: false,
  },
} as const;

export type TypeConfig = {
  category: typeof componentConfig.category;
  availability: typeof componentConfig.availability;
  layout: CompPDFPreviewButtonExternal;
  summaryOverrides: undefined;
  summaryOverridesWithRef: undefined;
};

// Source hash: 36949e20149564671e08d7f6796bbf13f5cedb0198c7c0d1e7d3fc5b8d092162
