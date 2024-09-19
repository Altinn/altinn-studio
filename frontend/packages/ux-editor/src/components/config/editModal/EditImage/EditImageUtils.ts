import type { FormItem } from '../../../../types/FormItem';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { WWWROOT_FILE_PATH } from './constants';

export const updateComponentWithImage = (
  component: FormItem<ComponentType.Image>,
  imageSource: string,
): FormItem<ComponentType.Image> => {
  return {
    ...component,
    image: {
      ...component.image,
      src: {
        ...component.image?.src,
        nb: imageSource, // TODO: How to handle different images for different languages? https://github.com/Altinn/altinn-studio/issues/13579
      },
    },
  };
};

export const updateComponentWithDeletedImageReference = (
  component: FormItem<ComponentType.Image>,
): FormItem<ComponentType.Image> => {
  component.image.src = {};
  return component;
};

export const extractFileNameFromImageSrc = (
  imageSrc: string,
  org: string,
  app: string,
): string | undefined => {
  if (!imageSrc) return '';
  return (
    getFileNameFromRelativeImageSource(org, app, imageSrc) ??
    getFileNameFromWwwRootImageSource(imageSrc)
  );
};

const getFileNameFromRelativeImageSource = (
  org: string,
  app: string,
  imageSrc: string,
): string | undefined => {
  const relativeFilePath = `/${org}/${app}/`;
  const indexOfRelativePathInImageSource: number = imageSrc.indexOf(relativeFilePath);
  const isImageSourceRelative = indexOfRelativePathInImageSource > -1;
  return isImageSourceRelative
    ? imageSrc.slice(indexOfRelativePathInImageSource + relativeFilePath.length)
    : undefined;
};

const getFileNameFromWwwRootImageSource = (imageSrc: string): string | undefined => {
  const indexOfWwwrootInImageSource: number = imageSrc.indexOf(WWWROOT_FILE_PATH);
  const isImageSourceWwwRoot = indexOfWwwrootInImageSource > -1;
  return isImageSourceWwwRoot
    ? imageSrc.slice(indexOfWwwrootInImageSource + WWWROOT_FILE_PATH.length)
    : undefined;
};
