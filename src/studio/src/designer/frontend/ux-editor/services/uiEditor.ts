import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getFetchUIEditorBaseUrl } from '../utils/urlHelper';

export const uiEditorApi = createApi({
  reducerPath: 'uiEditor',
  baseQuery: fetchBaseQuery({ baseUrl: getFetchUIEditorBaseUrl()}),
  endpoints: (builder) => ({
    getJSON: builder.query({
      query: (id) => `${id}`
    }),
  }),
});

export const { useGetJSONQuery } = uiEditorApi
