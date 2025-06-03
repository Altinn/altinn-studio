import type { ITextResource, ITextResources } from 'app-shared/types/global';
import { TextResourceUtils } from '@studio/pure-functions';

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
