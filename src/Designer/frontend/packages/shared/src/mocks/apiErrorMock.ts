import type { ApiError } from 'app-shared/types/api/ApiError';
import type { AxiosResponse } from 'axios';
import { AxiosError } from 'axios';

export const createApiErrorMock = (
  status?: number,
  errorCode?: string,
  values?: Record<string, unknown>,
  customErrorMessages?: string[],
): AxiosError<ApiError> => {
  const error = new AxiosError();
  error.response = {
    status,
    data: { errorCode, values, customErrorMessages },
  } as AxiosResponse;
  return error;
};
