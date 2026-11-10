import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  IFormatting,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export type CompNumberSerialized = {
  type: 'Number';
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  textResourceBindings?: TRBSummarizable & TRBLabel;
  formatting?: IFormatting;
  value: ExprValToActualOrExpr<ExprVal.Number>;
  direction?: 'horizontal' | 'vertical';
  icon?: string;
  dataModelBindings?: undefined;
} & ComponentBase;

// Source hash: 07d172ec12ee9c3e0880dd477c79386e1cd1a5308b80f427bdf47186b0f9d81f
