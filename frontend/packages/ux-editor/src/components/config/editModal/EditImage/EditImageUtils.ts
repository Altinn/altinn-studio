import type { FormItem } from '@altinn/ux-editor/types/FormItem';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { WWWROOT_FILE_PATH } from './EditImage';

export const updateComponentWithImage = (
  component: FormItem<ComponentType.Image>,
  imageSource: string,
) => {
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

export const updateComponentWithDeletedImageReference = (
  component: FormItem<ComponentType.Image>,
) => {
  component.image.src = {};
  return component;
};

export const extractFileNameFromImageSrc = (imageSrc: string, org: string, app: string) => {
  if (!imageSrc) return '';
  const relativeFilePath = `/${org}/${app}/`;
  const indexOfRelativePathInImageSource: number = imageSrc.indexOf(relativeFilePath);
  const indexOfWwwrootInImageSource: number = imageSrc.indexOf(WWWROOT_FILE_PATH);
  if (indexOfRelativePathInImageSource > -1)
    return imageSrc.slice(indexOfRelativePathInImageSource + relativeFilePath.length);
  if (indexOfWwwrootInImageSource > -1)
    return imageSrc.slice(indexOfWwwrootInImageSource + WWWROOT_FILE_PATH.length);
  return undefined;
};
