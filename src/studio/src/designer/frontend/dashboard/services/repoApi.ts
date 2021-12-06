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

export const repoApi = designerApi.injectEndpoints({
  endpoints: (builder) => ({
    getSearch: builder.query<QueryResult, Filters>({
      query: ({
        uid,
        keyword,
        sortby = 'alpha',
        order = 'asc',
        page = 1,
        limit = 8,
      }) => {
        if (sortby === 'name') {
          sortby = 'alpha';
        }

        if (sortby === 'updated_at') {
          sortby = 'created';
        }

        return {
          url: `repos/search`,
          params: {
            uid,
            keyword,
            page,
            limit,
            sortby,
            order,
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
