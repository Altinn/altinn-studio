import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  ISummaryOverridesCommon,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export interface CompGroupExternal extends ComponentBase {
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

// Source hash: 38157b8693cca6e1ad58b664a53499dd386074f8eeeddf2009135709cb1d7b4a
