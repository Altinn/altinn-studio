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
  const { data: imageFileNames, isPending: imageFileNamesArePending } =
    useGetAllImageFileNamesQuery(org, app);

  const imageOriginsFromLibrary =
    !imageFileNamesArePending && imageFileNames.includes(component.image?.src?.nb);

  const handleImageChange = (imageSource: string) => {
    handleComponentChange({
      ...component,
      image: {
        ...component.image,
        src: {
          ...component.image?.src,
          nb: imageSource, // How to handle different images for different languages?
        },
      },
    });
  };
  const handleImageDelete = () => {
    delete component.image;
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
            existingImageUrl={component.image?.src?.nb}
            existingImageDescription={component.image?.src?.nb}
            onDeleteImage={handleImageDelete}
          />
        ) : (
          <ImportImage onImageChange={handleImageChange} />
        )}
      </Tabs.Content>
      <Tabs.Content value={ImageTab.ExternalUrl}>
        <ImageFromUrl
          existingImageUrl={imageOriginsFromLibrary ? undefined : component.image?.src?.nb}
          onUrlChange={handleImageChange}
          onUrlDelete={handleImageDelete}
        />
      </Tabs.Content>
    </Tabs>
  );
};
