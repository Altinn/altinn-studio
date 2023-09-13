import { AxiosError, AxiosResponse } from 'axios';

export const createApiErrorMock = (status?: number): AxiosError => {
  const error = new AxiosError();
  error.response = {
    status,
  } as AxiosResponse;
  return error;
};
