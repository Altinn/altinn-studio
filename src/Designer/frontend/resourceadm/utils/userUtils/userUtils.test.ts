import { getOrgNameByUsername, userHasAccessToOrganization } from './userUtils';
import { type Organization } from 'app-shared/types/Organization';

const mockOrg1: Organization = {
  avatar_url: '',
  id: 12,
  username: 'ttd',
  full_name: 'Test',
};
const mockOrg2: Organization = {
  avatar_url: '',
  id: 23,
  username: 'unit-test-2',
  full_name: 'unit-test-2',
};
const mockOrganizations: Organization[] = [mockOrg1, mockOrg2];

describe('userUtils', () => {
  describe('userHasAccessToOrganization', () => {
    it('should return true when context id is present in orgs list', () => {
      const result = userHasAccessToOrganization({
        org: 'username1',
        orgs: [
          {
            avatar_url: 'avatar_url',
            description: '',
            full_name: 'full_name',
            id: 1,
            location: '',
            username: 'username1',
            website: '',
          },
        ],
      });

      expect(result).toBe(true);
    });

    it('should return false when context id is not present in orgs list', () => {
      const result = userHasAccessToOrganization({
        org: 'username2',
        orgs: [
          {
            avatar_url: 'avatar_url',
            description: '',
            full_name: 'full_name',
            id: 1,
            location: '',
            username: 'username',
            website: '',
          },
        ],
      });

      expect(result).toBe(false);
    });
  });

  describe('getOrgNameByUsername', () => {
    it('should return the full name of the organization when a matching username is found', () => {
      const result = getOrgNameByUsername(mockOrg1.username, mockOrganizations);
      expect(result).toBe(mockOrg1.full_name);
    });

    it('should return the username if full name is not available', () => {
      const mockOrg3: Organization = {
        username: 'org3',
        full_name: '',
        id: 12,
        avatar_url: '',
      };
      const orgsWithoutFullName: Organization[] = [mockOrg3];
      const result = getOrgNameByUsername(mockOrg3.username, orgsWithoutFullName);
      expect(result).toBe(mockOrg3.username);
    });

    it('should return undefined if the organization is not found', () => {
      const result = getOrgNameByUsername('nonexistent-org', mockOrganizations);
      expect(result).toBeUndefined();
    });

    it('should return undefined if orgs array is undefined', () => {
      const result = getOrgNameByUsername(mockOrg1.username, undefined);
      expect(result).toBeUndefined();
    });
  });
});
