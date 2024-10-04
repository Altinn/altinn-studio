import { type HeaderContextType } from 'dashboard/context/HeaderContext';
import { userMock } from './userMock';
import { mockOrganizations } from './organizationMock';

export const headerContextValueMock: HeaderContextType = {
  user: userMock,
  selectableOrgs: mockOrganizations,
};
