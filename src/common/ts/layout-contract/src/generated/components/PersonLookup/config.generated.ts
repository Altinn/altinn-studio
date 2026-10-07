import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentProps,
  IDataModelReference,
  ISummaryOverridesCommon,
  LabeledComponentProps,
  ReadOnlyComponentProps,
  RequiredComponentProps,
  SummarizableComponentProps,
  TRBFormComp,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export interface CompPersonLookupExternal
  extends
    ComponentBase,
    FormComponentProps,
    SummarizableComponentProps,
    RequiredComponentProps,
    ReadOnlyComponentProps,
    LabeledComponentProps {
  type: 'PersonLookup';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    description?: ExprValToActualOrExpr<ExprVal.String>;
    help?: ExprValToActualOrExpr<ExprVal.String>;
  } & TRBFormComp &
    TRBSummarizable;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: IDataModelBindingsForPersonLookup;
}

export interface IDataModelBindingsForPersonLookup {
  ssn: IDataModelReference;
  fullName?: IDataModelReference;
  lastName?: IDataModelReference;
  middleName?: IDataModelReference;
  firstName?: IDataModelReference;
}

export type PersonLookupSummaryOverridesWithRef =
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'PersonLookup' } & ISummaryOverridesCommon);

export const componentConfig = {
  category: CompCategory.Form,
  availability: 'configurable',
  capabilities: {
    renderInTable: false,
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
  layout: CompPersonLookupExternal;
  summaryOverrides: ISummaryOverridesCommon;
  summaryOverridesWithRef: PersonLookupSummaryOverridesWithRef;
};

// Source hash: cfed3ec599820113ee4016f1680bfc51058b1767adeb87cc1b02b5383afcc91c
