import type React from 'react';

import { calculateMinZoom, validateFile } from 'src/layout/ImageUpload/imageUploadUtils';
import type { CropInternal } from 'src/layout/ImageUpload/imageUploadUtils';

type UseImageUploaderProps = {
  cropArea: CropInternal;
  updateImageState: (args: { minZoom: number; img: HTMLImageElement }) => void;
  setValidationErrors: (errors: string[]) => void;
  imageTypeRef: React.RefObject<string | null>;
};

export function useImageUploader({
  cropArea,
  updateImageState,
  setValidationErrors,
  imageTypeRef,
}: UseImageUploaderProps) {
  const handleFileUpload = (file: File) => {
    const validationErrors = validateFile(file);
    setValidationErrors(validationErrors);
    if (validationErrors.length > 0) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;

      if (typeof result === 'string') {
        const img = new Image();
        img.id = file.name;
        imageTypeRef.current = file.type;
        img.onload = () => {
          updateImageState({ minZoom: calculateMinZoom({ img, cropArea }), img });
        };
        img.src = result;
      }
    };
    reader.readAsDataURL(file);
  };
  return { handleFileUpload };
}
