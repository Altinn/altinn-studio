import type {
  ITextResource,
  ITextResources,
  ITextResourcesObjectFormat,
} from 'app-shared/types/global';

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

/**
 * Modifies the text resources object with new text resources in the given language.
 * @param existingResources The existing text resources.
 * @param language The language of which text resources are modified.
 * @param newResources The new text resources in the given language.
 * @returns The modified text resources object.
 */
export const modifyTextResources = (
  existingResources: ITextResources,
  language: string,
  newResources: ITextResource[],
): ITextResources => {
  const newlyCreatedText = newResources.filter(
    (nr) => !existingResources?.[language]?.some((er) => er.id === nr.id),
  );
  const updatedResources =
    existingResources?.[language]?.map((existingResource: ITextResource): ITextResource => {
      const updatedResource = newResources.find(
        (newResource) => existingResource?.id === newResource.id,
      );
      return updatedResource ?? existingResource;
    }) ?? [];
  return {
    ...existingResources,
    [language]: [...newlyCreatedText, ...updatedResources],
  };
};
