import {
  ComponentBase,
  FormComponentPropsWithRequired,
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
  FormComponentPropsWithRequired &
  SummarizableComponentProps &
  LabeledComponentProps;

// Source hash: ae6b70c777e92cb168016d6e16a27445fddc425234a24507039e3c2643c50a40
