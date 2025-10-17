import type { ReactElement } from 'react';
import React from 'react';
import classes from './ImagesPage.module.css';
import { Alert } from '@digdir/designsystemet-react';
import { StudioHeading } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { InfoBox } from '../../InfoBox';
import { PageName } from '../../../../types/PageName';

export type Image = {
  title: string;
  imageSrc: string;
};

export type ImagesPageProps = {
  images: Image[];
  onUpdateImage: (updatedImage: Image) => void;
};

export function ImagesPage({ images, onUpdateImage }: ImagesPageProps): ReactElement {
  const { t } = useTranslation();

  const noExistingImages = images.length === 0;

  return (
    <div>
      <StudioHeading level={3} spacing>
        {t('app_content_library.images.page_name')}
      </StudioHeading>
      {noExistingImages ? (
        <div className={classes.noImagesWrapper}>
          <Alert size='small'>{t('app_content_library.images.coming_soon')}</Alert>
          <InfoBox pageName={PageName.Images} />
        </div>
      ) : (
        images.map((image) => (
          <div key={image.title}>
            <img src={image.imageSrc} alt={image.title} />
            {image.title}
            <button onClick={() => onUpdateImage(image)}>Oppdater bilde</button>
          </div>
        ))
      )}
    </div>
  );
}
