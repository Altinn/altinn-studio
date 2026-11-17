/**
 * An engine error message, read for display.
 *
 * The app runtime answers a failed callback with RFC 9457 problem details, and the engine records
 * the whole body as one string behind its own prefix: `AppCommand failed with client error
 * BadRequest: {...}`. The `title` (the exception type, in practice) gives the error a headline,
 * the `workflowFailureCode` extension is the identifier an operator searches the documentation
 * and the app's log for, and the body itself is handed back parsed so it can be laid out as JSON
 * instead of one long line. A message without a JSON body is shown as it came.
 */
export type EngineErrorReading = {
  title?: string;
  failureCode?: string;
  /** The engine's own words before the body, when there is a body. */
  prefix?: string;
  /** The body, parsed, when the message carries one. */
  body?: unknown;
};

export function readEngineErrorMessage(message: string): EngineErrorReading {
  const bodyStart = message.indexOf('{');
  if (bodyStart < 0) {
    return {};
  }
  let body: unknown;
  try {
    body = JSON.parse(message.slice(bodyStart));
  } catch {
    return {};
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return {};
  }
  const fields = body as { title?: unknown; workflowFailureCode?: unknown };
  const prefix = message.slice(0, bodyStart).trim();
  return {
    title: asText(fields.title),
    failureCode: asText(fields.workflowFailureCode),
    prefix: prefix || undefined,
    body,
  };
}

/** The message as it is shown: the prefix on its own line, the body laid out as JSON. */
export function formatEngineErrorMessage(message: string): string {
  const { prefix, body } = readEngineErrorMessage(message);
  if (body === undefined) {
    return message;
  }
  const json = JSON.stringify(body, null, 2);
  return prefix ? `${prefix}\n${json}` : json;
}

function asText(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
