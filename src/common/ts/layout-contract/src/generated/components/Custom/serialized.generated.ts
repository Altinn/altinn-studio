import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentProps,
  IRawDataModelBinding,
  SummarizableComponentProps,
  TRBFormComp,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export interface IDataModelBindingsForCustom {
  [key: string]: IRawDataModelBinding;
}

export type CompCustomSerialized = {
  type: 'Custom';
  textResourceBindings?: { title?: ExprValToActualOrExpr<ExprVal.String> } & TRBFormComp &
    TRBSummarizable;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings?: IDataModelBindingsForCustom;
  tagName: string;
} & ComponentBase &
  FormComponentProps &
  SummarizableComponentProps;

// Source hash: beef386cfee9c593c42901a0201997587ba651314fb2d78a295b43981138d79b
