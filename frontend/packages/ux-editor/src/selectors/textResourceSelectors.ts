import { IAppState } from '../types/global';
import { removeDuplicates } from 'app-shared/utils/arrayUtils';

export const getAllTextResources = (state: IAppState) => state
  .appData
  .textResources
  .resources;

export const textResourcesByLanguageSelector =
  (language: string) => (state: IAppState) => getAllTextResources(state)[language] || [];

export const textResourceByLanguageAndIdSelector =
  (language: string, id: string) =>
    (state: IAppState) =>
      textResourcesByLanguageSelector(language)(state)
        .find((textResource) => textResource.id === id);

export const getCurrentEditId = (state: IAppState) => state.appData.textResources.currentEditId;

export const getAllTextResourceIds = (state: IAppState) => removeDuplicates(
  Object
    .values(getAllTextResources(state))
    .flatMap((resources) => resources.map((textResource) => textResource.id))
);
