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

export const adjustQueryParams = (params: Filters) => {
  if (params.sortby === 'name') {
    params.sortby = 'alpha';
  }

  if (params.sortby === 'updated_at') {
    params.sortby = 'created';
  }

  params.page = params.page + 1;

  return params;
};

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
  }),
});

export const { endpoints, useGetSearchQuery } = repoApi;
