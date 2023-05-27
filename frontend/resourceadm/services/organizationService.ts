import type { IGiteaOrganisation } from 'app-shared/types/global';
import { orgsListPath } from 'app-shared/api-paths';
import { get } from '../../packages/shared/src/utils/networking';

export type Organization = IGiteaOrganisation;

const getOrganizations = async (): Promise<Organization[]> => {
  return await get(`${orgsListPath()}`);
};

export type OrganizationService = {
  getOrganizations: () => Promise<Organization[]>;
};

export const organizationService: OrganizationService = {
  getOrganizations,
};
