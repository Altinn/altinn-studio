import axios from 'axios';

/**
 * GET a workflow-engine resource through Designer's admin pass-through.
 *
 * The engine answers 204 No Content for "nothing matched" on its list and discovery reads, and
 * Designer forwards that verbatim. Axios resolves a 204 with an empty body, so it is normalized to
 * `null` here rather than leaking an empty string into typed data.
 */
export async function getWorkflowEngineResource<T>(
  url: string,
  signal: AbortSignal,
): Promise<T | null> {
  const response = await axios.get<T>(url, { signal });
  return response.status === 204 ? null : response.data;
}
