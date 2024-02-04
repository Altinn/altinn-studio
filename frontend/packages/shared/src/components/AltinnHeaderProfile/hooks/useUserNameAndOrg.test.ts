import { textMock } from '../../../../../../testing/mocks/i18nMock';
import { useUserNameAndOrg } from './useUserNameAndOrg';
import type { User } from 'app-shared/types/Repository';
import type { Repository } from 'app-shared/types/Repository';

const mockOrg: string = 'org';

const mockUser: User = {
  avatar_url: '',
  email: '',
  id: 1,
  login: 'testUser',
  full_name: 'Test User',
  userType: 0,
};

const mockRepository: Repository = {
  clone_url: '',
  created_at: '',
  default_branch: 'test',
  description: '',
  empty: false,
  fork: false,
  forks_count: 0,
  full_name: 'test',
  html_url: '',
  id: 0,
  is_cloned_to_local: false,
  mirror: false,
  name: 'test',
  open_issues_count: 0,
  owner: {
    avatar_url: '',
    email: '',
    full_name: 'Name Test',
    id: 0,
    login: '',
    userType: 0,
  },
  permissions: {
    admin: true,
    pull: true,
    push: true,
  },
  private: false,
  repositoryCreatedStatus: 0,
  size: 1,
  ssh_url: '',
  stars_count: 0,
  updated_at: '',
  watchers_count: 0,
  website: '',
};

describe('useUserNameAndOrg', () => {
  it('returns user´s full name when repository is not provided and full_name is present', () => {
    const result = useUserNameAndOrg(mockUser, mockOrg, null);

    expect(result).toBe(mockUser.full_name);
  });

  it('returns user´s login when repository is not provided and full_name is not present', () => {
    const result = useUserNameAndOrg({ ...mockUser, full_name: '' }, mockOrg, null);

    expect(result).toBe(mockUser.login);
  });

  it('returns user´s full name when org is the same as user login and full_name is present', () => {
    const result = useUserNameAndOrg(mockUser, mockUser.login, mockRepository);

    expect(result).toBe(mockUser.full_name);
  });

  it('returns user´s login when org is the same as user login and full_name is not present', () => {
    const result = useUserNameAndOrg(
      { ...mockUser, full_name: '' },
      mockUser.login,
      mockRepository,
    );

    expect(result).toBe(mockUser.login);
  });

  it('returns translated string when org is different from user login', () => {
    const result = useUserNameAndOrg(mockUser, mockOrg, mockRepository);

    const text = textMock('shared.header_user_for_org', {
      user: mockUser.full_name,
      org: mockRepository.owner.full_name,
    });

    expect(result).toBe(text);
  });
});
