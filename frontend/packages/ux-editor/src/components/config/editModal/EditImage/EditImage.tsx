import React, { useState } from 'react';
import { Alert, Tabs } from '@digdir/designsystemet-react';
import type { IGenericEditComponent } from '@altinn/ux-editor/components/config/componentConfig';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { ImportImage } from './ImportImage';
import { ImageFromUrl } from './ImageFromUrl';
import { PreviewImageSummary } from './PreviewImageSummary/PreviewImageSummary';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useGetAllImageFileNamesQuery } from 'app-shared/hooks/queries/useGetAllImageFileNamesQuery';
import { useTranslation } from 'react-i18next';
import classes from './EditImage.module.css';
import { useDeleteImageMutation } from 'app-shared/hooks/mutations/useDeleteImageMutation';

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
  const imageOriginsFromLibrary = !imageFileNamesArePending && imageFileNames.includes(fileName);

  const handleImageChange = async (imageSource: string, fromUrl: boolean = false) => {
    console.log('fileNames before: ', imageFileNames);
    handleComponentChange({
      ...component,
      image: {
        ...component.image,
        src: {
          ...component.image?.src,
          nb: fromUrl ? imageSource : `wwwroot/${imageSource}`, // How to handle different images for different languages?
        },
      },
    });
    const { data: updatedImageFileNames } = await refetchImageFileNames();
    console.log('fileNames after: ', updatedImageFileNames);
  };
  const handleDeleteImageReference = () => {
    component.image.src = {};
    handleComponentChange({
      ...component,
    });
  };

  const handleDeleteImage = (fileName: string) => {
    handleDeleteImageReference();
    deleteImageFromLibrary(fileName);
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
        {imageOriginsFromLibrary ? (
          <PreviewImageSummary
            existingImageUrl={fileName}
            existingImageDescription={null} // Null until we have a place to store descriptions
            onDeleteImage={handleDeleteImage}
            onDeleteImageReferenceOnly={handleDeleteImageReference}
          />
        ) : (
          <>
            <ImportImage onImageChange={handleImageChange} />
            {component.image?.src?.nb && (
              <Alert size='small'>
                {
                  'Du har allerede referert til en ekstern url. Laster du opp et bilde, vil den eksterne referansen bli slettet.'
                }
              </Alert>
            )}
          </>
        )}
      </Tabs.Content>
      <Tabs.Content value={ImageTab.ExternalUrl} className={classes.urlTab}>
        <ImageFromUrl
          existingImageUrl={imageOriginsFromLibrary ? undefined : component.image?.src?.nb}
          onUrlChange={(imageSrc: string) => handleImageChange(imageSrc, true)}
          onUrlDelete={handleDeleteImageReference}
        />
        {imageOriginsFromLibrary && (
          <Alert size='small'>
            {
              'Du har allerede lastet opp et bilde. Skriver du inn en url, vil bildereferansen din bli slettet.'
            }
          </Alert>
        )}
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
