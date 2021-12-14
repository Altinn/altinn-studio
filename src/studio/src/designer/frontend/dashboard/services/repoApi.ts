import { designerApi, TagTypes } from './designerApi';
import { IRepository } from 'app-shared/types';

type Filters = {
  uid?: number;
  keyword?: string;
  sortby?: string;
  order?: string;
  page?: number;
  limit?: number;
};

type QueryResult = {
  data: IRepository[];
  ok: boolean;
  totalCount: number;
  totalPages: number;
};

type AddQuery = {
  owner: string;
  repoName: string;
  modelType: DataModellingFormat;
};

export const adjustQueryParams = (params: Filters) => {
  switch (params.sortby) {
    case 'name':
      params.sortby = 'alpha';
      break;
    case 'updated_at':
      params.sortby = 'created';
      break;
  }

  params.page = params.page + 1;

  return params;
};

export enum DataModellingFormat {
  Unknown = '0',
  XSD = '1',
  JSON = '2',
}

export const repoApi = designerApi.injectEndpoints({
  endpoints: (builder) => ({
    getSearch: builder.query<QueryResult, Filters>({
      query: ({
        uid,
        keyword,
        sortby = 'alpha',
        order = 'asc',
        page = 1,
        limit = 10,
      }) => {
        const params = adjustQueryParams({
          uid,
          keyword,
          sortby,
          order,
          page,
          limit,
        });

        return {
          url: `repos/search`,
          params: {
            uid: params.uid,
            keyword: params.keyword,
            page: params.page,
            limit: params.limit,
            sortby: params.sortby,
            order: params.order,
          },
        };
      },
      providesTags: [
        {
          type: TagTypes.OrgRepositories,
        },
      ],
    }),
    addRepo: builder.mutation<IRepository, AddQuery>({
      query: ({ owner, repoName, modelType }) => {
        return {
          url: `repos/${owner}`,
          method: 'POST',
          params: {
            repository: repoName,
            datamodellingPreference: modelType,
          },
        };
      },
      invalidatesTags: [
        {
          type: TagTypes.OrgRepositories,
        },
      ],
    }),
  }),
});

export const { endpoints, useGetSearchQuery, useAddRepoMutation } = repoApi;
