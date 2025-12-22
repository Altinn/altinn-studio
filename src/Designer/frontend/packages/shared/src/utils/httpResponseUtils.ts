import type { AxiosError } from 'axios';
import { ServerCodes } from 'app-shared/enums/ServerCodes';

export class HttpResponseUtils {
  public static isConflict(error: AxiosError): boolean {
    return error?.response?.status === ServerCodes.Conflict;
  }
}
