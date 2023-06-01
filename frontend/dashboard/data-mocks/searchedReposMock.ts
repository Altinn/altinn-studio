import { SearchRepositoryResponse } from 'app-shared/types/api';

export const searchedRepos: SearchRepositoryResponse = {
  data: [
    {
      clone_url: 'http://dummy-url/repos/mocked-user/mocked-repo.git',
      description: '',
      full_name: 'Mocked Name',
      html_url: 'http://dummy-url/repos/unit/testing',
      id: 36,
      name: 'Mocking Username',
      owner: {
        avatar_url: 'https://secure.gravatar.com/avatar/c60d5958ff3bb331294e89d51bc022dd?d=identicon',
        full_name: '',
        login: 'mocked-testing',
      },
      updated_at: '2023-01-31T21:03:23Z',
      is_cloned_to_local: false,
      user_has_starred: false,
    },
  ],
  ok: true,
  totalCount: 1,
  totalPages: 1,
};
