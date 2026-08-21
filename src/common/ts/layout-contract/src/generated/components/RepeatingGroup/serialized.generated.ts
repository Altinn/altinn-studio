import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  AllowedValidationMasks,
  ComponentBase,
  GridRows,
  IButtonProps,
  ILabelSettings,
  IRawDataModelBinding,
  ITableColumnProperties,
  SummarizableComponentProps,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export interface IDataModelBindingsForGroup {
  group: IRawDataModelBinding;
}

export interface IGroupColumnFormatting extends ITableColumnProperties {
  editInTable?: boolean;
  showInExpandedEdit?: boolean;
}

export interface IGroupEditProperties {
  mode?: 'hideTable' | 'showTable' | 'showAll' | 'onlyTable';
  addButton?: ExprValToActualOrExpr<ExprVal.Boolean>;
  saveButton?: ExprValToActualOrExpr<ExprVal.Boolean>;
  deleteButton?: ExprValToActualOrExpr<ExprVal.Boolean>;
  editButton?: ExprValToActualOrExpr<ExprVal.Boolean>;
  multiPage?: boolean;
  openByDefault?: boolean | 'first' | 'last';
  alertOnDelete?: ExprValToActualOrExpr<ExprVal.Boolean>;
  saveAndNextButton?: ExprValToActualOrExpr<ExprVal.Boolean>;
  alwaysShowAddButton?: boolean;
  compactButtons?: boolean;
  buttonLayout?: 'horizontal' | 'vertical';
}

export type CompRepeatingGroupSerialized = {
  type: 'RepeatingGroup';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    description?: ExprValToActualOrExpr<ExprVal.String>;
    add_button_full?: ExprValToActualOrExpr<ExprVal.String>;
    add_button?: ExprValToActualOrExpr<ExprVal.String>;
    save_button?: ExprValToActualOrExpr<ExprVal.String>;
    save_and_next_button?: ExprValToActualOrExpr<ExprVal.String>;
    edit_button_close?: ExprValToActualOrExpr<ExprVal.String>;
    edit_button_open?: ExprValToActualOrExpr<ExprVal.String>;
    pagination_next_button?: ExprValToActualOrExpr<ExprVal.String>;
    pagination_back_button?: ExprValToActualOrExpr<ExprVal.String>;
    multipage_back_button?: ExprValToActualOrExpr<ExprVal.String>;
    multipage_next_button?: ExprValToActualOrExpr<ExprVal.String>;
  } & TRBSummarizable;
  rowsBefore?: GridRows;
  rowsAfter?: GridRows;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: IDataModelBindingsForGroup;
  showValidations?: AllowedValidationMasks;
  validateOnSaveRow?: AllowedValidationMasks;
  edit?: IGroupEditProperties;
  pagination?: { rowsPerPage: number };
  maxCount?: number;
  minCount?: number;
  tableHeaders?: string[];
  tableColumns?: { [key: string]: IGroupColumnFormatting };
  hiddenRow?: ExprValToActualOrExpr<ExprVal.Boolean>;
  stickyHeader?: boolean;
  labelSettings?: ILabelSettings;
  addButton?: IButtonProps;
  children: string[];
} & ComponentBase &
  SummarizableComponentProps;

// Source hash: b668612403c24c88f89a385fa64decd7c42eb2866289df5333d2493219d1fabd
