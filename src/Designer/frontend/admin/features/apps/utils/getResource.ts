import { get } from 'app-shared/utils/networking';
import type { RequestOptions } from 'app-shared/utils/networking';

/**
 * GETs an admin resource that always comes with a body. `get` types an empty body as `null`, which
 * these endpoints do not send, so the hooks keep the type they had when they called axios.
 */
export const getResource = async <T>(url: string, options?: RequestOptions): Promise<T> =>
  (await get<T>(url, options)) as T;
