import {
  ComponentBase,
  FormComponentProps,
  LabeledComponentProps,
  SummarizableComponentProps,
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
  required?: ExprValToActualOrExpr<ExprVal.Boolean>;
  readOnly?: ExprValToActualOrExpr<ExprVal.Boolean>;
  crop?: CropConfig;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings?: IDataModelBindingsSimple;
} & ComponentBase &
  FormComponentProps &
  SummarizableComponentProps &
  LabeledComponentProps;

// Source hash: 904acd161fb4ac00ce2e643503d40f4c13bd703e85611fe652bb7990b0b7579d
