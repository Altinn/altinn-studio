import {
  ComponentBase,
  FormComponentProps,
  IMapping,
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
  mapping?: IMapping;
  queryParameters?: IQueryParameters;
  summaryBinding?: string;
  bindingToShowInSummary?: string;
  tableHeadersMobile?: string[];
} & ComponentBase &
  FormComponentProps &
  SummarizableComponentProps &
  LabeledComponentProps;

// Source hash: 832841e5f23537aa9f81575578caa55af13dedbc2cbad0b48acd7412446bb8fc
