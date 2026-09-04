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
    help?: ExprValToActualOrExpr<ExprVal.String>;
  } & TRBSummarizable;
  groupingIndicator?: 'indented' | 'panel';
  children: string[];
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  dataModelBindings?: undefined;
} & ComponentBase &
  SummarizableComponentProps;

// Source hash: ff5548379cc4846ef25b20492c01a67fcaf4563d83be8aa8045fdb7427d63018
