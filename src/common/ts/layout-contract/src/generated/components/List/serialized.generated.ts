import {
  ComponentBase,
  FormComponentProps,
  IQueryParameters,
  IRawDataModelBinding,
  LabeledComponentProps,
  ReadOnlyComponentProps,
  RequiredComponentProps,
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
  RequiredComponentProps &
  ReadOnlyComponentProps &
  LabeledComponentProps;

// Source hash: 3de52212e6b382db609fd281c012c2961abce8592031bbcd9f346bd92bfa0182
