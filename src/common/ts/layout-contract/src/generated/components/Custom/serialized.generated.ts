import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
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
  SummarizableComponentProps &
  RequiredComponentProps &
  ReadOnlyComponentProps;

// Source hash: 2859c4694de6d1570c5c63876bd867c765a5415007124e891c47d2dac6d1691e
