import {
  ComponentBase,
  FormComponentPropsWithRequired,
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
    FormComponentPropsWithRequired,
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

// Source hash: e3e1258f730cbff23375aa611b76d4fedec814eb14cb69eb1a37e8cb1abdc25b
