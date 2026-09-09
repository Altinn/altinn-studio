import {
  ComponentBase,
  FormComponentPropsWithRequired,
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
  crop?: CropConfig;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings?: IDataModelBindingsSimple;
} & ComponentBase &
  FormComponentPropsWithRequired &
  SummarizableComponentProps &
  LabeledComponentProps;

// Source hash: 3de1a3e0cfc62d6230ede33cb4d7355edd0c234e7861eb3ae00b72a39280c273
