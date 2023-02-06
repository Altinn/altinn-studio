import { appDevelopmentApi } from './appDevelopmentApi';
import { Tags } from './tags';
import { textLanguagesPath } from 'app-shared/api-paths';

type LanguageList = string[];
type OrgApp = {
  org: string;
  app: string;
};

export const languagesApi = appDevelopmentApi.injectEndpoints({
  endpoints: (builder) => ({
    getLanguages: builder.query<LanguageList, OrgApp>({
      query: ({ org, app }) => ({
        url: textLanguagesPath(org, app),
        method: 'GET',
      }),
      providesTags: () => [
        {
          type: Tags.DefinedLanguages,
        },
      ],
    }),
  }),
});

export const { endpoints, useGetLanguagesQuery } = languagesApi;
