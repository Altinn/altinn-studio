import type { ITextResource, ITextResources } from 'app-shared/types/global';
import { TextResourceUtils } from '@studio/pure-functions';

export const setTextResourcesForLanguage = (
  existingResources: ITextResources,
  language: string,
  newResources: ITextResource[],
): ITextResources => {
  const utils = TextResourceUtils.fromArray(existingResources?.[language] || []);
  return {
    ...existingResources,
    [language]: utils.prependOrUpdateMultiple(newResources).asArray(),
  };
};
