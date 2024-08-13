import React from 'react';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { Card, Heading } from '@digdir/designsystemet-react';
import { StudioParagraph } from '@studio/components';
import { useGetAllImageFileNamesQuery } from 'app-shared/hooks/queries/useGetAllImageFileNamesQuery';
import { imagePath } from 'app-shared/api/paths';
import { useTranslation } from 'react-i18next';
import classes from './ChooseFromLibrary.module.css';

interface ChooseFromLibraryProps {
  onAddImageReference: (fileName: string) => void;
}

export const ChooseFromLibrary = ({ onAddImageReference }: ChooseFromLibraryProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: imagesFileNames } = useGetAllImageFileNamesQuery(org, app);

  return (
    <div className={classes.cardsContainer}>
      {imagesFileNames.length === 0 ? (
        <StudioParagraph>
          {t('ux_editor.properties_panel.images.no_images_in_library')}
        </StudioParagraph>
      ) : (
        imagesFileNames.map((imageFileName) => (
          <div key={imageFileName} className={classes.card}>
            <Card onClick={() => onAddImageReference(imageFileName)}>
              <Card.Media>
                <img src={imagePath(org, app, imageFileName)} alt='' />
              </Card.Media>
              <Card.Header>
                <Heading size='xs' className={classes.fileName} title={imageFileName}>
                  {imageFileName}
                </Heading>
              </Card.Header>
              <Card.Content className={classes.missingFileDescription}>
                {t('ux_editor.properties_panel.images.description_missing')}
              </Card.Content>
            </Card>
          </div>
        ))
      )}
    </div>
  );
};
