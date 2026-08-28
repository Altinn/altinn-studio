import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase } from '@app/layout-contract/generated/common.generated';

export interface CompPanelExternal extends ComponentBase {
  type: 'Panel';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    body?: ExprValToActualOrExpr<ExprVal.String>;
  };
  variant?: PanelVariant;
  showIcon?: boolean;
  dataModelBindings?: undefined;
}

export type PanelVariant = 'info' | 'warning' | 'error' | 'success';

export const componentConfig = {
  category: CompCategory.Presentation,
  availability: 'configurable',
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: true,
    renderInAccordionGroup: false,
    renderInCards: false,
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
  layout: CompPanelExternal;
  summaryOverrides: undefined;
  summaryOverridesWithRef: undefined;
};

// Source hash: 6c7290cc8e07e50b68aa4170bcdc8eab95a51d7ed88f557cc085912aabfb2302
