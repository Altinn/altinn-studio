import { repository } from 'app-shared/mocks/mocks';
import type { SearchRepositoryResponse } from 'app-shared/types/api';

export const searchRepositoryResponseMock: SearchRepositoryResponse = {
  data: [
    {
      ...repository,
      id: 1,
    },
    {
      ...repository,
      id: 2,
    },
    {
      ...repository,
      id: 3,
    },
    {
      ...repository,
      id: 4,
    },
    {
      ...repository,
      id: 5,
    },
    {
      ...repository,
      id: 6,
    },
  ],
  ok: true,
  totalCount: 6,
  totalPages: 2,
};
