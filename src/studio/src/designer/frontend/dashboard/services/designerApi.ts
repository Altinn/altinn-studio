import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getCookie } from 'common/utils/cookieUtils';

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
    prepareHeaders: (headers) => {
      const xsrfToken = getCookie('XSRF-TOKEN');

      headers.set('X-XSRF-TOKEN', xsrfToken);

      return headers;
    },
  }),
  endpoints: () => ({}),
});
