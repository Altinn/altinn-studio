import {
  ComponentBase,
  FormComponentProps,
  IRawDataModelBinding,
  SummarizableComponentProps,
  TRBFormComp,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';

export type CompAddToListSerialized = {
  type: 'AddToList';
  textResourceBindings?: TRBFormComp & TRBSummarizable;
  required?: ExprValToActualOrExpr<ExprVal.Boolean>;
  readOnly?: ExprValToActualOrExpr<ExprVal.Boolean>;
  title: string;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: { data: IRawDataModelBinding };
} & ComponentBase &
  FormComponentProps &
  SummarizableComponentProps;

// Source hash: 1d896d6bcdd9b0090ee5ba8273b540df6fe81242e1e975507fd8d7ef3b262bdd
