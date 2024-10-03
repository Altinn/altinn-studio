import { type Organization } from 'app-shared/types/Organization';

export const mockOrg1: Organization = {
  avatar_url: '',
  id: 12,
  username: 'ttd',
  full_name: 'Test',
};
export const mockOrg2: Organization = {
  avatar_url: '',
  id: 23,
  username: 'unit-test-2',
  full_name: 'unit-test-2',
};
export const mockOrganizations: Organization[] = [mockOrg1, mockOrg2];
