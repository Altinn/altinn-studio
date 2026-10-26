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

export interface CompOrganizationLookupExternal
  extends ComponentBase, FormComponentProps, LabeledComponentProps {
  type: 'OrganizationLookup';
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
  dataModelBindings: { orgnr: IDataModelReference; name?: IDataModelReference };
}

export interface OrganizationLookupSummaryOverrides extends ISummaryOverridesCommon {
  showNextButton?: boolean;
}

export type OrganizationLookupSummaryOverridesWithRef =
  | ({ componentId: string } & OrganizationLookupSummaryOverrides)
  | ({ componentType: 'OrganizationLookup' } & OrganizationLookupSummaryOverrides);

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
  layout: CompOrganizationLookupExternal;
  summaryOverrides: OrganizationLookupSummaryOverrides;
  summaryOverridesWithRef: OrganizationLookupSummaryOverridesWithRef;
};

// Source hash: aaf544f2a62d5d5980c9b95d9474d913ae828d9471b115fa01a958b87131789b
