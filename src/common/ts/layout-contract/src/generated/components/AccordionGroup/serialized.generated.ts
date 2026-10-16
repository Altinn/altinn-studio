import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase, TRBSummarizable } from '@app/layout-contract/generated/common.generated';

export type CompAccordionGroupSerialized = {
  type: 'AccordionGroup';
  renderAsSummary?: boolean;
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  textResourceBindings?: { title?: ExprValToActualOrExpr<ExprVal.String> } & TRBSummarizable;
  children: string[];
  dataModelBindings?: undefined;
} & ComponentBase;

// Source hash: 685fefcdea2d99b25755f07f7a60cca0f5f31af145972e65fd133aa0d7b0c03d
