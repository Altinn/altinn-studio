import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export type CompDateSerialized = {
  type: 'Date';
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  textResourceBindings?: TRBSummarizable & TRBLabel;
  format?: string;
  value: ExprValToActualOrExpr<ExprVal.String>;
  direction?: 'horizontal' | 'vertical';
  icon?: string;
  dataModelBindings?: undefined;
} & ComponentBase;

// Source hash: 32280ca1ee0caf74d2bccfb34513c2c2253b38884c6c00f370833cbece5d1f84
