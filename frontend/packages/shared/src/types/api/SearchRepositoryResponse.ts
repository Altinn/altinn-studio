import { IRepository } from 'app-shared/types/global';

export interface SearchRepositoryResponse {
  data: IRepository[];
  ok: boolean;
  totalCount: number;
  totalPages: number;
}
