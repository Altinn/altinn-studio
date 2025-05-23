import type { ITextResources } from '../types/global';

export function emptyTextResourceListMock(language: string): ITextResources {
  return {
    language,
    resources: [],
  };
}
