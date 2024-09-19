import React from 'react';
import { Tabs } from '@digdir/designsystemet-react';
import type { IGenericEditComponent } from '../../../config/componentConfig';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useGetAllImageFileNamesQuery } from 'app-shared/hooks/queries/useGetAllImageFileNamesQuery';
import { useTranslation } from 'react-i18next';
import classes from './EditImage.module.css';
import { useDeleteImageMutation } from 'app-shared/hooks/mutations/useDeleteImageMutation';
import { LocalImage } from './LocalImage';
import { ExternalImage } from './ExternalImage';
import {
  extractFileNameFromImageSrc,
  updateComponentWithDeletedImageReference,
  updateComponentWithImage,
} from './EditImageUtils';

enum ImageTab {
  Import = 'import',
  ExternalUrl = 'externalUrl',
}

export interface EditImageProps extends IGenericEditComponent<ComponentType.Image> {}

export const EditImage = ({ component, handleComponentChange }: EditImageProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const {
    data: imageFileNames,
    isPending: imageFileNamesArePending,
    refetch: refetchImageFileNames,
  } = useGetAllImageFileNamesQuery(org, app);
  const { mutate: deleteImageFromLibrary } = useDeleteImageMutation(org, app);

  const imageSrcNb = component.image?.src?.nb;
  const fileName = extractFileNameFromImageSrc(imageSrcNb, org, app);
  const imageOriginsFromLibrary = !imageFileNamesArePending && imageFileNames?.includes(fileName);

  const handleImageChange = async (imageSource: string) => {
    const updatedComponent = updateComponentWithImage(component, imageSource);
    handleComponentChange(updatedComponent);
    await refetchImageFileNames();
  };

  const handleDeleteImageReference = () => {
    const updatedComponent = updateComponentWithDeletedImageReference(component);
    handleComponentChange(updatedComponent);
  };

  const handleDeleteImage = (fileNameToDelete: string) => {
    handleDeleteImageReference();
    deleteImageFromLibrary(fileNameToDelete);
  };

  return (
    <Tabs size='small' defaultValue={ImageTab.Import}>
      <Tabs.List>
        <Tabs.Tab value={ImageTab.Import}>
          {t('ux_editor.properties_panel.images.add_image_tab_title')}
        </Tabs.Tab>
        <Tabs.Tab value={ImageTab.ExternalUrl}>
          {t('ux_editor.properties_panel.images.enter_external_url_tab_title')}
        </Tabs.Tab>
      </Tabs.List>
      <Tabs.Content value={ImageTab.Import}>
        <LocalImage
          componentHasExternalImageReference={!!imageSrcNb}
          fileName={fileName}
          onDeleteImage={handleDeleteImage}
          onDeleteImageReferenceOnly={handleDeleteImageReference}
          onImageChange={handleImageChange}
        />
      </Tabs.Content>
      <Tabs.Content value={ImageTab.ExternalUrl} className={classes.urlTab}>
        <ExternalImage
          existingImageUrl={imageOriginsFromLibrary ? undefined : imageSrcNb}
          onUrlChange={handleImageChange}
          onUrlDelete={handleDeleteImageReference}
          imageOriginsFromLibrary={imageOriginsFromLibrary}
        />
      </Tabs.Content>
    </Tabs>
  );
};
