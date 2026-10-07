import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentProps,
  ReadOnlyComponentProps,
  RequiredComponentProps,
  SummarizableComponentProps,
  TRBFormComp,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export type ISubformCellContent =
  | { value: ExprValToActualOrExpr<ExprVal.String>; default?: string }
  | { query: string; default?: string };

export type CompSubformSerialized = {
  type: 'Subform';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    description?: ExprValToActualOrExpr<ExprVal.String>;
    help?: ExprValToActualOrExpr<ExprVal.String>;
    addButton?: ExprValToActualOrExpr<ExprVal.String>;
    tableEditButton?: ExprValToActualOrExpr<ExprVal.String>;
  } & TRBFormComp &
    TRBSummarizable;
  layoutSet: string;
  showAddButton?: boolean;
  showDeleteButton?: boolean;
  entryDisplayName?: ExprValToActualOrExpr<ExprVal.String>;
  tableColumns: { headerContent: string; cellContent: ISubformCellContent }[];
  summaryDelimiter?: string;
  dataModelBindings?: undefined;
} & ComponentBase &
  FormComponentProps &
  SummarizableComponentProps &
  RequiredComponentProps &
  ReadOnlyComponentProps;

// Source hash: 5d1690a2bd12d431bc0af9bfd3b7cf0d54b1cd617a9ace9fa29efc8c551e61fe
