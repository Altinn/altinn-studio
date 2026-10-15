import {
  ComponentBase,
  FormComponentProps,
  IDataModelReference,
  IQueryParameters,
  ISummaryOverridesCommon,
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

export type ListSummaryOverridesWithRef =
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'List' } & ISummaryOverridesCommon);

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
  summaryOverrides: ISummaryOverridesCommon;
  summaryOverridesWithRef: ListSummaryOverridesWithRef;
};

// Source hash: 8b2f8d49812711ce5a2540645fd91d965265991a3cd53a31c28158ca23f0bb88
