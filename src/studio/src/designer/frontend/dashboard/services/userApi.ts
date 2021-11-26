import { designerApi, TagTypes } from './designerApi';
import { IRepository } from 'app-shared/types';

export type Organizations = Array<string>;

export const userApi = designerApi.injectEndpoints({
  endpoints: (builder) => ({
    getUserStarredRepos: builder.query<IRepository[], void>({
      query: () => `user/starred`,
      providesTags: [
        {
          type: TagTypes.UserStarredRepositories,
        },
      ],
    }),
  }),
});

export const { endpoints, useGetUserStarredReposQuery } = userApi;
