import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  LabeledComponentProps,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export type CompButtonGroupSerialized = {
  type: 'ButtonGroup';
  renderAsSummary?: boolean;
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  textResourceBindings?: TRBSummarizable & TRBLabel;
  children: string[];
  dataModelBindings?: undefined;
} & ComponentBase &
  LabeledComponentProps;

// Source hash: 146345ad013b98062838b716558396d4e0e3ccb5d77be05e4b3ef480a7e2b4d4
