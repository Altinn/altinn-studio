import { repository } from 'app-shared/mocks/mocks';
import type { Repository } from 'app-shared/types/Repository';

export const mockRepository1: Repository = {
  ...repository,
  created_at: '2023-09-20T10:40:00Z',
  name: 'CoolService',
  owner: {
    ...repository.owner,
    full_name: 'Mons Monsen',
    login: 'Mons',
  },
};

export const mockRepository2: Repository = {
  ...mockRepository1,
  owner: {
    ...mockRepository1.owner,
    full_name: '',
  },
};
