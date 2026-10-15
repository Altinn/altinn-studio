import {
  ComponentBase,
  FormComponentProps,
  IDataModelBindingsSimple,
  ISummaryOverridesCommon,
  LabeledComponentProps,
  TRBFormComp,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';

export interface CompDatepickerExternal
  extends ComponentBase, FormComponentProps, LabeledComponentProps {
  type: 'Datepicker';
  textResourceBindings?: TRBFormComp & TRBSummarizable & TRBLabel;
  renderAsSummary?: boolean;
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  required?: ExprValToActualOrExpr<ExprVal.Boolean>;
  readOnly?: ExprValToActualOrExpr<ExprVal.Boolean>;
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

// Source hash: 1ab7410d2919d34f40dc4031ca09af7cddd54d115f8ab74f4a4c5a2ea4d8b9c7
