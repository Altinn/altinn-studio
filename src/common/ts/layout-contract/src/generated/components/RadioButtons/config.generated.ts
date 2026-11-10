import {
  ComponentBase,
  FormComponentProps,
  IDataModelBindingsOptionsSimple,
  ISelectionComponentFull,
  ISummaryOverridesCommon,
  LabeledComponentProps,
  LayoutStyle,
  TRBFormComp,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';

export interface CompRadioButtonsExternal
  extends ComponentBase, FormComponentProps, ISelectionComponentFull, LabeledComponentProps {
  type: 'RadioButtons';
  textResourceBindings?: TRBFormComp & TRBSummarizable & TRBLabel;
  renderAsSummary?: boolean;
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  required?: ExprValToActualOrExpr<ExprVal.Boolean>;
  readOnly?: ExprValToActualOrExpr<ExprVal.Boolean>;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: IDataModelBindingsOptionsSimple;
  layout?: LayoutStyle;
  alertOnChange?: ExprValToActualOrExpr<ExprVal.Boolean>;
  showLabelsInTable?: boolean;
  showAsCard?: boolean;
}

export interface RadioButtonsSummaryOverrides extends ISummaryOverridesCommon {
  showNextButton?: boolean;
}

export type RadioButtonsSummaryOverridesWithRef =
  | ({ componentId: string } & RadioButtonsSummaryOverrides)
  | ({ componentType: 'RadioButtons' } & RadioButtonsSummaryOverrides);

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
  summaryOverrides: RadioButtonsSummaryOverrides;
  summaryOverridesWithRef: RadioButtonsSummaryOverridesWithRef;
};

// Source hash: a82aa4d43e7574cac967644d4e7b6934951acdb4a2bbcce16f4d7f8115daf547
