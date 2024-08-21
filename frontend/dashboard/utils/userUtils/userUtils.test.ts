import { SelectedContextType } from 'dashboard/context/HeaderContext';
import { userHasAccessToSelectedContext } from './index';

describe('userHasAccessToSelectedContext', () => {
  it('should return true when context is self', () => {
    const result = userHasAccessToSelectedContext({
      selectedContext: SelectedContextType.Self,
      orgs: [],
    });

    expect(result).toBe(true);
  });

  it('should return true when context is all', () => {
    const result = userHasAccessToSelectedContext({
      selectedContext: SelectedContextType.All,
      orgs: [],
    });

    expect(result).toBe(true);
  });

  it('should return true when context id is present in orgs list', () => {
    const result = userHasAccessToSelectedContext({
      selectedContext: 'username1',
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
    const result = userHasAccessToSelectedContext({
      selectedContext: 'username2',
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
