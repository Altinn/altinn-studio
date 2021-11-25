import { designerApi, TagTypes } from './designerApi';
import { IRepository } from 'app-shared/types';

export type Organizations = Array<string>;

export const organizationApi = designerApi.injectEndpoints({
  endpoints: (builder) => ({
    getOrganizations: builder.query<Organizations, void>({
      query: () => `orgs`,
      providesTags: [
        {
          type: TagTypes.Organizations,
        },
      ],
    }),
    getOrganizationRepos: builder.query<IRepository[], string>({
      query: (organizationName) => `orgs/${organizationName}/repos`,
      providesTags: [
        {
          type: TagTypes.OrgRepositories,
        },
      ],
    }),
  }),
});

export const {
  endpoints,
  useGetOrganizationsQuery,
  useGetOrganizationReposQuery,
} = organizationApi;
