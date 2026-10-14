import {
  ComponentBase,
  FormComponentProps,
  IDataModelBindingsOptionsSimple,
  IDataModelReference,
  ISelectionComponentFull,
  ISummaryOverridesCommon,
  LabeledComponentProps,
  LayoutStyle,
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
  extends ComponentBase, FormComponentProps, ISelectionComponentFull, LabeledComponentProps {
  type: 'Checkboxes';
  textResourceBindings?: TRBFormComp & TRBSummarizable & TRBLabel;
  renderAsSummary?: boolean;
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  required?: ExprValToActualOrExpr<ExprVal.Boolean>;
  readOnly?: ExprValToActualOrExpr<ExprVal.Boolean>;
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

// Source hash: e102ec6a0b4a1f686086cb1159ba5c790ebce9a8d217e5bd97dd7cb3a208f090
