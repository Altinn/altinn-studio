import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentPropsWithRequired,
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
  FormComponentPropsWithRequired &
  SummarizableComponentProps;

// Source hash: 5ea1968a90e636d20976ae43ee1400617795e6f0ef6d1b0aee4958fcea24f025
