import { HttpError } from 'app-shared/utils/networking';

export const failedRequestMock = { method: 'GET', url: '/test' };

/**
 * An HttpError as the client throws it. Without a status, the request got no response, as on a
 * network failure.
 */
export const createHttpErrorMock = <T = unknown>(status?: number, data?: T): HttpError<T> =>
  new HttpError<T>(
    failedRequestMock,
    status === undefined ? undefined : { status, data: data as T, headers: new Headers() },
  );
