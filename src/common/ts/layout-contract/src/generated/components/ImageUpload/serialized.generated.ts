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
  renderAsSummary?: boolean;
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
  required?: ExprValToActualOrExpr<ExprVal.Boolean>;
  readOnly?: ExprValToActualOrExpr<ExprVal.Boolean>;
  crop?: CropConfig;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings?: IDataModelBindingsSimple;
} & ComponentBase &
  FormComponentProps &
  LabeledComponentProps;

// Source hash: 0652b1792a6cfc8d906f68d0d5db2d97828ce1a02d35aae84631f46be7620521
