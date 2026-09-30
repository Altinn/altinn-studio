import {
  ComponentBase,
  SummarizableComponentProps,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';

export type CompDateSerialized = {
  type: 'Date';
  textResourceBindings?: TRBSummarizable & TRBLabel;
  format?: string;
  value: ExprValToActualOrExpr<ExprVal.String>;
  direction?: 'horizontal' | 'vertical';
  icon?: string;
  dataModelBindings?: undefined;
} & ComponentBase &
  SummarizableComponentProps;

// Source hash: 855eb59fd17436fd5f1f84ea9cc15b0cc2133aa9a63906ecb190a7e29f586eb9
