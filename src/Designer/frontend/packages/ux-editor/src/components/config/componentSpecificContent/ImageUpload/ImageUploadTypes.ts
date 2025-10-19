import type { FormComponentBase } from '@altinn/ux-editor/types/FormComponent';
import type { FormItem } from '@altinn/ux-editor/types/FormItem';
import type { ComponentType } from 'app-shared/types/ComponentType';

export type Crop = FormItem<ComponentType.ImageUpload>['crop'];
type CircleCrop = Extract<Crop, { shape: 'circle' }>;
type RectangleCrop = Extract<Crop, { shape: 'rectangle' }>;

export type RectangleComponent = FormComponentBase<ComponentType.ImageUpload> & RectangleCrop;
export type CircleComponent = FormComponentBase<ComponentType.ImageUpload> & CircleCrop;
export type ShapeOptions = Crop['shape'];

export type CropValues = {
  shape: ShapeOptions;
  diameter?: number;
  width?: number;
  height?: number;
};

export type ErrorProps = {
  width?: string;
  height?: string;
  diameter?: string;
};
