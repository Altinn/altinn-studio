import { ComponentBase, PageValidation } from '@app/layout-contract/generated/common.generated';
import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';

export type ButtonColor = 'first' | 'second' | 'success' | 'danger';

export type ButtonStyle = 'primary' | 'secondary' | 'tertiary';

export type ClientAction =
  NextPageAction | PreviousPageAction | NavigateToPageAction | SubformAction;

export interface CloseSubformAction {
  id: 'closeSubform';
  type: 'ClientAction';
  validation?: PageValidation;
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

export type CompCustomButtonSerialized = {
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
} & ComponentBase;

// Source hash: 5bf3c977f289ad0c0af0cee47089685851ef6d92721c1d92671e1df7c4123501
