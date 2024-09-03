import React from 'react';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { Card, Heading } from '@digdir/designsystemet-react';
import { StudioParagraph } from '@studio/components';
import { useGetAllImageFileNamesQuery } from 'app-shared/hooks/queries/useGetAllImageFileNamesQuery';
import { imagePath } from 'app-shared/api/paths';
import { useTranslation } from 'react-i18next';
import classes from './ChooseFromLibrary.module.css';
import { extractFilename } from 'app-shared/utils/filenameUtils';
import { WWWROOT_FILE_PATH } from '../../../RelativeImageSourceIdentifyer';

interface ChooseFromLibraryProps {
  onAddImageReference: (imageFilePath: string) => void;
}

export const ChooseFromLibrary = ({ onAddImageReference }: ChooseFromLibraryProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: imagesFileNames } = useGetAllImageFileNamesQuery(org, app);

  return (
    <div className={classes.cardsContainer}>
      {imagesFileNames?.length === 0 ? (
        <StudioParagraph>
          {t('ux_editor.properties_panel.images.no_images_in_library')}
        </StudioParagraph>
      ) : (
        imagesFileNames.map((imageFilePath) => (
          <ImageFromLibrary
            key={imageFilePath}
            imageFilePath={imageFilePath}
            onAddImageReference={onAddImageReference}
            imageSource={imagePath(org, app, imageFilePath)}
          />
        ))
      )}
    </div>
  );
};

interface ImageFromLibraryProps {
  imageFilePath: string;
  onAddImageReference: (imageFilePath: string) => void;
  imageSource: string;
}

const ImageFromLibrary = ({
  imageFilePath,
  onAddImageReference,
  imageSource,
}: ImageFromLibraryProps) => {
  const { t } = useTranslation();
  // The img component requires an alt which we can set to be the descriptions from the metadata in the library when this is available.
  return (
    <div className={classes.card}>
      <Card onClick={() => onAddImageReference(`${WWWROOT_FILE_PATH}${imageFilePath}`)}>
        <Card.Media>
          <img src={imageSource} alt={imageFilePath} />
        </Card.Media>
        <Card.Header>
          <Heading size='xs' className={classes.fileName} title={extractFilename(imageFilePath)}>
            {extractFilename(imageFilePath)}
          </Heading>
        </Card.Header>
        <Card.Content className={classes.missingFileDescription}>
          {t('ux_editor.properties_panel.images.description_missing')}
        </Card.Content>
      </Card>
    </div>
  );
};
