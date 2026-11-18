import type { ApiError } from 'app-shared/types/api/ApiError';
import { HttpError } from 'app-shared/utils/networking';
import { failedRequestMock } from './httpErrorMock';

export const createApiErrorMock = (
  status?: number,
  errorCode?: string,
  customErrorMessages?: string[],
): HttpError<ApiError> =>
  new HttpError<ApiError>(failedRequestMock, {
    status,
    data: { errorCode, customErrorMessages },
    headers: new Headers(),
  });
