import { get } from 'app-shared/utils/networking';

/**
 * GET a workflow-engine resource through Designer's admin pass-through.
 *
 * The engine answers 204 No Content for "nothing matched" on its list and discovery reads, and
 * Designer forwards that verbatim. `get` resolves an empty body as `null`, so callers get `null`
 * rather than an empty string in typed data.
 */
export async function getWorkflowEngineResource<T>(
  url: string,
  signal: AbortSignal,
): Promise<T | null> {
  return get<T>(url, { signal });
}
