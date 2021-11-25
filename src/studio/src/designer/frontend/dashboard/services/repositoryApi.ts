import { designerApi, TagTypes } from './designerApi';
import { IRepository } from 'app-shared/types';

export type Organizations = Array<string>;

export const repositoryApi = designerApi.injectEndpoints({
  endpoints: (builder) => ({
    getUserRepos: builder.query<IRepository[], void>({
      query: () => `Repository/UserRepos`,
      providesTags: [
        {
          type: TagTypes.Repositories,
        },
      ],
    }),
  }),
});

export const { endpoints, useGetUserReposQuery } = repositoryApi;
