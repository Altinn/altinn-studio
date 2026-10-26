import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  ISelectionComponent,
  ISummaryOverridesCommon,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export interface CompOptionExternal extends ComponentBase, ISelectionComponent {
  type: 'Option';
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  textResourceBindings?: TRBSummarizable & TRBLabel;
  value: ExprValToActualOrExpr<ExprVal.String>;
  direction?: 'horizontal' | 'vertical';
  icon?: string;
  dataModelBindings?: undefined;
}

export type OptionSummaryOverridesWithRef =
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Option' } & ISummaryOverridesCommon);

export const componentConfig = {
  category: CompCategory.Presentation,
  availability: 'configurable',
  capabilities: {
    renderInTable: true,
    renderInButtonGroup: false,
    renderInAccordion: true,
    renderInAccordionGroup: false,
    renderInTabs: true,
    renderInCards: true,
    renderInCardsMedia: false,
  },
  behaviors: {
    isSummarizable: true,
    canHaveLabel: false,
    canHaveOptions: true,
    canHaveAttachments: false,
  },
} as const;

export type TypeConfig = {
  category: typeof componentConfig.category;
  availability: typeof componentConfig.availability;
  layout: CompOptionExternal;
  summaryOverrides: ISummaryOverridesCommon;
  summaryOverridesWithRef: OptionSummaryOverridesWithRef;
};

// Source hash: de3b312f6b152cd76483fbc48efb747782cfe572d681508fc2f5e348fb8bcbd6
