import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export enum TagTypes {
  UserRepositories = 'UserRepositories',
  OrgRepositories = 'OrgRepositories',
  UserStarredRepositories = 'UserStarredRepositories',
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
