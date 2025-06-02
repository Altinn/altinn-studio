import type {
  ITextResource,
  ITextResources,
  ITextResourcesObjectFormat,
} from 'app-shared/types/global';
import { TextResourceUtils } from '@studio/pure-functions';

/**
 * Converts an array of text resources in the ITextResource format to an object with id as key and value as value.
 * @param textResources The text resources as an array of ITextResource.
 * @returns The text resources as an ITextResourcesObjectFormat object.
 */
export const convertTextResourcesArrayToObject = (
  textResources: ITextResource[],
): ITextResourcesObjectFormat =>
  Object.fromEntries(textResources.map((textResource) => [textResource.id, textResource.value]));

/**
 * Converts an object of text resources to an array of text resources in the ITextResource format.
 * @param textResources The text resources as an ITextResourcesObjectFormat object.
 * @returns The text resources as an array of ITextResource.
 */
export const convertTextResourcesObjectToArray = (
  textResources: ITextResourcesObjectFormat,
): ITextResource[] => Object.entries(textResources).map(([id, value]) => ({ id, value }));

export const setTextResourcesForLanguage = (
  existingResources: ITextResources,
  language: string,
  newResources: ITextResource[],
): ITextResources => {
  const updatedTextResources = TextResourceUtils.fromArray(existingResources?.[language] || [])
    .prependOrUpdateMultiple(newResources)
    .asArray();
  return {
    ...existingResources,
    [language]: updatedTextResources,
  };
};
