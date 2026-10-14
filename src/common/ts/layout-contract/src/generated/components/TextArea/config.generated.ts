import {
  ComponentBase,
  FormComponentProps,
  HTMLAutoCompleteValues,
  IDataModelBindingsSimple,
  ISummaryOverridesCommon,
  LabeledComponentProps,
  SaveWhileTyping,
  TRBFormComp,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';

export interface CompTextAreaExternal
  extends ComponentBase, FormComponentProps, LabeledComponentProps {
  type: 'TextArea';
  textResourceBindings?: TRBFormComp & TRBSummarizable & TRBLabel;
  renderAsSummary?: boolean;
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  required?: ExprValToActualOrExpr<ExprVal.Boolean>;
  readOnly?: ExprValToActualOrExpr<ExprVal.Boolean>;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: IDataModelBindingsSimple;
  saveWhileTyping?: SaveWhileTyping;
  autocomplete?: HTMLAutoCompleteValues;
  maxLength?: number;
}

export type TextAreaSummaryOverridesWithRef =
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'TextArea' } & ISummaryOverridesCommon);

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
    canHaveOptions: false,
    canHaveAttachments: false,
  },
} as const;

export type TypeConfig = {
  category: typeof componentConfig.category;
  availability: typeof componentConfig.availability;
  layout: CompTextAreaExternal;
  summaryOverrides: ISummaryOverridesCommon;
  summaryOverridesWithRef: TextAreaSummaryOverridesWithRef;
};

// Source hash: ee9ed1352da63d5af4e91ee7aaa4ded2e6499068a1cb7f51c339ec061703bbe5
