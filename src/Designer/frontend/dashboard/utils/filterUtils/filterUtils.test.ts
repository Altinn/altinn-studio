import { SelectedContextType } from '../../enums/SelectedContextType';
import { getUidFilter } from './filterUtils';

describe('getUidFilter', () => {
  it('should return number zero when selectedContext is All', () => {
    const result = getUidFilter({
      selectedContext: SelectedContextType.All,
      userId: 1,
      organizations: [],
    });

    expect(result).toBe(0);
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
