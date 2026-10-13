import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  HeadingLevel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export type CompAccordionSerialized = {
  type: 'Accordion';
  renderAsSummary?: boolean;
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  textResourceBindings?: { title?: ExprValToActualOrExpr<ExprVal.String> } & TRBSummarizable;
  children: string[];
  openByDefault?: ExprValToActualOrExpr<ExprVal.Boolean>;
  headingLevel?: HeadingLevel;
  dataModelBindings?: undefined;
} & ComponentBase;

// Source hash: 5c0390c742fe29521cdbda64bfe26311a7295e3114cec3fed7045acc9c56472a
