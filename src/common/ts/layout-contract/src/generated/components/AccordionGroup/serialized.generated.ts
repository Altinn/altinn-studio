import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  SummarizableComponentProps,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export type CompAccordionGroupSerialized = {
  type: 'AccordionGroup';
  textResourceBindings?: { title?: ExprValToActualOrExpr<ExprVal.String> } & TRBSummarizable;
  children: string[];
  dataModelBindings?: undefined;
} & ComponentBase &
  SummarizableComponentProps;

// Source hash: 60a07df5bdbfd7ac09dc379e175530af01e840fd3a4d70c14f23ffe379f8391d
