import React from 'react';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { StudioParagraph } from '@studio/components';
import { useGetAllImageFileNamesQuery } from 'app-shared/hooks/queries/useGetAllImageFileNamesQuery';
import { useTranslation } from 'react-i18next';
import { ImageLibraryPreview } from './ImageLibraryPreview';

interface ChooseFromLibraryProps {
  onAddImageReference: (imageFilePath: string) => void;
}

export const ChooseFromLibrary = ({ onAddImageReference }: ChooseFromLibraryProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: imagesFileNames } = useGetAllImageFileNamesQuery(org, app);

  return imagesFileNames?.length === 0 ? (
    <StudioParagraph>{t('ux_editor.properties_panel.images.no_images_in_library')}</StudioParagraph>
  ) : (
    <ImageLibraryPreview
      imagesFileNames={imagesFileNames}
      onAddImageReference={onAddImageReference}
    />
  );
};
