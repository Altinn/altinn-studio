import { SelectedContextType } from 'app-shared/navigation/main-header/Header';
import { getUidFilter } from './filterUtils';

describe('getUidFilter', () => {
  it('should return undefined when selectedContext is All', () => {
    const result = getUidFilter({
      selectedContext: SelectedContextType.All,
      userId: 1,
      organizations: [],
    });

    expect(result).toBeUndefined();
  });

  it('should return userId when selectedContext is Self', () => {
    const result = getUidFilter({
      selectedContext: SelectedContextType.Self,
      userId: 1,
      organizations: [],
    });

    expect(result).toBe(1);
  });

  it('should return selectedContext when selectedContext is not All or Self', () => {
    const result = getUidFilter({
      selectedContext: 'username2',
      userId: 1,
      organizations: [
        {
          avatar_url: '',
          username: 'username2',
          id: 2,
          full_name: '',
        },
      ],
    });

    expect(result).toBe(2);
  });
});
