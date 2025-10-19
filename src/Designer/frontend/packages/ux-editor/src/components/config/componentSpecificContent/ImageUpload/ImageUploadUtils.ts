import type { Crop, ErrorProps, RectangleComponent } from './ImageUploadTypes';

export enum SizeOptions {
  Width = 'width',
  Height = 'height',
  Diameter = 'diameter',
}

export enum ShapeOptions {
  Circle = 'circle',
  Rectangle = 'rectangle',
}

export const isRectangleComponent = (cropValues: Crop): cropValues is RectangleComponent =>
  cropValues?.shape === 'rectangle';

export const getInitialValues = (crop?: Crop): Crop => {
  const DEFAULT_VALUE = 250;
  const { width, height, diameter } = (crop || {}) as Partial<{
    width: number;
    height: number;
    diameter: number;
  }>;

  const shape =
    crop?.shape === ShapeOptions.Rectangle ? ShapeOptions.Rectangle : ShapeOptions.Circle;

  return {
    shape,
    width: width ?? DEFAULT_VALUE,
    height: height ?? DEFAULT_VALUE,
    diameter: diameter ?? DEFAULT_VALUE,
  };
};

export const getCropToBeSaved = (tempCrop: Crop): Crop => {
  if (tempCrop.shape === ShapeOptions.Rectangle) {
    return { shape: tempCrop.shape, width: tempCrop.width, height: tempCrop.height };
  }

  return { shape: tempCrop.shape, diameter: tempCrop.diameter };
};

type ValidateCropValuesProps = {
  newCrop: Crop;
  initialCrop?: Crop;
};

export const validateCrop = ({ newCrop }: ValidateCropValuesProps): ErrorProps => {
  const validationResult: ErrorProps = {};

  Object.values(SizeOptions).forEach((key) => {
    const value = newCrop[key] as number;
    const isEmpty = value === null || value === undefined || isNaN(value);
    validationResult[key] = isEmpty ? 'ux_editor.component_properties.crop_size.error' : null;
  });

  return validationResult;
};

type GetDisabledStateProps = {
  errors: ErrorProps;
  tempCrop: Crop;
  initialCrop?: Crop;
};

export const getDisabledState = ({ errors, tempCrop, initialCrop }: GetDisabledStateProps) => {
  const cropToSave = getCropToBeSaved(tempCrop);
  const isCropChanged = JSON.stringify(cropToSave) !== JSON.stringify(initialCrop);
  const hasErrors = Object.keys(cropToSave).some((key) => errors[key] != null);

  return !isCropChanged || hasErrors;
};
