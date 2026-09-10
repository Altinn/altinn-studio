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
  title: string;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: { data: IRawDataModelBinding };
} & ComponentBase &
  FormComponentProps &
  SummarizableComponentProps;

// Source hash: d6599fb4063544b75ee0e5e4eb6c2a7cc3390cfb4f32cf3d60f18d5ae4d06c96
