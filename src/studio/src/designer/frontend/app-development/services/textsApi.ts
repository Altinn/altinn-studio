import { appDevelopmentApi } from './appDevelopmentApi';
import type { Translations } from '@altinn/text-editor';
import { Tags } from './tags';
import { languagesApi } from './languagesApi';

type OrgAppLang = {
  org: string;
  app: string;
  langCode: string;
};

type OrgAppLangData = OrgAppLang & {
  data: Translations;
};

export const textsApi = appDevelopmentApi.injectEndpoints({
  endpoints: (builder) => ({
    getAppTextsByLangCode: builder.query<Translations, OrgAppLang>({
      query: ({ org, app, langCode }) => {
        const url = `v2/${org}/${app}/texts/${langCode}`;

        return {
          url,
        };
      },
      providesTags: (result, error, arg) => {
        return [
          {
            type: Tags.Translations,
            id: arg.langCode,
          },
        ];
      },
    }),
    updateTranslationByLangCode: builder.mutation<void, OrgAppLangData>({
      query: ({ org, app, langCode, data }) => {
        const url = `v2/${org}/${app}/texts/${langCode}`;

        return {
          url,
          method: 'PUT',
          data,
        };
      },
      invalidatesTags: (result, error, arg) => [
        {
          type: Tags.Translations,
          id: arg.langCode,
        },
      ],
      async onQueryStarted({ org, app, langCode, data }, { dispatch, queryFulfilled }) {
        dispatch(
          textsApi.util.updateQueryData('getAppTextsByLangCode', { org, app, langCode }, () => {
            // Optimistically update the store with the updated language data, so UI is updated immediately
            return data;
          })
        );
        try {
          await queryFulfilled;
        } catch {
          dispatch(textsApi.util.invalidateTags([{ type: Tags.Translations, id: langCode }]));
        }
      },
    }),
    deleteByLangCode: builder.mutation<void, OrgAppLang>({
      query: ({ org, app, langCode }) => {
        const url = `v2/${org}/${app}/texts/${langCode}`;

        return {
          url,
          method: 'DELETE',
        };
      },
      async onQueryStarted({ org, app, langCode: deletedLangCode }, { dispatch, queryFulfilled }) {
        dispatch(
          languagesApi.util.updateQueryData('getLanguages', { org, app }, (draft) => {
            return draft.filter((existingLangCode) => existingLangCode !== deletedLangCode);
          })
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
      query: ({ org, app, langCode }) => {
        const url = `v2/${org}/${app}/texts/${langCode}`;

        return {
          url,
          method: 'PUT',
          data: {},
        };
      },
      async onQueryStarted({ org, app, langCode: addedLangCode }, { dispatch, queryFulfilled }) {
        dispatch(
          languagesApi.util.updateQueryData('getLanguages', { org, app }, (draft) => {
            return [...draft, addedLangCode].sort();
          })
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
  endpoints,
  useGetAppTextsByLangCodeQuery,
  useUpdateTranslationByLangCodeMutation,
  useDeleteByLangCodeMutation,
  useAddByLangCodeMutation,
} = textsApi;
