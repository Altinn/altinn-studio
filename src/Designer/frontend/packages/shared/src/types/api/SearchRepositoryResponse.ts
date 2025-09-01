import type { Repository } from 'app-shared/types/Repository';

export interface SearchRepositoryResponse {
  data: Repository[];
  ok: boolean;
  totalCount: number;
  totalPages: number;
}
