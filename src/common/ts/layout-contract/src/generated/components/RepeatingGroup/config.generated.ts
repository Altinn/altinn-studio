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
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export interface CompRepeatingGroupExternal extends ComponentBase {
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
  showNextButton?: boolean;
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

// Source hash: 72144f041af224e4edfa25e324d159084cb2973cf840307e84a0dc7b88c455bc
