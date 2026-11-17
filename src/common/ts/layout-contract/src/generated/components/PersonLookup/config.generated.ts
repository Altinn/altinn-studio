import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentProps,
  IDataModelReference,
  ISummaryOverridesCommon,
  LabeledComponentProps,
  TRBFormComp,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export interface CompPersonLookupExternal
  extends ComponentBase, FormComponentProps, LabeledComponentProps {
  type: 'PersonLookup';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    description?: ExprValToActualOrExpr<ExprVal.String>;
    help?: ExprValToActualOrExpr<ExprVal.String>;
  } & TRBFormComp &
    TRBSummarizable;
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  required?: ExprValToActualOrExpr<ExprVal.Boolean>;
  readOnly?: ExprValToActualOrExpr<ExprVal.Boolean>;
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

export interface PersonLookupSummaryOverrides extends ISummaryOverridesCommon {
  showNextButton?: boolean;
}

export type PersonLookupSummaryOverridesWithRef =
  | ({ componentId: string } & PersonLookupSummaryOverrides)
  | ({ componentType: 'PersonLookup' } & PersonLookupSummaryOverrides);

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
  summaryOverrides: PersonLookupSummaryOverrides;
  summaryOverridesWithRef: PersonLookupSummaryOverridesWithRef;
};

// Source hash: e95b074dccf154616a30ff76c303f4f05a41e35d834899dc0497b04f4bf26ff8
