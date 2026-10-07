import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase } from '@app/layout-contract/generated/common.generated';

export interface CompPrintButtonExternal extends ComponentBase {
  type: 'PrintButton';
  textResourceBindings?: { title?: ExprValToActualOrExpr<ExprVal.String> };
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
  layout: CompPrintButtonExternal;
  summaryOverrides: undefined;
  summaryOverridesWithRef: undefined;
};

// Source hash: 7adfa8215459e7833babee6f6008a15ae0dc165b6ed3939a8b1528b855f52d72
