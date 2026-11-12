import type { ApiError } from 'app-shared/types/api/ApiError';
import type { HttpError } from 'app-shared/utils/networking';

export const isErrorUnknown = (error: HttpError<ApiError>) => !error.response?.data?.errorCode;
