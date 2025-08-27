import type { IAppState, TextResourcesSelector } from '../types/global';
import type { ITextResource } from 'app-shared/types/global';
import { ArrayUtils } from '@studio/pure-functions';

export const getCurrentEditId = (state: IAppState) => state.appData.textResources.currentEditId;

export const textResourcesByLanguageSelector =
  (language: string): TextResourcesSelector<ITextResource[]> =>
  (textResources): ITextResource[] =>
    textResources?.[language] || [];

export const textResourceByLanguageAndIdSelector =
  (language: string, id: string): TextResourcesSelector<ITextResource> =>
  (textResources) =>
    textResourcesByLanguageSelector(language)(textResources).find(
      (textResource) => textResource.id === id,
    );

export const getAllTextResourceIds: TextResourcesSelector<string[]> = (textResources) =>
  ArrayUtils.removeDuplicates(
    textResources
      ? Object.values(textResources).flatMap(
          (resources) => resources?.map((textResource) => textResource.id) || [],
        )
      : [],
  );

// Similar to textResourcesByLanguageSelector, but returns all existing ids, also if they don't exist in the given language
export const allTextResourceIdsWithTextSelector =
  (language: string): TextResourcesSelector<ITextResource[]> =>
  (textResources): ITextResource[] =>
    getAllTextResourceIds(textResources).map(
      (id) => textResourceByLanguageAndIdSelector(language, id)(textResources) ?? { id, value: '' },
    );

export const getAllLanguages: TextResourcesSelector<string[]> = (textResources) =>
  Object.keys(textResources);
