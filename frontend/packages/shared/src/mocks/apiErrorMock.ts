import { ApiError } from "app-shared/types/api/ApiError";
import { AxiosError, AxiosResponse } from "axios";

export const createApiErrorMock = (errorCode: string): AxiosError<ApiError> => {
  const error = new AxiosError();
  error.response = { data: { errorCode } } as AxiosResponse;
  return error;
};
