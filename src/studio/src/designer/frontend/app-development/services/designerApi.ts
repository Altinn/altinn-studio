import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getCookie } from 'app-shared/utils/cookieUtils';
import { matchPath } from 'react-router-dom';

const match = matchPath(
  { path: '/editor/:org/:app', caseSensitive: true, end: false },
  window.location.pathname,
);
const { org, app } = match?.params || {};

export enum TagTypes {
  RepositoryType = 'RepositoryType',
}

export const designerApi = createApi({
  reducerPath: 'designerApi',
  tagTypes: Object.values(TagTypes),
  baseQuery: fetchBaseQuery({
    baseUrl: `${window.location.origin}/designer/api/v1/${org}/${app}`,
    prepareHeaders: (headers) => {
      const xsrfToken = getCookie('XSRF-TOKEN');

      headers.set('X-XSRF-TOKEN', xsrfToken);

      return headers;
    },
  }),
  endpoints: () => ({}),
});
