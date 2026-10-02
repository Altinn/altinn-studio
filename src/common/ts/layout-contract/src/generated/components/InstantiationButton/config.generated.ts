import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase, IQueryParameters } from '@app/layout-contract/generated/common.generated';

export interface CompInstantiationButtonExternal extends ComponentBase {
  type: 'InstantiationButton';
  textResourceBindings?: { title?: ExprValToActualOrExpr<ExprVal.String> };
  queryParameters?: IQueryParameters;
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
  layout: CompInstantiationButtonExternal;
  summaryOverrides: undefined;
  summaryOverridesWithRef: undefined;
};

// Source hash: ffa71431f213aa05eb5a29dfd100da22d0d2a6a7b284fabe1431e9b573905cbe
