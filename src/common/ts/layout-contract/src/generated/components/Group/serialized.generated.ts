import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase, TRBSummarizable } from '@app/layout-contract/generated/common.generated';

export type CompGroupSerialized = {
  type: 'Group';
  renderAsSummary?: boolean;
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    description?: ExprValToActualOrExpr<ExprVal.String>;
    help?: ExprValToActualOrExpr<ExprVal.String>;
  } & TRBSummarizable;
  groupingIndicator?: 'indented' | 'panel';
  children: string[];
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  dataModelBindings?: undefined;
} & ComponentBase;

// Source hash: 1c7131c815b11f6f18cbd6e5a3e707586b0609aa3d8231de919dbedb6a8f611c
