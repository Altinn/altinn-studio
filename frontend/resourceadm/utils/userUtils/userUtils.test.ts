import { SelectedContextType } from 'app-shared/enums/SelectedContextType';
import { userHasAccessToOrganization } from './index';

describe('userHasAccessToOrganization', () => {
  it('should return true when context is self', () => {
    const result = userHasAccessToOrganization({
      org: SelectedContextType.Self,
      orgs: [],
    });

    expect(result).toBe(true);
  });

  it('should return true when context is all', () => {
    const result = userHasAccessToOrganization({
      org: SelectedContextType.All,
      orgs: [],
    });

    expect(result).toBe(true);
  });

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
