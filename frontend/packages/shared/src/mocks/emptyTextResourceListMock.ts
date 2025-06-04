import type { ITextResourcesWithLanguage } from '../types/global';

export function emptyTextResourceListMock(language: string): ITextResourcesWithLanguage {
  return {
    language,
    resources: [],
  };
}
