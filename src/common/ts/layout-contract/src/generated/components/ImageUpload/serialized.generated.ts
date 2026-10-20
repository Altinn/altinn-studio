import {
  ComponentBase,
  FormComponentProps,
  LabeledComponentProps,
  TRBFormComp,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { IDataModelBindingsSimple } from '@app/layout-contract/generated/serialized-common.generated';

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

export type CompImageUploadSerialized = {
  type: 'ImageUpload';
  textResourceBindings?: TRBFormComp & TRBSummarizable & TRBLabel;
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  required?: ExprValToActualOrExpr<ExprVal.Boolean>;
  readOnly?: ExprValToActualOrExpr<ExprVal.Boolean>;
  crop?: CropConfig;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings?: IDataModelBindingsSimple;
} & ComponentBase &
  FormComponentProps &
  LabeledComponentProps;

// Source hash: 65b54a944fb3f7999913bc1a221daf81c965943e78a270687047f3042930d9d8
