/**
 * The app's own failure code, when the engine's message carries one.
 *
 * The app runtime answers a failed callback with RFC 9457 problem details, and its
 * `workflowFailureCode` extension is the one field worth lifting out: it is the identifier an
 * operator searches the documentation and the app's log for. The engine records the whole body as
 * one string behind its own prefix, so the code is read back out of the JSON at the end of it.
 * Everything else in the message is read as it came.
 */
export function failureCodeOf(message: string): string | undefined {
  const bodyStart = message.indexOf('{');
  if (bodyStart < 0) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(message.slice(bodyStart));
  } catch {
    return undefined;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return undefined;
  }
  const code = (parsed as { workflowFailureCode?: unknown }).workflowFailureCode;
  return typeof code === 'string' && code.length > 0 ? code : undefined;
}
