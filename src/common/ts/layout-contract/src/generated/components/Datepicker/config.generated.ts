import {
  ComponentBase,
  FormComponentProps,
  IDataModelBindingsSimple,
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

export interface CompDatepickerExternal
  extends
    ComponentBase,
    FormComponentProps,
    SummarizableComponentProps,
    RequiredComponentProps,
    ReadOnlyComponentProps,
    LabeledComponentProps {
  type: 'Datepicker';
  textResourceBindings?: TRBFormComp & TRBSummarizable & TRBLabel;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: IDataModelBindingsSimple;
  autocomplete?: 'bday';
  minDate?:
    | ExprValToActualOrExpr<ExprVal.String>
    | 'today'
    | 'yesterday'
    | 'tomorrow'
    | 'oneYearAgo'
    | 'oneYearFromNow';
  maxDate?:
    | ExprValToActualOrExpr<ExprVal.String>
    | 'today'
    | 'yesterday'
    | 'tomorrow'
    | 'oneYearAgo'
    | 'oneYearFromNow';
  timeStamp?: boolean;
  format?: string;
}

export type DatepickerSummaryOverridesWithRef =
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Datepicker' } & ISummaryOverridesCommon);

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
  layout: CompDatepickerExternal;
  summaryOverrides: ISummaryOverridesCommon;
  summaryOverridesWithRef: DatepickerSummaryOverridesWithRef;
};

// Source hash: 2d0bd466f67a7563b173f37a386802bc60224e0cadf0c741bbd315ae2ed917f4
