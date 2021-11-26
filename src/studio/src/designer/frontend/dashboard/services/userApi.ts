import { designerApi, TagTypes } from './designerApi';
import { IRepository } from 'app-shared/types';

export type Organizations = Array<string>;

export const userApi = designerApi.injectEndpoints({
  endpoints: (builder) => ({
    getUserRepos: builder.query<IRepository[], void>({
      query: () => `user/repos`,
      providesTags: [
        {
          type: TagTypes.UserRepositories,
        },
      ],
    }),
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

export const { endpoints, useGetUserReposQuery, useGetUserStarredReposQuery } =
  userApi;
