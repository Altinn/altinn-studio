import { appDevelopmentApi } from './appDevelopmentApi';
import { Tags } from './tags';

type LanguageList = string[];
type OrgApp = {
  org: string;
  app: string;
};

export const languagesApi = appDevelopmentApi.injectEndpoints({
  endpoints: (builder) => ({
    getLanguages: builder.query<LanguageList, OrgApp>({
      query: ({ org, app }) => ({
        url: `/designer/${org}/${app}/Text/GetLanguages`,
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
