import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase } from '@app/layout-contract/generated/common.generated';

export type GridJustification =
  'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';

export interface IImage {
  src: IImageSrc;
  width: string;
  align: GridJustification;
}

export interface IImageSrc {
  nb?: string;
  nn?: string;
  en?: string;
  [key: string]: string | undefined;
}

export type CompImageSerialized = {
  type: 'Image';
  textResourceBindings?: {
    altTextImg?: ExprValToActualOrExpr<ExprVal.String>;
    help?: ExprValToActualOrExpr<ExprVal.String>;
  };
  image?: IImage;
  dataModelBindings?: undefined;
} & ComponentBase;

// Source hash: 18f1d69ebf9b363fc68c236e0da8eb5af3fdede1d2e44565edd4fba4b10d963b
