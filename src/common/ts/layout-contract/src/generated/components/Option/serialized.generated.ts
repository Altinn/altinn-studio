import {
  ComponentBase,
  ISelectionComponent,
  SummarizableComponentProps,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';

export type CompOptionSerialized = {
  type: 'Option';
  textResourceBindings?: TRBSummarizable & TRBLabel;
  value: ExprValToActualOrExpr<ExprVal.String>;
  direction?: 'horizontal' | 'vertical';
  icon?: string;
  dataModelBindings?: undefined;
} & ComponentBase &
  ISelectionComponent &
  SummarizableComponentProps;

// Source hash: 3e561166cc03e0a033c6477710eb1a6a81b186e0bb0ab7e6c4cb7f8c9bb226ff
