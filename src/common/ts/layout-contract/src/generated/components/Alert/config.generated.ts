import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase } from '@app/layout-contract/generated/common.generated';

export type AlertSeverity = 'success' | 'warning' | 'danger' | 'info';

export interface CompAlertExternal extends ComponentBase {
  type: 'Alert';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    body?: ExprValToActualOrExpr<ExprVal.String>;
  };
  severity: AlertSeverity;
  dataModelBindings?: undefined;
}

export const componentConfig = {
  category: CompCategory.Presentation,
  availability: 'configurable',
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
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
  layout: CompAlertExternal;
  summaryOverrides: undefined;
  summaryOverridesWithRef: undefined;
};

// Source hash: ed5c0226db3c16bdbc4b1c5c7bfd0adc4caa0a2c2cf9cd0eec348ac0d2c2f9e4
