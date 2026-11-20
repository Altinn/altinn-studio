import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  ISummaryOverridesCommon,
} from '@app/layout-contract/generated/common.generated';

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

export type PanelSummaryOverridesWithRef =
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Panel' } & ISummaryOverridesCommon);

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
    isSummarizable: true,
    canHaveLabel: false,
    canHaveOptions: false,
    canHaveAttachments: false,
  },
} as const;

export type TypeConfig = {
  category: typeof componentConfig.category;
  availability: typeof componentConfig.availability;
  layout: CompPanelExternal;
  summaryOverrides: ISummaryOverridesCommon;
  summaryOverridesWithRef: PanelSummaryOverridesWithRef;
};

// Source hash: 998c59e50b99af04dd66cee7c28549d2a8b19a271998b9abf0e3269b71f4d0fc
