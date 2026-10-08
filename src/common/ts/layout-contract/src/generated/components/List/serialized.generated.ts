import {
  ComponentBase,
  FormComponentProps,
  IQueryParameters,
  IRawDataModelBinding,
  LabeledComponentProps,
  SummarizableComponentProps,
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
  SummarizableComponentProps &
  LabeledComponentProps;

// Source hash: 32bde15ff538efa40b17ccc5e6668498d9f088ec53060910b4eac5a35de2eaba
