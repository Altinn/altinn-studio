import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentProps,
  IRawDataModelBinding,
  TRBFormComp,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export interface IDataModelBindingsForCustom {
  [key: string]: IRawDataModelBinding;
}

export type CompCustomSerialized = {
  type: 'Custom';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    [key: string]: ExprValToActualOrExpr<ExprVal.String> | undefined;
  } & TRBFormComp &
    TRBSummarizable;
  renderAsSummary?: boolean;
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  required?: ExprValToActualOrExpr<ExprVal.Boolean>;
  readOnly?: ExprValToActualOrExpr<ExprVal.Boolean>;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings?: IDataModelBindingsForCustom;
  tagName: string;
  [key: string]: unknown;
} & ComponentBase &
  FormComponentProps;

// Source hash: e42100369833dfa23515b9e0dee34f918006b4f36e05e59c13c5108e536bb927
