import {
  ComponentBase,
  FormComponentPropsWithRequired,
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
  FormComponentPropsWithRequired &
  SummarizableComponentProps;

// Source hash: 4193656da88350da7f78ee8310979c72f2ddc0fc9e87cf4b46b90a9c5646e4c2
