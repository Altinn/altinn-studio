import { axiosInstance } from 'src/core/axiosInstance';
import type { ITextResourceResult } from 'src/features/language/textResources';

export const textResourcesApi = {
  async fetchTextResources(selectedLanguage: string): Promise<ITextResourceResult> {
    const { data } = await axiosInstance.get<ITextResourceResult>(`/api/v1/texts/${selectedLanguage}`);
    return data;
  },
};

export type TextResourcesApi = typeof textResourcesApi;
