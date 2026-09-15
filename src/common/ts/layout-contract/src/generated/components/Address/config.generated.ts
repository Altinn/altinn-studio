import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentProps,
  IDataModelReference,
  ISummaryOverridesCommon,
  LabeledComponentProps,
  SaveWhileTyping,
  SummarizableComponentProps,
  TRBFormComp,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export type AddressSummaryOverridesWithRef =
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Address' } & ISummaryOverridesCommon);

export interface CompAddressExternal
  extends ComponentBase, FormComponentProps, SummarizableComponentProps, LabeledComponentProps {
  type: 'Address';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    careOfTitle?: ExprValToActualOrExpr<ExprVal.String>;
    zipCodeTitle?: ExprValToActualOrExpr<ExprVal.String>;
    postPlaceTitle?: ExprValToActualOrExpr<ExprVal.String>;
    houseNumberTitle?: ExprValToActualOrExpr<ExprVal.String>;
  } & TRBFormComp &
    TRBSummarizable;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: IDataModelBindingsForAddress;
  saveWhileTyping?: SaveWhileTyping;
  simplified?: boolean;
}

export interface IDataModelBindingsForAddress {
  address: IDataModelReference;
  zipCode: IDataModelReference;
  postPlace: IDataModelReference;
  careOf?: IDataModelReference;
  houseNumber?: IDataModelReference;
}

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
  layout: CompAddressExternal;
  summaryOverrides: ISummaryOverridesCommon;
  summaryOverridesWithRef: AddressSummaryOverridesWithRef;
};

// Source hash: 88a91c60edff72e95ec1ed5f09c23da51e3d2a97c7dc9dbcc700e873952a2745
