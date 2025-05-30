import type { ITextResource, ITextResources, ITextResourcesWithLanguage } from '../types/global';
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

export const updateEntireLanguage = (
  current: ITextResources,
  { language, resources }: ITextResourcesWithLanguage,
): ITextResources => ({ ...current, [language]: resources });
