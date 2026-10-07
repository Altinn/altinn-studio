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

export interface CompTimePickerExternal
  extends
    ComponentBase,
    FormComponentProps,
    SummarizableComponentProps,
    RequiredComponentProps,
    ReadOnlyComponentProps,
    LabeledComponentProps {
  type: 'TimePicker';
  textResourceBindings?: TRBFormComp & TRBSummarizable & TRBLabel;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: IDataModelBindingsSimple;
  autocomplete?: 'time';
  format?: 'HH:mm' | 'HH:mm:ss' | 'hh:mm a' | 'hh:mm:ss a';
  minTime?: ExprValToActualOrExpr<ExprVal.String> | string;
  maxTime?: ExprValToActualOrExpr<ExprVal.String> | string;
}

export type TimePickerSummaryOverridesWithRef =
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'TimePicker' } & ISummaryOverridesCommon);

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
  layout: CompTimePickerExternal;
  summaryOverrides: ISummaryOverridesCommon;
  summaryOverridesWithRef: TimePickerSummaryOverridesWithRef;
};

// Source hash: 10baa3f84e4f33c159937298e2e4c9669a9a014e568543e0ce20df18f7c0e424
