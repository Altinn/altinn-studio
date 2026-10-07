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

export interface CompImageUploadExternal
  extends
    ComponentBase,
    FormComponentProps,
    SummarizableComponentProps,
    RequiredComponentProps,
    ReadOnlyComponentProps,
    LabeledComponentProps {
  type: 'ImageUpload';
  textResourceBindings?: TRBFormComp & TRBSummarizable & TRBLabel;
  crop?: CropConfig;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings?: IDataModelBindingsSimple;
}

export type CropConfig = CropConfigCircle | CropConfigRect;

export interface CropConfigCircle {
  shape: 'circle';
  diameter?: number;
}

export interface CropConfigRect {
  shape: 'rectangle';
  width?: number;
  height?: number;
}

export type ImageUploadSummaryOverridesWithRef =
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'ImageUpload' } & ISummaryOverridesCommon);

export const componentConfig = {
  category: CompCategory.Form,
  availability: 'configurable',
  capabilities: {
    renderInTable: true,
    renderInButtonGroup: false,
    renderInAccordion: true,
    renderInAccordionGroup: false,
    renderInTabs: true,
    renderInCards: true,
    renderInCardsMedia: false,
  },
  behaviors: {
    isSummarizable: true,
    canHaveLabel: false,
    canHaveOptions: false,
    canHaveAttachments: true,
  },
} as const;

export type TypeConfig = {
  category: typeof componentConfig.category;
  availability: typeof componentConfig.availability;
  layout: CompImageUploadExternal;
  summaryOverrides: ISummaryOverridesCommon;
  summaryOverridesWithRef: ImageUploadSummaryOverridesWithRef;
};

// Source hash: e95e0163a4ec38e60b83a7c78ead40118a67c9a0bce22ab15091d303e5a9afdd
