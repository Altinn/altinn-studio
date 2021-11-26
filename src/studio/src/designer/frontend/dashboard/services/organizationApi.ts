import { IGiteaOrganisation } from 'app-shared/types';
import { designerApi, TagTypes } from './designerApi';

export type Organizations = Array<IGiteaOrganisation>;

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
  }),
});

export const { endpoints, useGetOrganizationsQuery } = organizationApi;
