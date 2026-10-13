import {
  ComponentBase,
  FormComponentProps,
  IQueryParameters,
  IRawDataModelBinding,
  LabeledComponentProps,
  TRBFormComp,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';

export interface IDataModelBindingsForList {
  group?: IRawDataModelBinding;
  checked?: IRawDataModelBinding;
  [key: string]: IRawDataModelBinding | undefined;
}

export interface IPagination {
  alternatives: number[];
  default: number;
}

export type CompListSerialized = {
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
} & ComponentBase &
  FormComponentProps &
  LabeledComponentProps;

// Source hash: f8e6592a6d3831851b4b4132bc5da02146e71f100c8a19e35bc385146ed56540
