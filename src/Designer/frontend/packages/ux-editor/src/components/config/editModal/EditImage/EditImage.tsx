import { useState } from 'react';
import type { IGenericEditComponent } from '../../../config/componentConfig';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useGetAllImageFileNamesQuery } from 'app-shared/hooks/queries/useGetAllImageFileNamesQuery';
import { useTranslation } from 'react-i18next';
import { useDeleteImageMutation } from 'app-shared/hooks/mutations/useDeleteImageMutation';
import { LocalImage } from './LocalImage';
import { ExternalImage } from './ExternalImage';
import {
  extractFileNameFromImageSrc,
  updateComponentWithDeletedImageReference,
  updateComponentWithImage,
} from './EditImageUtils';
import { StudioTabs } from '@studio/components';

enum ImageTab {
  Import = 'import',
  ExternalUrl = 'externalUrl',
}

export interface EditImageProps extends IGenericEditComponent<ComponentType.Image> {}

export const EditImage = ({ component, handleComponentChange }: EditImageProps) => {
  const { t } = useTranslation();
  const [selectedTab, setSelectedTab] = useState<ImageTab>(ImageTab.Import);
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
    <StudioTabs value={selectedTab} onChange={(tab: ImageTab) => setSelectedTab(tab)}>
      <StudioTabs.List>
        <StudioTabs.Tab value={ImageTab.Import}>
          {t('ux_editor.properties_panel.images.add_image_tab_title')}
        </StudioTabs.Tab>
        <StudioTabs.Tab value={ImageTab.ExternalUrl}>
          {t('ux_editor.properties_panel.images.enter_external_url_tab_title')}
        </StudioTabs.Tab>
      </StudioTabs.List>
      {selectedTab === ImageTab.Import && (
        <StudioTabs.Panel value={ImageTab.Import}>
          <LocalImage
            componentHasExternalImageReference={!!imageSrcNb}
            fileName={fileName}
            onDeleteImage={handleDeleteImage}
            onDeleteImageReferenceOnly={handleDeleteImageReference}
            onImageChange={handleImageChange}
          />
        </StudioTabs.Panel>
      )}
      {selectedTab === ImageTab.ExternalUrl && (
        <StudioTabs.Panel value={ImageTab.ExternalUrl}>
          <ExternalImage
            existingImageUrl={imageOriginsFromLibrary ? undefined : imageSrcNb}
            onUrlChange={handleImageChange}
            onUrlDelete={handleDeleteImageReference}
            imageOriginsFromLibrary={imageOriginsFromLibrary}
          />
        </StudioTabs.Panel>
      )}
    </StudioTabs>
  );
};
