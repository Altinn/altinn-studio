import type { ApiError } from 'app-shared/types/api/ApiError';
import { isAxiosError } from 'axios';
import { ApiErrorCodes } from 'app-shared/enums/ApiErrorCodes';

export const isGitNonFastForwardError = (error: unknown): boolean =>
  isAxiosError<ApiError>(error) &&
  error.response?.data?.errorCode === ApiErrorCodes.GitNonFastForward;
