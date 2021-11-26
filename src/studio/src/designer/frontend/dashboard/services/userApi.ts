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
    setStarredRepo: builder.mutation<void, IRepository>({
      query: (repo => ({
        url: `user/starred/${repo.owner.login}/${repo.name}`,
        method: 'PUT'
      })),
      async onQueryStarted(repo, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          userApi.util.updateQueryData('getUserStarredRepos', undefined, (draft) => {
            draft.push(repo);
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      }
    }),
    unsetStarredRepo: builder.mutation<void, IRepository>({
      query: (repo => ({
        url: `user/starred/${repo.owner.login}/${repo.name}`,
        method: 'DELETE'
      })),
      async onQueryStarted(repo, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          userApi.util.updateQueryData('getUserStarredRepos', undefined, (draft) => {
            draft.splice(draft.findIndex((r) => r.id === repo.id), 1);
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      }
    })
  }
  ),
});

export const { endpoints, useGetUserReposQuery, useGetUserStarredReposQuery, useSetStarredRepoMutation, useUnsetStarredRepoMutation } =
  userApi;
