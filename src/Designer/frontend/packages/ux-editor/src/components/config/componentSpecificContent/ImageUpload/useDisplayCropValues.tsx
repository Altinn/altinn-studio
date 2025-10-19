import { useComponentPropertyLabel } from '@altinn/ux-editor/hooks';
import type { Crop } from './ImageUploadTypes';

export const useDisplayCropValues = (cropValues?: Crop) => {
  const componentPropertyLabel = useComponentPropertyLabel();
  if (!cropValues) return null;

  return Object.entries(cropValues)
    .map(([key, value]) => {
      if (key === 'shape') {
        return componentPropertyLabel(`crop_${value}`);
      }
      return value;
    })
    .join(', ');
};
