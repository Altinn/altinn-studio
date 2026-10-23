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

export interface OptionSummaryOverrides extends ISummaryOverridesCommon {
  emptyFieldText?: string;
}

export type OptionSummaryOverridesWithRef =
  | ({ componentId: string } & OptionSummaryOverrides)
  | ({ componentType: 'Option' } & OptionSummaryOverrides);

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
  summaryOverrides: OptionSummaryOverrides;
  summaryOverridesWithRef: OptionSummaryOverridesWithRef;
};

// Source hash: 9c7294f910065ade2808f222ef1bdd4413b5537437bb5d35cc50ed41b7eb8ef8
