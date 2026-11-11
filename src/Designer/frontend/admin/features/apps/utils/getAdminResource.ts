import { get } from 'app-shared/utils/networking';
import type { RequestOptions } from 'app-shared/utils/networking';

/**
 * GETs an admin resource that always comes with a body. `get` gives `null` for an empty body, which
 * these endpoints do not send, so an empty body fails the query instead of reaching the hooks as `T`.
 */
export const getAdminResource = async <T>(url: string, options?: RequestOptions): Promise<T> => {
  const data = await get<T>(url, options);
  if (data === null) throw new Error(`Expected a body from ${url}, got none`);
  return data;
};
