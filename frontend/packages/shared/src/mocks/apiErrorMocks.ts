import type { AxiosResponse } from 'axios';
import { AxiosError } from 'axios';

export const createApiErrorMock = (status?: number): AxiosError => {
  const error = new AxiosError();
  error.response = {
    status,
  } as AxiosResponse;
  return error;
};
