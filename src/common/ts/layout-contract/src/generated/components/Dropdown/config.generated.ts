import {
  ComponentBase,
  FormComponentProps,
  IDataModelBindingsOptionsSimple,
  ISelectionComponentFull,
  ISummaryOverridesCommon,
  LabeledComponentProps,
  SummarizableComponentProps,
  TRBFormComp,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';

export interface CompDropdownExternal
  extends
    ComponentBase,
    FormComponentProps,
    SummarizableComponentProps,
    ISelectionComponentFull,
    LabeledComponentProps {
  type: 'Dropdown';
  textResourceBindings?: TRBFormComp & TRBSummarizable & TRBLabel;
  alertOnChange?: ExprValToActualOrExpr<ExprVal.Boolean>;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: IDataModelBindingsOptionsSimple;
}

export type DropdownSummaryOverridesWithRef =
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Dropdown' } & ISummaryOverridesCommon);

export const componentConfig = {
  category: CompCategory.Form,
  availability: 'configurable',
  capabilities: {
    renderInTable: true,
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
    canHaveOptions: true,
    canHaveAttachments: false,
  },
} as const;

export type TypeConfig = {
  category: typeof componentConfig.category;
  availability: typeof componentConfig.availability;
  layout: CompDropdownExternal;
  summaryOverrides: ISummaryOverridesCommon;
  summaryOverridesWithRef: DropdownSummaryOverridesWithRef;
};

// Source hash: ebd254fba0dd72311209a2aae228069c59dedabf24dae38f994d8d1a2d6d1ce4
