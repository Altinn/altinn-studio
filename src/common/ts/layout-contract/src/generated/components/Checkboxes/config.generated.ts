import {
  ComponentBase,
  FormComponentPropsWithRequired,
  IDataModelBindingsOptionsSimple,
  IDataModelReference,
  ISelectionComponentFull,
  ISummaryOverridesCommon,
  LabeledComponentProps,
  LayoutStyle,
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
    FormComponentPropsWithRequired,
    SummarizableComponentProps,
    ISelectionComponentFull,
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

// Source hash: ea7b2faa6b4abbc27f4db7abde78e49131b83980c71d1a46e162c84ec7ea862b
