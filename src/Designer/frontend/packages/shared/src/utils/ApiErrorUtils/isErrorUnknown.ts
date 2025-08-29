import type { ApiError } from 'app-shared/types/api/ApiError';
import type { AxiosError } from 'axios';

export const isErrorUnknown = (error: AxiosError<ApiError>) => !error.response?.data?.errorCode;
