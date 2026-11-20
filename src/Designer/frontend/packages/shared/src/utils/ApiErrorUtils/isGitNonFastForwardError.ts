import type { ApiError } from 'app-shared/types/api/ApiError';
import { isHttpError } from 'app-shared/utils/networking';
import { ApiErrorCodes } from 'app-shared/enums/ApiErrorCodes';

export const isGitNonFastForwardError = (error: unknown): boolean =>
  isHttpError<ApiError>(error) &&
  error.response?.data?.errorCode === ApiErrorCodes.GitNonFastForward;
