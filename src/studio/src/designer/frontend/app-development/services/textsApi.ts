import { appDevelopmentApi } from './appDevelopmentApi';
import type { TextResourceFile } from '@altinn/text-editor';
import { Tags } from './tags';
import { languagesApi } from './languagesApi';
import { textResourcesPath } from 'app-shared/api-paths';

type OrgApp = {
  org: string;
  app: string;
};

type OrgAppLang = OrgApp & {
  langCode: string;
};

type OrgAppLangData = OrgAppLang & {
  data: TextResourceFile;
};

const textIdUrl = ({ org, app }) => `/designer/api/v1/${org}/${app}/keys`;
const languageFileUrl = ({ org, app, langCode }) => `/designer/api/v2/${org}/${app}/texts/${langCode}`;

export const textsApi = appDevelopmentApi.injectEndpoints({
  endpoints: (builder) => ({
    getAppTextIds: builder.query<string[], OrgApp>({
      query: (params) => ({
        url: textIdUrl(params),
      }),
      providesTags: (result, error, arg) => [
        {
          type: Tags.TextIds,
          id: arg.app,
        },
      ],
    }),
    getAppTextsByLangCode: builder.query<TextResourceFile, OrgAppLang>({
      query: ({ org, app, langCode }) => ({
        url: textResourcesPath(org, app, langCode),
      }),
      providesTags: (result, error, arg) => [
        {
          type: Tags.Translations,
          id: arg.langCode,
        },
      ],
    }),
    updateTranslationByLangCode: builder.mutation<void, OrgAppLangData>({
      query: ({ data, ...params }) => ({
        url: languageFileUrl(params),
        method: 'PUT',
        data,
      }),
      invalidatesTags: (result, error, arg) => [
        {
          type: Tags.Translations,
          id: arg.langCode,
        },
      ],
      async onQueryStarted({ org, app, langCode, data }, { dispatch, queryFulfilled }) {
        dispatch(
          // Optimistically update the store with the updated language data, so UI is updated immediately
          textsApi.util.updateQueryData('getAppTextsByLangCode', { org, app, langCode }, () => data)
        );
        try {
          await queryFulfilled;
        } catch {
          dispatch(textsApi.util.invalidateTags([{ type: Tags.Translations, id: langCode }]));
        }
      },
    }),
    deleteByLangCode: builder.mutation<void, OrgAppLang>({
      query: (params) => ({
        url: languageFileUrl(params),
        method: 'DELETE',
      }),
      async onQueryStarted({ org, app, langCode: deletedLangCode }, { dispatch, queryFulfilled }) {
        dispatch(
          languagesApi.util.updateQueryData('getLanguages', { org, app }, (draft) =>
            draft.filter((existingLangCode) => existingLangCode !== deletedLangCode)
          )
        );
        try {
          await queryFulfilled;
        } catch {
          dispatch(
            textsApi.util.invalidateTags([{ type: Tags.Translations, id: deletedLangCode }])
          );
          dispatch(languagesApi.util.invalidateTags([{ type: Tags.DefinedLanguages }]));
        }
      },
      invalidatesTags: (result, error, arg) => [
        {
          type: Tags.Translations,
          id: arg.langCode,
        },
        {
          type: Tags.DefinedLanguages,
        },
      ],
    }),
    addByLangCode: builder.mutation<void, OrgAppLang>({
      query: (params) => ({
        url: languageFileUrl(params),
        method: 'PUT',
        data: {},
      }),
      async onQueryStarted({ org, app, langCode: addedLangCode }, { dispatch, queryFulfilled }) {
        dispatch(
          languagesApi.util.updateQueryData('getLanguages', { org, app }, (draft) =>
            [...draft, addedLangCode].sort()
          )
        );
        try {
          await queryFulfilled;
        } catch {
          dispatch(textsApi.util.invalidateTags([{ type: Tags.Translations }]));
          dispatch(languagesApi.util.invalidateTags([{ type: Tags.DefinedLanguages }]));
        }
      },
      invalidatesTags: (result, error, arg) => [
        {
          type: Tags.Translations,
          id: arg.langCode,
        },
        {
          type: Tags.DefinedLanguages,
        },
      ],
    }),
  }),
});

export const {
  useGetAppTextIdsQuery,
  useGetAppTextsByLangCodeQuery,
  useUpdateTranslationByLangCodeMutation,
  useDeleteByLangCodeMutation,
  useAddByLangCodeMutation,
} = textsApi;
