import { renderHook } from '@testing-library/react';
import { useDisplayCropValues } from './useDisplayCropValues';
import type { ExternalCrop } from './ImageUploadTypes';

describe('useDisplayCropValues', () => {
  it('should return null when no crop values are provided', () => {
    const { result } = renderHook(() => useDisplayCropValues());
    expect(result.current).toBeNull();
  });

  it('should format crop values correctly', () => {
    const cropValues: ExternalCrop = {
      shape: 'rectangle',
      width: 200,
      height: 100,
    };
    const { result } = renderHook(() => useDisplayCropValues(cropValues));
    expect(result.current).toBe(
      '[mockedText(ux_editor.component_properties.crop_rectangle)], 200, 100',
    );
  });
});
