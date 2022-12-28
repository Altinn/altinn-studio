import { IAppState } from '../types/global';

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
