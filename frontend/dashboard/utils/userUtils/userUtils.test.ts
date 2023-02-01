import { SelectedContextType } from 'app-shared/navigation/main-header/Header';
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
      selectedContext: 1,
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

    expect(result).toBe(true);
  });

  it('should return false when context id is not present in orgs list', () => {
    const result = userHasAccessToSelectedContext({
      selectedContext: 2,
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
