import { Spinner } from '@app/form-component/app-components/Spinner';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import type { StoredImage } from '@app/form-component/layout-components/ImageUpload/imageUploadUtils';

import classes from './ImagePreview.module.css';

type ImagePreviewProps = {
  storedImage: StoredImage;
  imageUrl?: string;
};

export function ImagePreview({ storedImage, imageUrl }: ImagePreviewProps) {
  const { langAsString } = useTranslation();

  if (!storedImage.uploaded) {
    return (
      <div className={classes.previewWrapper}>
        <Spinner aria-hidden='true' data-size='lg' aria-label={langAsString('general.loading')} />
      </div>
    );
  }

  return (
    <div className={classes.previewWrapper}>
      <img src={imageUrl} alt={storedImage.data?.filename} />
    </div>
  );
}
