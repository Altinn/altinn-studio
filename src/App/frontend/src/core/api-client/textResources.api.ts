import { appClient } from 'src/core/httpClient';
import type { ITextResourceResult } from 'src/features/language/textResources';

export const textResourcesApi = {
  async fetchTextResources(selectedLanguage: string): Promise<ITextResourceResult> {
    const { data } = await appClient.get<ITextResourceResult>(`/api/v1/texts/${selectedLanguage}`);
    return data;
  },
};

export type TextResourcesApi = typeof textResourcesApi;
