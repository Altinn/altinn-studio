import type { ApiError } from 'app-shared/types/api/ApiError';
import { HttpError } from 'app-shared/utils/networking';

export const createApiErrorMock = (
  status?: number,
  errorCode?: string,
  customErrorMessages?: string[],
): HttpError<ApiError> =>
  new HttpError<ApiError>({ status, data: { errorCode, customErrorMessages } });
