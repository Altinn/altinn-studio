import React from 'react';
import { Tabs } from '@digdir/designsystemet-react';
import type { IGenericEditComponent } from '@altinn/ux-editor/components/config/componentConfig';
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

export const WWWROOT_FILE_PATH = 'wwwroot/';

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

  const fileName = extractFileNameFromImageSrc(component.image?.src?.nb, org, app);
  const imageOriginsFromLibrary = !imageFileNamesArePending && imageFileNames?.includes(fileName);

  const handleImageChange = async (imageSource: string) => {
    const updatedComponent = updateComponentWithImage(component, imageSource);
    handleComponentChange(updatedComponent);
    await refetchImageFileNames();
  };

  const handleDeleteImageReference = () => {
    const updateComponent = updateComponentWithDeletedImageReference(component);
    handleComponentChange(updateComponent);
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
          componentHasExternalImageReference={!!component.image?.src?.nb}
          fileName={fileName}
          onDeleteImage={handleDeleteImage}
          onDeleteImageReferenceOnly={handleDeleteImageReference}
          onImageChange={handleImageChange}
        />
      </Tabs.Content>
      <Tabs.Content value={ImageTab.ExternalUrl} className={classes.urlTab}>
        <ExternalImage
          existingImageUrl={imageOriginsFromLibrary ? undefined : component.image?.src?.nb}
          onUrlChange={handleImageChange}
          onUrlDelete={handleDeleteImageReference}
          imageOriginsFromLibrary={imageOriginsFromLibrary}
        />
      </Tabs.Content>
    </Tabs>
  );
};
