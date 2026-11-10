import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  GridRows,
  ISummaryOverridesCommon,
  LabeledComponentProps,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export interface CompGridExternal extends ComponentBase, LabeledComponentProps {
  type: 'Grid';
  renderAsSummary?: boolean;
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  textResourceBindings?: TRBSummarizable & TRBLabel;
  rows: GridRows;
  dataModelBindings?: undefined;
}

export interface GridSummaryOverrides extends ISummaryOverridesCommon {
  hideEmptyRows?: boolean;
}

export type GridSummaryOverridesWithRef =
  | ({ componentId: string } & GridSummaryOverrides)
  | ({ componentType: 'Grid' } & GridSummaryOverrides);

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
  layout: CompGridExternal;
  summaryOverrides: GridSummaryOverrides;
  summaryOverridesWithRef: GridSummaryOverridesWithRef;
};

// Source hash: 75ce2e7bc8d0773c8d6a54f7d90097bda82a3a7aa4f8bf4728d949350f3eaa7f
