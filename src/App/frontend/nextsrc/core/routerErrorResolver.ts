import { isRouteErrorResponse } from 'react-router-dom';

export class RouterErrorResolver {
  public static resolveMessage(error: unknown): string {
    if (isRouteErrorResponse(error)) {
      return error.data || error.statusText;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'An unexpected error occurred';
  }
}
