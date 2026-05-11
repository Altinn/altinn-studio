import type { FormComponentBase } from '@altinn/ux-editor/types/FormComponent';
import type { FormItem } from '@altinn/ux-editor/types/FormItem';
import type { ComponentType } from 'app-shared/types/ComponentType';

export type ExternalCrop = FormItem<ComponentType.ImageUpload>['crop'];
type CircleCrop = Extract<ExternalCrop, { shape: 'circle' }>;
type RectangleCrop = Extract<ExternalCrop, { shape: 'rectangle' }>;

export type RectangleShape = FormComponentBase<ComponentType.ImageUpload> & RectangleCrop;
export type CircleShape = FormComponentBase<ComponentType.ImageUpload> & CircleCrop;
export type ShapeOptions = ExternalCrop['shape'];

// InternalCrop allows all fields (width, height, diameter) at once for editing convenience.
// When saving, it is reduced to the strict Crop type based on shape.
export type InternalCrop = {
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
