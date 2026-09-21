import {
  ComponentBase,
  GridRows,
  ISummaryOverridesCommon,
  LabeledComponentProps,
  SummarizableComponentProps,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { CompCategory } from '@app/layout-contract';

export interface CompGridExternal
  extends ComponentBase, SummarizableComponentProps, LabeledComponentProps {
  type: 'Grid';
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

// Source hash: aa2d60adde181860c1fccb50f1061ceaa3933cbc37552c3d48a2422d58852de2
