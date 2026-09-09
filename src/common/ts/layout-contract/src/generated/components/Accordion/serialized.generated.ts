import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  HeadingLevel,
  SummarizableComponentProps,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export type CompAccordionSerialized = {
  type: 'Accordion';
  textResourceBindings?: { title?: ExprValToActualOrExpr<ExprVal.String> } & TRBSummarizable;
  children: string[];
  openByDefault?: ExprValToActualOrExpr<ExprVal.Boolean>;
  headingLevel?: HeadingLevel;
  dataModelBindings?: undefined;
} & ComponentBase &
  SummarizableComponentProps;

// Source hash: 8d02dac9de48e9287d064b543ec073d5b184e36b6834690c8f7f232e0fc4cd0f
