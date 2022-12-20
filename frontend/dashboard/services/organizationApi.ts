import type { IGiteaOrganisation } from 'app-shared/types/global';
import { designerApi, TagTypes } from './designerApi';
export type Organizations = Array<IGiteaOrganisation>;
import { orgsListPath } from 'app-shared/api-paths';

export const organizationApi = designerApi.injectEndpoints({
  endpoints: (builder) => ({
    getOrganizations: builder.query<Organizations, void>({
      query: orgsListPath,
      providesTags: [
        {
          type: TagTypes.Organizations,
        },
      ],
    }),
  }),
});

export const { endpoints, useGetOrganizationsQuery } = organizationApi;
