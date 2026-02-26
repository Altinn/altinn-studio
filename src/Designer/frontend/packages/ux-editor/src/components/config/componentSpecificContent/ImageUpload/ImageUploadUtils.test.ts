import type { ExternalCrop, InternalCrop } from './ImageUploadTypes';
import {
  isRectangleShape,
  ShapeOptions,
  getInitialValues,
  getCropToBeSaved,
  validateCrop,
  getDisabledState,
} from './ImageUploadUtils';

describe('isRectangleComponent', () => {
  it('should return true for rectangle shape', () => {
    const crop: ExternalCrop = { shape: ShapeOptions.Rectangle, width: 100, height: 200 };
    expect(isRectangleShape(crop)).toBe(true);
  });

  it('should return false for circle shape', () => {
    const crop: ExternalCrop = { shape: ShapeOptions.Circle, diameter: 150 };
    expect(isRectangleShape(crop)).toBe(false);
  });
});

describe('getInitialValues', () => {
  it('should return default values when no crop is provided', () => {
    const result = getInitialValues();
    expect(result).toEqual({
      shape: ShapeOptions.Circle,
      width: 250,
      height: 250,
      diameter: 250,
    });
  });

  it('should return provided crop values', () => {
    const crop: ExternalCrop = { shape: ShapeOptions.Rectangle, width: 300, height: 400 };
    const result = getInitialValues(crop);
    expect(result).toEqual({
      shape: ShapeOptions.Rectangle,
      width: 300,
      height: 400,
      diameter: 250,
    });
  });

  it('should fill missing values with default', () => {
    const crop: ExternalCrop = { shape: ShapeOptions.Circle, diameter: 180 };
    const result = getInitialValues(crop);
    expect(result).toEqual({
      shape: ShapeOptions.Circle,
      width: 250,
      height: 250,
      diameter: 180,
    });
  });
});

describe('getCropToBeSaved', () => {
  it('should return width and height for rectangle shape', () => {
    const internalCrop: InternalCrop = {
      shape: ShapeOptions.Rectangle,
      width: 300,
      height: 400,
      diameter: 250,
    };
    const result = getCropToBeSaved(internalCrop);
    expect(result).toEqual({ shape: ShapeOptions.Rectangle, width: 300, height: 400 });
  });

  it('should return diameter for circle shape', () => {
    const internalCrop = { shape: ShapeOptions.Circle, diameter: 180, width: 250, height: 250 };
    const result = getCropToBeSaved(internalCrop);
    expect(result).toEqual({ shape: ShapeOptions.Circle, diameter: 180 });
  });
});

describe('validateCrop', () => {
  it('should return errors for missing size values', () => {
    const newCrop: InternalCrop = {
      shape: ShapeOptions.Rectangle,
      width: NaN,
      height: 200,
      diameter: undefined,
    };
    const result = validateCrop(newCrop);
    expect(result).toEqual({
      width: 'ux_editor.component_properties.crop_size.error',
      height: null,
      diameter: 'ux_editor.component_properties.crop_size.error',
    });
  });
});

describe('getDisabledState', () => {
  it('should be disabled if there are no changes', () => {
    const errors = { width: null, height: null, diameter: null };
    const externalCrop: ExternalCrop = { shape: ShapeOptions.Rectangle, width: 100, height: 200 };
    const internalCrop: InternalCrop = {
      shape: ShapeOptions.Rectangle,
      width: 100,
      height: 200,
    };
    const result = getDisabledState({ errors, internalCrop, externalCrop });
    expect(result).toBe(true);
  });

  it('should be disabled if there are validation errors', () => {
    const errors = { width: 'error', height: null, diameter: null };
    const internalCrop: InternalCrop = {
      shape: ShapeOptions.Rectangle,
      width: 150,
      height: 200,
    };
    const result = getDisabledState({ errors, internalCrop });
    expect(result).toBe(true);
  });

  it('should not be disabled for crop values that are going to be saved based on shape', () => {
    const errors = { width: null, height: 'error', diameter: null };
    const externalCrop: ExternalCrop = { shape: ShapeOptions.Circle, diameter: 150 };
    const internalCrop: InternalCrop = {
      shape: ShapeOptions.Circle,
      diameter: 200,
      width: 250,
      height: 250,
    };
    const result = getDisabledState({ errors, internalCrop, externalCrop });
    expect(result).toBe(false);
  });
});
