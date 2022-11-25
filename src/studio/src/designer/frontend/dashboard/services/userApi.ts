import { designerApi, TagTypes } from './designerApi';
import type { IRepository } from 'app-shared/types/global';
import { userStarredListPath, userStarredRepoPath } from 'app-shared/api-paths';

export type Organizations = Array<string>;

export const userApi = designerApi.injectEndpoints({
  endpoints: (builder) => ({
    getUserStarredRepos: builder.query<IRepository[], void>({
      query: userStarredListPath,
      providesTags: [
        {
          type: TagTypes.UserStarredRepositories,
        },
      ],
      transformResponse: (response: IRepository[]) => {
        return response.map((repo) => {
          return {
            ...repo,
            user_has_starred: true,
          };
        });
      },
    }),
    setStarredRepo: builder.mutation<void, IRepository>({
      query: (repo) => ({
        url: userStarredRepoPath(repo.owner.login, repo.name),
        method: 'PUT',
      }),
      async onQueryStarted(repo, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          userApi.util.updateQueryData('getUserStarredRepos', undefined, (draft) => {
            draft.push({
              ...repo,
              user_has_starred: true,
            });
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),
    unsetStarredRepo: builder.mutation<void, IRepository>({
      query: (repo) => ({
        url: userStarredRepoPath(repo.owner.login, repo.name),
        method: 'DELETE',
      }),
      async onQueryStarted(repo, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          userApi.util.updateQueryData('getUserStarredRepos', undefined, (draft) => {
            draft.splice(
              draft.findIndex((r) => r.id === repo.id),
              1
            );
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),
  }),
});

export const {
  endpoints,
  useGetUserStarredReposQuery,
  useSetStarredRepoMutation,
  useUnsetStarredRepoMutation,
} = userApi;
