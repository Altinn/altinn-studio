import React from 'react';

import { Spinner } from '@digdir/designsystemet-react';

import { useLanguage } from 'src/features/language/useLanguage';
import classes from 'src/layout/ImageUpload/ImageCanvas/ImagePreview.module.css';
import type { UploadedAttachment } from 'src/features/attachments';

type ImagePreviewProps = {
  storedImage: UploadedAttachment;
  imageUrl?: string;
};

export function ImagePreview({ storedImage, imageUrl }: ImagePreviewProps) {
  const { langAsString } = useLanguage();

  if (!storedImage.uploaded) {
    return (
      <div className={classes.previewWrapper}>
        <Spinner
          aria-hidden='true'
          data-size='lg'
          aria-label={langAsString('general.loading')}
        />
      </div>
    );
  }

  return (
    <div className={classes.previewWrapper}>
      <img
        src={imageUrl}
        alt={storedImage.data?.filename}
      />
    </div>
  );
}
