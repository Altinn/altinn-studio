import {
  ComponentBase,
  ISelectionComponent,
  ISummaryOverridesCommon,
  SummarizableComponentProps,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';

export interface CompOptionExternal
  extends ComponentBase, ISelectionComponent, SummarizableComponentProps {
  type: 'Option';
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

// Source hash: dca483461766e2d8ec6677b76ea1f800863e7e746266bb4ec1087a07c1071897
