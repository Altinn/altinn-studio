import { ComponentBase, PageValidation } from '@app/layout-contract/generated/common.generated';
import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';

export type ButtonColor = 'first' | 'second' | 'success' | 'danger';

export type ButtonStyle = 'primary' | 'secondary' | 'tertiary';

export type ClientAction =
  NextPageAction | PreviousPageAction | NavigateToPageAction | SubformAction;

export interface CloseSubformAction {
  id: 'closeSubform';
  type: 'ClientAction';
  validation?: PageValidation;
}

export interface CompCustomButtonExternal extends ComponentBase {
  type: 'CustomButton';
  actions: CustomAction[];
  buttonStyle?: ButtonStyle;
  buttonColor?: ButtonColor;
  buttonSize?: CustomButtonSize;
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    tableTitle?: ExprValToActualOrExpr<ExprVal.String>;
  };
  dataModelBindings?: undefined;
}

export type CustomAction = ClientAction | ServerAction;

export type CustomButtonSize = 'sm' | 'md' | 'lg' | 'small' | 'medium' | 'large';

export interface NavigateToPageAction {
  id: 'navigateToPage';
  type: 'ClientAction';
  validation?: PageValidation;
  metadata: { page: string };
}

export interface NextPageAction {
  id: 'nextPage';
  type: 'ClientAction';
  validation?: PageValidation;
}

export interface PreviousPageAction {
  id: 'previousPage';
  type: 'ClientAction';
  validation?: PageValidation;
}

export interface ServerAction {
  id: string;
  type: 'ServerAction';
  validation?: PageValidation;
}

export type SubformAction = CloseSubformAction;

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
  layout: CompCustomButtonExternal;
  summaryOverrides: undefined;
  summaryOverridesWithRef: undefined;
};

// Source hash: 413294d28ab8ba2e567a02b51a6b44ef38c7cb86d0533284420c169421f00d50
