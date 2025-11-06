import { useComponentPropertyLabel } from '@altinn/ux-editor/hooks';
import type { ExternalCrop } from './ImageUploadTypes';

export const useDisplayCropValues = (cropValues?: ExternalCrop) => {
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
