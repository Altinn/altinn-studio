import {
  ComponentBase,
  FormComponentProps,
  IDataModelBindingsOptionsSimple,
  ISelectionComponentFull,
  ISummaryOverridesCommon,
  LabeledComponentProps,
  ReadOnlyComponentProps,
  RequiredComponentProps,
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
    RequiredComponentProps,
    ReadOnlyComponentProps,
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

// Source hash: 1726b92a497cf749d17e50a65c66910f68779f0feba51a98e59c2825ad68f504
