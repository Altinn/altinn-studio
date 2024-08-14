import React, { useState } from 'react';
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

enum ImageTab {
  Import = 'import',
  ExternalUrl = 'externalUrl',
}

export interface EditImageProps extends IGenericEditComponent<ComponentType.Image> {}

export const EditImage = ({ component, handleComponentChange }: EditImageProps) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<string>(ImageTab.Import);
  const { org, app } = useStudioEnvironmentParams();
  const {
    data: imageFileNames,
    isPending: imageFileNamesArePending,
    refetch: refetchImageFileNames,
  } = useGetAllImageFileNamesQuery(org, app);
  const { mutate: deleteImageFromLibrary } = useDeleteImageMutation(org, app);

  const fileName = extractFileNameFromImageSrc(component.image?.src?.nb, org, app);
  const imageOriginsFromLibrary = !imageFileNamesArePending && imageFileNames?.includes(fileName);

  const handleImageChange = async (imageSource: string, fromUrl: boolean = false) => {
    const updatedComponent = updateComponentWithImage(
      fromUrl ? imageSource : `wwwroot/${imageSource}`,
    );
    handleComponentChange(updatedComponent);
    await refetchImageFileNames();
  };
  const updateComponentWithImage = (imageSource: string) => {
    return {
      ...component,
      image: {
        ...component.image,
        src: {
          ...component.image?.src,
          nb: imageSource, // How to handle different images for different languages?
        },
      },
    };
  };
  const handleDeleteImageReference = () => {
    component.image.src = {};
    handleComponentChange({
      ...component,
    });
  };

  const handleDeleteImage = (fileNameToDelete: string) => {
    handleDeleteImageReference();
    deleteImageFromLibrary(fileNameToDelete);
  };

  return (
    <Tabs size='small' value={tab} onChange={setTab}>
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
          imageOriginsFromLibrary={imageOriginsFromLibrary}
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
          onUrlChange={(imageSrc: string) => handleImageChange(imageSrc, true)}
          onUrlDelete={handleDeleteImageReference}
          imageOriginsFromLibrary={imageOriginsFromLibrary}
        />
      </Tabs.Content>
    </Tabs>
  );
};

const extractFileNameFromImageSrc = (imageSrc: string, org: string, app: string) => {
  if (!imageSrc) return '';
  const relativeFilePath = `/${org}/${app}/`;
  const wwwroot = 'wwwroot/';
  const indexOfRelativePath: number = imageSrc.indexOf(relativeFilePath);
  const indexOfWwwroot: number = imageSrc.indexOf(wwwroot);
  if (indexOfRelativePath > -1)
    return imageSrc.slice(indexOfRelativePath + relativeFilePath.length);
  if (indexOfWwwroot > -1) return imageSrc.slice(indexOfRelativePath + wwwroot.length + 1); // why do I need this +1
  return imageSrc; // What to return?
};
