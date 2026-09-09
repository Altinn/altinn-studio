import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase } from '@app/layout-contract/generated/common.generated';

export type ActionButtonStyle = 'primary' | 'secondary';

export interface CompActionButtonExternal extends ComponentBase {
  type: 'ActionButton';
  textResourceBindings?: { title?: ExprValToActualOrExpr<ExprVal.String> };
  action: 'instantiate' | 'confirm' | 'sign' | 'reject';
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
  layout: CompActionButtonExternal;
  summaryOverrides: undefined;
  summaryOverridesWithRef: undefined;
};

// Source hash: 61e2db36a9f60799fdf60d73e52dde951a6cc2f28f2f18889c7b1d02b531405a
