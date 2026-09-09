import {
  ComponentBase,
  FormComponentPropsWithRequired,
  IDataModelBindingsSimple,
  ISummaryOverridesCommon,
  LabeledComponentProps,
  SummarizableComponentProps,
  TRBFormComp,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';

export interface CompDatepickerExternal
  extends
    ComponentBase,
    FormComponentPropsWithRequired,
    SummarizableComponentProps,
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

// Source hash: d72891a525d0a7493b9b7756585cb58040e454968102ebf6787bc399dd5e2469
