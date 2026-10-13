import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  GridRows,
  LabeledComponentProps,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export type CompGridSerialized = {
  type: 'Grid';
  renderAsSummary?: boolean;
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  textResourceBindings?: TRBSummarizable & TRBLabel;
  rows: GridRows;
  dataModelBindings?: undefined;
} & ComponentBase &
  LabeledComponentProps;

// Source hash: 7b215691ce9bcfb47ff34e575982f4277e098c8032774f70f6c7a5a799fb4d1f
