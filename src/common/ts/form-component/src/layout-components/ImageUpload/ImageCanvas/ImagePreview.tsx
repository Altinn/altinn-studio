import { Spinner } from '../../../app-components/Spinner';
import { useTranslation } from '../../../LanguageTranslatorProvider';
import classes from './ImagePreview.module.css';
import type { StoredImage } from '../imageUploadUtils';

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
