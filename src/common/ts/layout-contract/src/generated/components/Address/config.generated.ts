import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentProps,
  IDataModelReference,
  ISummaryOverridesCommon,
  LabeledComponentProps,
  SaveWhileTyping,
  TRBFormComp,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export interface AddressSummaryOverrides extends ISummaryOverridesCommon {
  showNextButton?: boolean;
}

export type AddressSummaryOverridesWithRef =
  | ({ componentId: string } & AddressSummaryOverrides)
  | ({ componentType: 'Address' } & AddressSummaryOverrides);

export interface CompAddressExternal
  extends ComponentBase, FormComponentProps, LabeledComponentProps {
  type: 'Address';
  textResourceBindings?: {
    title?: ExprValToActualOrExpr<ExprVal.String>;
    careOfTitle?: ExprValToActualOrExpr<ExprVal.String>;
    zipCodeTitle?: ExprValToActualOrExpr<ExprVal.String>;
    postPlaceTitle?: ExprValToActualOrExpr<ExprVal.String>;
    houseNumberTitle?: ExprValToActualOrExpr<ExprVal.String>;
  } & TRBFormComp &
    TRBSummarizable;
  renderAsSummary?: boolean;
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  required?: ExprValToActualOrExpr<ExprVal.Boolean>;
  readOnly?: ExprValToActualOrExpr<ExprVal.Boolean>;
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
  summaryOverrides: AddressSummaryOverrides;
  summaryOverridesWithRef: AddressSummaryOverridesWithRef;
};

// Source hash: 25cae86bdb9c484887d56da8470e9c6f3aae9716a7588b6f550ff1c77717e3d6
