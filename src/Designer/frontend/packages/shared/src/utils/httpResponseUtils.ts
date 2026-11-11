import type { HttpError } from 'app-shared/utils/networking';
import { ServerCodes } from 'app-shared/enums/ServerCodes';

export class HttpResponseUtils {
  public static isConflict(error: HttpError): boolean {
    return error?.response?.status === ServerCodes.Conflict;
  }
}
