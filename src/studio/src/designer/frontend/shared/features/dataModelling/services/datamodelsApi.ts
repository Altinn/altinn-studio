import type { IJsonSchema } from '@altinn/schema-editor/types';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getCookie } from 'app-shared/utils/cookieUtils';
import { sharedUrls } from 'app-shared/utils/urlHelper';
import type { IMetadataOption } from '../functions/types';
import { matchPath } from 'react-router-dom';

const match = matchPath(
  { path: 'editor/:org/:app', caseSensitive: true, end: false },
  window.location.pathname,
);
const { org, app } = match?.params || {};

export enum TagTypes {
  RepositoryType = 'RepositoryType',
}

export interface IDataModelMetadataItem {
  repositoryRelativeUrl: string;
  fileName: string;
  select?: boolean;
}

export enum TagTypes {
  Metadata = 'Metadata',
  JsonSchemaFiles = 'JsonSchema',
  XsdSchemaFiles = 'XsdSchema',
}

export const datamodelsApi = createApi({
  reducerPath: 'datamodelsApi',
  tagTypes: Object.values(TagTypes),
  baseQuery: fetchBaseQuery({
    baseUrl: `${window.location.origin}/designer/api/${org}/${app}/datamodels`,
    prepareHeaders: (headers) => {
      const xsrfToken = getCookie('XSRF-TOKEN');

      headers.set('X-XSRF-TOKEN', xsrfToken);

      return headers;
    },
  }),
  endpoints: (builder) => ({
    getMetadata: builder.query<IMetadataOption[], void>({
      query: () => '',
      providesTags: [TagTypes.Metadata],
      transformResponse: (response) => {
        return (response as IDataModelMetadataItem[]).flatMap(
          (value: IDataModelMetadataItem) => {
            const label = value?.fileName?.split('.schema')[0];
            return label ? { value, label } : [];
          },
        );
      },
    }),
    getMetadataXsd: builder.query<IMetadataOption[], void>({
      query: () => 'xsd',
      providesTags: [TagTypes.Metadata],
      transformResponse: (response) => {
        return (response as IDataModelMetadataItem[]).flatMap(
          (value: IDataModelMetadataItem) => {
            const label = `${value?.fileName?.split('.schema')[0]}  (XSD)`;
            return label ? { value, label } : [];
          },
        );
      },
    }),
    createModel: builder.mutation<IJsonSchema, { body: any }>({
      query: ({ body }) => ({
        url: sharedUrls().createDataModelUrl,
        body,
        method: 'POST',
      }),
      invalidatesTags: [TagTypes.Metadata],
      transformResponse: (response: { data: IJsonSchema }) => response.data,
    }),
  }),
});

export const {
  endpoints,
  useGetMetadataQuery,
  useGetMetadataXsdQuery,
  useCreateModelMutation,
} = datamodelsApi;
