import { appDevelopmentApi } from './appDevelopmentApi';
import type { TextResourceFile, TextResourceEntry } from '@altinn/text-editor';
import { Tags } from './tags';
import { languagesApi } from './languagesApi';
import { textResourceIdsPath, textResourcesPath } from 'app-shared/api-paths';
import { TextResourceIdMutation } from '@altinn/text-editor/src/types';
import { HandleServiceInformationActions } from 'app-development/features/administration/handleServiceInformationSlice';

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

export const textsApi = appDevelopmentApi.injectEndpoints({
  endpoints: (builder) => ({
    getAppTextsByLangCode: builder.query<TextResourceFile, OrgAppLang>({
      query: ({ org, app, langCode }) => ({
        url: textResourcesPath(org, app, langCode),
        method: 'GET',
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
        url: textResourcesPath(params.org, params.app, params.langCode),
        method: 'POST',
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
          const changedAppName = data.resources.find(({ id }) => id === 'appName');
          if (changedAppName) {
            const serviceName = changedAppName.value;
            dispatch(HandleServiceInformationActions.updateAppNameWithinState({ serviceName }));
          }
        } catch {
          dispatch(textsApi.util.invalidateTags([{ type: Tags.Translations, id: langCode }]));
        }
      },
    }),
    deleteByLangCode: builder.mutation<void, OrgAppLang>({
      query: ({ org, app, langCode }) => ({
        url: textResourcesPath(org, app, langCode),
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

    addByLangCode: builder.mutation<void, OrgAppLang & { resources: TextResourceEntry[] }>({
      query: (params) => ({
        url: textResourcesPath(params.org, params.app, params.langCode),
        method: 'POST',
        data: {
          language: params.langCode,
          resources: params.resources,
        },
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
    updateTextId: builder.mutation<void, OrgApp & { mutations: TextResourceIdMutation[] }>({
      query: (params) => ({
        url: textResourceIdsPath(params.org, params.app),
        method: 'PUT',
        data: params.mutations,
      }),
      async onQueryStarted({ org, app }, { dispatch, queryFulfilled }) {
        dispatch(
          languagesApi.util.updateQueryData('getLanguages', { org, app }, (draft) =>
            [...draft].sort()
          )
        );
        try {
          await queryFulfilled;
        } catch {
          dispatch(textsApi.util.invalidateTags([{ type: Tags.Translations }]));
        }
      },
      invalidatesTags: () => [
        {
          type: Tags.Translations,
        },
      ],
    }),
  }),
});

export const {
  useGetAppTextsByLangCodeQuery,
  useUpdateTranslationByLangCodeMutation,
  useDeleteByLangCodeMutation,
  useAddByLangCodeMutation,
  useUpdateTextIdMutation,
} = textsApi;
