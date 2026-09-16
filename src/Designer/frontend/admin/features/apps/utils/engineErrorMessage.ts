/**
 * A step's error message, unpacked into the parts an operator reads.
 *
 * The app runtime answers a failed callback with RFC 9457 problem details: `title` carries the
 * exception type, `detail` the message, `status` the HTTP status, and the extensions
 * `workflowFailureCode` and `nonRetryable` the app's own verdict. The engine records the whole body
 * as one string behind its own prefix, for example
 * `AppCommand failed with client error BadRequest: {"title":...}`. Reading the fields back out is
 * what makes the message legible at a glance. The raw string is always kept: it is what goes into a
 * bug report.
 */
export type EngineErrorDetails = {
  raw: string;
  /** The engine's own words before the problem body, present only when a body was recognized. */
  prefix?: string;
  title?: string;
  detail?: string;
  status?: number;
  failureCode?: string;
  /** Validation problem entries, flattened to `field: message` lines. */
  validationErrors?: string[];
};

type ProblemDetailsBody = {
  title?: unknown;
  detail?: unknown;
  status?: unknown;
  workflowFailureCode?: unknown;
  errors?: unknown;
};

export function parseEngineErrorMessage(message: string): EngineErrorDetails {
  const bodyStart = message.indexOf('{');
  if (bodyStart < 0) {
    return { raw: message };
  }
  const body = parseProblemDetails(message.slice(bodyStart));
  if (!body) {
    return { raw: message };
  }
  const prefix = message.slice(0, bodyStart).replace(/:\s*$/, '').trim();
  return {
    raw: message,
    prefix: prefix || undefined,
    title: asText(body.title),
    detail: asText(body.detail),
    status: typeof body.status === 'number' ? body.status : undefined,
    failureCode: asText(body.workflowFailureCode),
    validationErrors: flattenValidationErrors(body.errors),
  };
}

/** Parses the text as JSON and accepts it only when it has the shape of a problem-details body. */
function parseProblemDetails(text: string): ProblemDetailsBody | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (!isRecord(parsed)) {
    return undefined;
  }
  const body: ProblemDetailsBody = parsed;
  const hasProblemField =
    typeof body.title === 'string' || typeof body.detail === 'string' || isRecord(body.errors);
  return hasProblemField ? body : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asText(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * `errors` on a validation problem maps a field to its messages. The field is part of the line
 * when it names something; the JSON root (`$`) does not.
 */
function flattenValidationErrors(errors: unknown): string[] | undefined {
  if (!isRecord(errors)) {
    return undefined;
  }
  const lines = Object.entries(errors).flatMap(([field, messages]) => {
    const list = Array.isArray(messages) ? messages : [messages];
    return list
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => (field && field !== '$' ? `${field}: ${entry}` : entry));
  });
  return lines.length ? lines : undefined;
}
