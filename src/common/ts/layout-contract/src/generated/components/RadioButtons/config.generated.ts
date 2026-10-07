import {
  ComponentBase,
  FormComponentProps,
  IDataModelBindingsOptionsSimple,
  ISelectionComponentFull,
  ISummaryOverridesCommon,
  LabeledComponentProps,
  LayoutStyle,
  ReadOnlyComponentProps,
  RequiredComponentProps,
  SummarizableComponentProps,
  TRBFormComp,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';

export interface CompRadioButtonsExternal
  extends
    ComponentBase,
    FormComponentProps,
    SummarizableComponentProps,
    ISelectionComponentFull,
    RequiredComponentProps,
    ReadOnlyComponentProps,
    LabeledComponentProps {
  type: 'RadioButtons';
  textResourceBindings?: TRBFormComp & TRBSummarizable & TRBLabel;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: IDataModelBindingsOptionsSimple;
  layout?: LayoutStyle;
  alertOnChange?: ExprValToActualOrExpr<ExprVal.Boolean>;
  showLabelsInTable?: boolean;
  showAsCard?: boolean;
}

export type RadioButtonsSummaryOverridesWithRef =
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'RadioButtons' } & ISummaryOverridesCommon);

export const componentConfig = {
  category: CompCategory.Form,
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
  layout: CompRadioButtonsExternal;
  summaryOverrides: ISummaryOverridesCommon;
  summaryOverridesWithRef: RadioButtonsSummaryOverridesWithRef;
};

// Source hash: 54966c0ec6f7f1f1680020f4096ee250d31c84c4d5fbf2a71b8abe9ab19a807f
