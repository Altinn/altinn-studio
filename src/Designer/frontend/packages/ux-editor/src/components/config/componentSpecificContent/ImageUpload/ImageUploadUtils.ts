import type { ExternalCrop, ErrorProps, InternalCrop, RectangleShape } from './ImageUploadTypes';

export enum SizeOptions {
  Width = 'width',
  Height = 'height',
  Diameter = 'diameter',
}

export enum ShapeOptions {
  Circle = 'circle',
  Rectangle = 'rectangle',
}

export const isRectangleShape = (internalCrop: InternalCrop): internalCrop is RectangleShape =>
  internalCrop?.shape === ShapeOptions.Rectangle;

export const getInitialValues = (crop?: ExternalCrop): ExternalCrop => {
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

export const getCropToBeSaved = (internalCrop: InternalCrop): ExternalCrop => {
  if (internalCrop.shape === ShapeOptions.Rectangle) {
    return { shape: internalCrop.shape, width: internalCrop.width, height: internalCrop.height };
  }

  return { shape: internalCrop.shape, diameter: internalCrop.diameter };
};

export const validateCrop = (newInternalCrop: ExternalCrop): ErrorProps => {
  const validationResult: ErrorProps = {};

  Object.values(SizeOptions).forEach((key) => {
    const value = newInternalCrop[key] as number;
    const isEmpty = value === null || value === undefined || isNaN(value);
    validationResult[key] = isEmpty ? 'ux_editor.component_properties.crop_size.error' : null;
  });

  return validationResult;
};

type GetDisabledStateProps = {
  errors: ErrorProps;
  internalCrop: InternalCrop;
  externalCrop?: ExternalCrop;
};

export const getDisabledState = ({ errors, internalCrop, externalCrop }: GetDisabledStateProps) => {
  const cropToSave = getCropToBeSaved(internalCrop);
  const isCropChanged = JSON.stringify(cropToSave) !== JSON.stringify(externalCrop);
  const hasErrors = Object.keys(cropToSave).some((key) => errors[key] != null);

  return !isCropChanged || hasErrors;
};
