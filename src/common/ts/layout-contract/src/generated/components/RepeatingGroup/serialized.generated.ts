import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  AllowedValidationMasks,
  ComponentBase,
  GridRows,
  IButtonProps,
  ILabelSettings,
  IRawDataModelBinding,
  ITableColumnProperties,
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
  renderAsSummary?: boolean;
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    description?: ExprValToActualOrExpr<ExprVal.String>;
    help?: ExprValToActualOrExpr<ExprVal.String>;
    addButtonFull?: ExprValToActualOrExpr<ExprVal.String>;
    addButton?: ExprValToActualOrExpr<ExprVal.String>;
    saveButton?: ExprValToActualOrExpr<ExprVal.String>;
    saveAndNextButton?: ExprValToActualOrExpr<ExprVal.String>;
    editButtonClose?: ExprValToActualOrExpr<ExprVal.String>;
    editButtonOpen?: ExprValToActualOrExpr<ExprVal.String>;
    paginationNextButton?: ExprValToActualOrExpr<ExprVal.String>;
    paginationBackButton?: ExprValToActualOrExpr<ExprVal.String>;
    multipageBackButton?: ExprValToActualOrExpr<ExprVal.String>;
    multipageNextButton?: ExprValToActualOrExpr<ExprVal.String>;
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
} & ComponentBase;

// Source hash: eb9cb89e34b4ba8484e00c69bb006ad218669d576b642db5e8ca12eb10b77cad
