import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  SummarizableComponentProps,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export type CompGroupSerialized = {
  type: 'Group';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    description?: ExprValToActualOrExpr<ExprVal.String>;
  } & TRBSummarizable;
  groupingIndicator?: 'indented' | 'panel';
  children: string[];
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  dataModelBindings?: undefined;
} & ComponentBase &
  SummarizableComponentProps;

// Source hash: 9e0de182dfb892457baa12155c068beccb4dbc817d1e67a7b218329c6ac4c747
