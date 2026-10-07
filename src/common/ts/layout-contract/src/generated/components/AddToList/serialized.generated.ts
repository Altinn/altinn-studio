import {
  ComponentBase,
  FormComponentProps,
  IRawDataModelBinding,
  ReadOnlyComponentProps,
  RequiredComponentProps,
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
  SummarizableComponentProps &
  RequiredComponentProps &
  ReadOnlyComponentProps;

// Source hash: 03edc39ac0fc41c6cd04d8c51620bcc76ad6e4b15f917e3a7b8dfb11855460d9
