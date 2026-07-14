import type { ReactNode } from 'react';

import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
import { LabelComponent } from '@app/form-component/layout-components/common/LabelComponent';
import { ImageCropper } from '@app/form-component/layout-components/ImageUpload/ImageCropper';
import { getCropArea } from '@app/form-component/layout-components/ImageUpload/imageUploadUtils';
import type { IGridStyling } from '@app/form-component/app-components/Flex';
import type {
  CropConfig,
  StoredImage,
} from '@app/form-component/layout-components/ImageUpload/imageUploadUtils';

export interface ImageUploadLayoutProps {
  /** The configured component id (Studio "Komponent-ID"). Used for the label's `htmlFor`, the
   * form-content wrapper and the dropzone/aria ids. */
  componentId: string;
  /** The cropping area configuration (shape + size). Defaults to a 250px circle. */
  crop?: CropConfig;
  readOnly?: boolean;
  required?: boolean;
  /** Whether to show the optional marking on the label for non-required fields. */
  showOptionalMarking?: boolean;
  /** Grid sizing for the label. */
  labelGrid?: IGridStyling;
  /** Text-resource key for the label text. When undefined, no label is rendered. */
  title?: string;
  /** Text-resource key for the label help text. */
  help?: string;
  /** Text-resource key for the label description. */
  description?: string;
  /** The currently stored image attachment, if any. Injected by the runtime wrapper. */
  storedImage?: StoredImage;
  /** URL of the stored image, if any. Injected by the runtime wrapper. */
  imageUrl?: string;
  /** Commit a cropped image. The runtime wrapper wires this to the attachment uploader. */
  onSave?: (file: File) => void;
  /** Delete the stored image. The runtime wrapper wires this to the attachment remover. */
  onDelete?: () => void;
  /** Grid sizing for the inner content. */
  innerGrid?: IGridStyling;
  /** Grid sizing for the validation messages. */
  validationGrid?: IGridStyling;
  /**
   * Rendered validation messages. The app owns validation, so it passes the already-rendered
   * messages in rather than this library reaching into app-specific validation state.
   */
  validationMessages?: ReactNode;
}

const noop = () => {};

export function ImageUploadLayout({
  componentId,
  crop,
  readOnly,
  required,
  showOptionalMarking,
  labelGrid,
  title,
  help,
  description,
  storedImage,
  imageUrl,
  onSave = noop,
  onDelete = noop,
  innerGrid,
  validationGrid,
  validationMessages,
}: ImageUploadLayoutProps) {
  return (
    <LabelComponent
      htmlFor={componentId}
      title={title}
      help={help}
      description={description}
      required={required}
      readOnly={readOnly}
      showOptionalMarking={showOptionalMarking}
      grid={labelGrid}
    >
      <ComponentStructure
        componentId={componentId}
        innerGrid={innerGrid}
        validationGrid={validationGrid}
        validationMessages={validationMessages}
      >
        <ImageCropper
          componentId={componentId}
          cropArea={getCropArea(crop)}
          readOnly={!!readOnly}
          storedImage={storedImage}
          imageUrl={imageUrl}
          onSave={onSave}
          onDelete={onDelete}
        />
      </ComponentStructure>
    </LabelComponent>
  );
}
