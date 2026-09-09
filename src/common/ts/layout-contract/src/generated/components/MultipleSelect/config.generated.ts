import {
  ComponentBase,
  FormComponentPropsWithRequired,
  IDataModelBindingsOptionsSimple,
  IDataModelReference,
  ISelectionComponentFull,
  ISummaryOverridesCommon,
  LabeledComponentProps,
  SummarizableComponentProps,
  TRBFormComp,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';

export interface CompMultipleSelectExternal
  extends
    ComponentBase,
    FormComponentPropsWithRequired,
    SummarizableComponentProps,
    ISelectionComponentFull,
    LabeledComponentProps {
  type: 'MultipleSelect';
  textResourceBindings?: TRBFormComp & TRBSummarizable & TRBLabel;
  alertOnChange?: ExprValToActualOrExpr<ExprVal.Boolean>;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: IDataModelBindingsForGroupMultiselect;
  deletionStrategy?: 'soft' | 'hard';
}

export interface IDataModelBindingsForGroupMultiselect extends IDataModelBindingsOptionsSimple {
  group?: IDataModelReference;
  checked?: IDataModelReference;
}

export interface MultipleSelectSummaryOverrides extends ISummaryOverridesCommon {
  displayType?: 'list' | 'string';
}

export type MultipleSelectSummaryOverridesWithRef =
  | ({ componentId: string } & MultipleSelectSummaryOverrides)
  | ({ componentType: 'MultipleSelect' } & MultipleSelectSummaryOverrides);

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
  layout: CompMultipleSelectExternal;
  summaryOverrides: MultipleSelectSummaryOverrides;
  summaryOverridesWithRef: MultipleSelectSummaryOverridesWithRef;
};

// Source hash: 6fab2fc24d1e5a96cab156cce70a57694bc6acf92422ad2a18cf3b7166ab4972
