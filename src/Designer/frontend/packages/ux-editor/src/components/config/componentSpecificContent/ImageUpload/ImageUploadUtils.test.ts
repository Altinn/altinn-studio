import type { Crop, CropValues } from './ImageUploadTypes';
import {
  isRectangleComponent,
  ShapeOptions,
  getInitialValues,
  getCropToBeSaved,
  validateCrop,
  getDisabledState,
} from './ImageUploadUtils';

describe('isRectangleComponent', () => {
  it('should return true for rectangle shape', () => {
    const crop: Crop = { shape: ShapeOptions.Rectangle, width: 100, height: 200 };
    expect(isRectangleComponent(crop)).toBe(true);
  });

  it('should return false for circle shape', () => {
    const crop: Crop = { shape: ShapeOptions.Circle, diameter: 150 };
    expect(isRectangleComponent(crop)).toBe(false);
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
    const crop: Crop = { shape: ShapeOptions.Rectangle, width: 300, height: 400 };
    const result = getInitialValues(crop);
    expect(result).toEqual({
      shape: ShapeOptions.Rectangle,
      width: 300,
      height: 400,
      diameter: 250,
    });
  });

  it('should fill missing values with default', () => {
    const crop: Crop = { shape: ShapeOptions.Circle, diameter: 180 };
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
    const tempCrop: CropValues = {
      shape: ShapeOptions.Rectangle,
      width: 300,
      height: 400,
      diameter: 250,
    };
    const result = getCropToBeSaved(tempCrop);
    expect(result).toEqual({ shape: ShapeOptions.Rectangle, width: 300, height: 400 });
  });

  it('should return diameter for circle shape', () => {
    const tempCrop = { shape: ShapeOptions.Circle, diameter: 180, width: 250, height: 250 };
    const result = getCropToBeSaved(tempCrop);
    expect(result).toEqual({ shape: ShapeOptions.Circle, diameter: 180 });
  });
});

describe('validateCrop', () => {
  it('should return errors for missing size values', () => {
    const newCrop: CropValues = {
      shape: ShapeOptions.Rectangle,
      width: NaN,
      height: 200,
      diameter: undefined,
    };
    const result = validateCrop({ newCrop });
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
    const initialCrop: Crop = { shape: ShapeOptions.Rectangle, width: 100, height: 200 };
    const tempCrop: CropValues = {
      shape: ShapeOptions.Rectangle,
      width: 100,
      height: 200,
    };
    const result = getDisabledState({ errors, tempCrop, initialCrop });
    expect(result).toBe(true);
  });

  it('should be disabled if there are validation errors', () => {
    const errors = { width: 'error', height: null, diameter: null };
    const tempCrop: CropValues = {
      shape: ShapeOptions.Rectangle,
      width: 150,
      height: 200,
    };
    const result = getDisabledState({ errors, tempCrop });
    expect(result).toBe(true);
  });

  it('should not be disabled for crop values that are going to be saved based on shape', () => {
    const errors = { width: null, height: 'error', diameter: null };
    const initialCrop: Crop = { shape: ShapeOptions.Circle, diameter: 150 };
    const tempCrop: CropValues = {
      shape: ShapeOptions.Circle,
      diameter: 200,
      width: 250,
      height: 250,
    };
    const result = getDisabledState({ errors, tempCrop, initialCrop });
    expect(result).toBe(false);
  });
});
