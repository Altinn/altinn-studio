import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  AllowedValidationMasks,
  ComponentBase,
  GridRows,
  IButtonProps,
  IDataModelReference,
  ILabelSettings,
  ISummaryOverridesCommon,
  ITableColumnProperties,
  SummarizableComponentProps,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export interface CompRepeatingGroupExternal extends ComponentBase, SummarizableComponentProps {
  type: 'RepeatingGroup';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    description?: ExprValToActualOrExpr<ExprVal.String>;
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
}

export interface IDataModelBindingsForGroup {
  group: IDataModelReference;
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

export interface RepeatingGroupSummaryOverrides extends ISummaryOverridesCommon {
  display?: 'table' | 'full';
}

export type RepeatingGroupSummaryOverridesWithRef =
  | ({ componentId: string } & RepeatingGroupSummaryOverrides)
  | ({ componentType: 'RepeatingGroup' } & RepeatingGroupSummaryOverrides);

export const componentConfig = {
  category: CompCategory.Container,
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
    isSummarizable: true,
    canHaveLabel: false,
    canHaveOptions: false,
    canHaveAttachments: false,
  },
} as const;

export type TypeConfig = {
  category: typeof componentConfig.category;
  availability: typeof componentConfig.availability;
  layout: CompRepeatingGroupExternal;
  summaryOverrides: RepeatingGroupSummaryOverrides;
  summaryOverridesWithRef: RepeatingGroupSummaryOverridesWithRef;
};

// Source hash: b98b101cbf08f7d920cbb870d7ed13f9c6c837533948ed44136bd8ef6513e5a0
