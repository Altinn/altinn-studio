import { ApiError } from 'app-shared/types/api/ApiError';
import { AxiosError, AxiosResponse } from 'axios';

export const createApiErrorMock = (status?: number, errorCode?: string): AxiosError<ApiError> => {
  const error = new AxiosError();
  error.response = {
    status,
    data: { errorCode },
  } as AxiosResponse;
  return error;
};
