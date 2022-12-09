import { appApi } from 'src/services/AppApi';
import type { IAppLanguage } from 'src/types/shared';

export const languageApi = appApi.injectEndpoints({
  endpoints: (builder) => ({
    getAppLanguage: builder.query<IAppLanguage[], void>({
      query: () => ({
        url: '/api/v1/applicationlanguages',
        method: 'GET',
      }),
    }),
  }),
});

export const { useGetAppLanguageQuery } = languageApi;
