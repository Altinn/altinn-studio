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

// Source hash: ff8193e42ec1d2bad1a781e073970cdcd70805b21627e70965c9391e6795f329
