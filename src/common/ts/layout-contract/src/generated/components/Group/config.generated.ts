import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  ISummaryOverridesCommon,
  SummarizableComponentProps,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export interface CompGroupExternal extends ComponentBase, SummarizableComponentProps {
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
}

export type GroupSummaryOverridesWithRef =
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Group' } & ISummaryOverridesCommon);

export const componentConfig = {
  category: CompCategory.Container,
  availability: 'configurable',
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: true,
    renderInAccordionGroup: false,
    renderInCards: true,
    renderInCardsMedia: false,
    renderInTabs: true,
  },
  behaviors: {
    isSummarizable: true,
    canHaveLabel: false,
    canHaveOptions: false,
    canHaveAttachments: false,
  },
} as const;

export type TypeConfig = {
  category: typeof componentConfig.category;
  availability: typeof componentConfig.availability;
  layout: CompGroupExternal;
  summaryOverrides: ISummaryOverridesCommon;
  summaryOverridesWithRef: GroupSummaryOverridesWithRef;
};

// Source hash: fed3a630416737699e4dfed3f26d9385f7440ee7221996688834a31241a1fde1
