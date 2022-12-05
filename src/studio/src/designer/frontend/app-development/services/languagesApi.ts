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
      query: ({ org, app }) => {
        const url = `v1/${org}/${app}/languages`;
        return {
          url,
        };
      },
      providesTags: () => {
        return [
          {
            type: Tags.DefinedLanguages,
          },
        ];
      },
    }),
  }),
});

export const { endpoints, useGetLanguagesQuery } = languagesApi;
