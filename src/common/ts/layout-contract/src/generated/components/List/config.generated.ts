import {
  ComponentBase,
  FormComponentProps,
  IDataModelReference,
  IQueryParameters,
  ISummaryOverridesCommon,
  ITableColumnWidth,
  LabeledComponentProps,
  TRBFormComp,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';

export interface CompListExternal extends ComponentBase, FormComponentProps, LabeledComponentProps {
  type: 'List';
  textResourceBindings?: TRBFormComp & TRBSummarizable & TRBLabel;
  renderAsSummary?: boolean;
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  required?: ExprValToActualOrExpr<ExprVal.Boolean>;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings?: IDataModelBindingsForList;
  deletionStrategy?: 'soft' | 'hard';
  tableHeaders: { [key: string]: string };
  tableColumns?: { [key: string]: ITableColumnWidth };
  sortableColumns?: string[];
  pagination?: IPagination;
  dataListId: string;
  secure?: boolean;
  queryParameters?: IQueryParameters;
  summaryBinding?: string;
  tableHeadersMobile?: string[];
}

export interface IDataModelBindingsForList {
  group?: IDataModelReference;
  checked?: IDataModelReference;
  [key: string]: IDataModelReference | undefined;
}

export interface IPagination {
  alternatives: number[];
  default: number;
}

export interface ListSummaryOverrides extends ISummaryOverridesCommon {
  showNextButton?: boolean;
}

export type ListSummaryOverridesWithRef =
  | ({ componentId: string } & ListSummaryOverrides)
  | ({ componentType: 'List' } & ListSummaryOverrides);

export const componentConfig = {
  category: CompCategory.Form,
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
  layout: CompListExternal;
  summaryOverrides: ListSummaryOverrides;
  summaryOverridesWithRef: ListSummaryOverridesWithRef;
};

// Source hash: f5dd3863d4fefca4dae8d6525297caf6a5ad312d526eff95ff5c0b11f5b441ab
