import {
  ComponentBase,
  IFormatting,
  SummarizableComponentProps,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';

export type CompNumberSerialized = {
  type: 'Number';
  textResourceBindings?: TRBSummarizable & TRBLabel;
  formatting?: IFormatting;
  value: ExprValToActualOrExpr<ExprVal.Number>;
  direction?: 'horizontal' | 'vertical';
  icon?: string;
  dataModelBindings?: undefined;
} & ComponentBase &
  SummarizableComponentProps;

// Source hash: 056e24ab112134d6e28d365ced1114c0b4c635b88ac60b06496dcc6b4b2bb4f7
