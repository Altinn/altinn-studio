import { designerApi, TagTypes } from './designerApi';

export enum RepositoryType {
  Unknown = 'Unknown',
  App = 'App',
  Datamodels = 'Datamodels',
}

export const repositoryApi = designerApi.injectEndpoints({
  endpoints: (builder) => ({
    getRepositoryType: builder.query<RepositoryType, void>({
      query: () => 'repos/repositoryType',
      providesTags: [TagTypes.RepositoryType],
    }),
  }),
});

export const { endpoints, useGetRepositoryTypeQuery } = repositoryApi;
