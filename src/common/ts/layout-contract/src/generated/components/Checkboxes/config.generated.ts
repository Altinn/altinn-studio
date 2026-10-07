import {
  ComponentBase,
  FormComponentProps,
  IDataModelBindingsOptionsSimple,
  IDataModelReference,
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

export interface CheckboxesSummaryOverrides extends ISummaryOverridesCommon {
  displayType?: 'list' | 'string';
}

export type CheckboxesSummaryOverridesWithRef =
  | ({ componentId: string } & CheckboxesSummaryOverrides)
  | ({ componentType: 'Checkboxes' } & CheckboxesSummaryOverrides);

export interface CompCheckboxesExternal
  extends
    ComponentBase,
    FormComponentProps,
    SummarizableComponentProps,
    ISelectionComponentFull,
    RequiredComponentProps,
    ReadOnlyComponentProps,
    LabeledComponentProps {
  type: 'Checkboxes';
  textResourceBindings?: TRBFormComp & TRBSummarizable & TRBLabel;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: IDataModelBindingsForGroupCheckbox;
  deletionStrategy?: 'soft' | 'hard';
  layout?: LayoutStyle;
  showLabelsInTable?: boolean;
  alertOnChange?: ExprValToActualOrExpr<ExprVal.Boolean>;
}

export interface IDataModelBindingsForGroupCheckbox extends IDataModelBindingsOptionsSimple {
  group?: IDataModelReference;
  checked?: IDataModelReference;
}

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
  layout: CompCheckboxesExternal;
  summaryOverrides: CheckboxesSummaryOverrides;
  summaryOverridesWithRef: CheckboxesSummaryOverridesWithRef;
};

// Source hash: 46ddc9004f99009631d80457a3d7e817369bbc940fed815516dac8075cace0f7
