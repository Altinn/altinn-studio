import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export enum TagTypes {
  Repositories = 'Repositories',
  Organizations = 'Organizations',
}

export const designerApi = createApi({
  reducerPath: 'designerApi',
  tagTypes: Object.values(TagTypes),
  baseQuery: fetchBaseQuery({
    baseUrl: `${window.location.origin}/designer/api/v1`,
  }),
  endpoints: () => ({}),
});
