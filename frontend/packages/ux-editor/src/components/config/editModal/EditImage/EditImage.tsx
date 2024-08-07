import React, { useState } from 'react';
import { Tabs } from '@digdir/designsystemet-react';
import type { IGenericEditComponent } from '@altinn/ux-editor/components/config/componentConfig';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { ImportImage } from './ImportImage';
import { ImageFromUrl } from './ImageFromUrl';
import { PreviewImageSummary } from './PreviewImageSummary/PreviewImageSummary';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useGetAllImageFileNamesQuery } from 'app-shared/hooks/queries/useGetAllImageFileNamesQuery';

enum ImageTab {
  Import = 'import',
  ExternalUrl = 'externalUrl',
}

export interface EditImageProps extends IGenericEditComponent<ComponentType.Image> {}

export const EditImage = ({ component, handleComponentChange }: EditImageProps) => {
  const [tab, setTab] = useState<string>(ImageTab.Import);
  const { org, app } = useStudioEnvironmentParams();
  const {
    data: imageFileNames,
    isPending: imageFileNamesArePending,
    refetch: refetchImageFileNames,
  } = useGetAllImageFileNamesQuery(org, app);

  const fileName = extractFileNameFromImageSrc(component.image?.src?.nb, org, app);

  const imageOriginsFromLibrary = !imageFileNamesArePending && imageFileNames.includes(fileName);

  const handleImageChange = (imageSource: string, fromUrl: boolean = false) => {
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
    refetchImageFileNames();
  };
  const handleImageDelete = () => {
    component.image.src = {};
    handleComponentChange({
      ...component,
    });
  };

  if (!imageFileNamesArePending) {
    console.log('image names: ', imageFileNames);
  }

  return (
    <Tabs size='small' value={tab} onChange={setTab}>
      <Tabs.List>
        <Tabs.Tab value={ImageTab.Import}>{'Legg til bilde'}</Tabs.Tab>
        <Tabs.Tab value={ImageTab.ExternalUrl}>{'Lim inn en URL'}</Tabs.Tab>
      </Tabs.List>
      <Tabs.Content value={ImageTab.Import}>
        {imageOriginsFromLibrary ? (
          <PreviewImageSummary
            existingImageUrl={fileName}
            existingImageDescription={null} // Where should this come from? What actually is the library?
            onDeleteImage={handleImageDelete}
          />
        ) : (
          <ImportImage onImageChange={handleImageChange} />
        )}
      </Tabs.Content>
      <Tabs.Content value={ImageTab.ExternalUrl}>
        <ImageFromUrl
          existingImageUrl={imageOriginsFromLibrary ? undefined : component.image?.src?.nb}
          onUrlChange={(imageSrc: string) => handleImageChange(imageSrc, true)}
          onUrlDelete={handleImageDelete}
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
