import { isAxiosError } from 'axios';
import type {
  CollectionWorkflowCounts,
  WorkflowCollectionListResponse,
} from 'admin/features/apps/types/workflows/WorkflowCollection';

/**
 * Traffic light for one instance's workflow-engine health.
 *
 * `NoData` is deliberately distinct from `Healthy`: the engine only holds instances with transition
 * activity, and retention hard-deletes settled workflows, so "the engine knows nothing about this
 * instance" must never render as "nothing is wrong".
 */
export enum WorkflowHealth {
  /** A failure visible to the head frontier: the process is stuck and the user is blocked. */
  Failed = 'failed',
  /** A failure hidden from the head frontier: side effects were lost, ops must intervene. */
  SideEffectsFailed = 'sideEffectsFailed',
  /** Work still in flight. Expected to resolve itself. */
  Active = 'active',
  /** Every workflow settled without an outstanding failure. */
  Healthy = 'healthy',
  /** The engine has no data for this instance: pre-v9 app, no transition activity, or pruned. */
  NoData = 'noData',
  /**
   * The engine's answer never arrived, so nothing is known about this instance. Distinct from
   * `NoData`, which asserts that the engine holds nothing — a claim a failed request cannot make.
   */
  Unknown = 'unknown',
  /** The engine (or the gateway in front of it) is not reachable in this environment. */
  Unavailable = 'unavailable',
}

/**
 * Problem types that mean "the engine is not reachable here" rather than "something went wrong".
 * The engine is rolled out per environment, so an unreachable engine is a normal state, not an
 * error to shout about.
 */
export const ENGINE_UNAVAILABLE_PROBLEM_TYPES: readonly string[] = [
  'urn:altinn:studio:gateway:workflow-engine-unavailable',
  'urn:altinn:studio:designer:runtime-gateway-unavailable',
];

/**
 * Status codes that mean the same thing as the problem types above when no problem type survived.
 * Designer's pass-through forwards an empty upstream body as a bare status code, and an ingress or
 * service mesh in front of it can answer with an HTML body of its own, so the problem type is not
 * always there to read.
 */
const ENGINE_UNAVAILABLE_STATUS_CODES: readonly number[] = [502, 503, 504];

/**
 * Derives the traffic light from the engine's per-collection rollup.
 *
 * Precedence is red > orange > active > green: a blocked process outranks lost side effects, which
 * outrank work still running. Absent counts mean no data — never green.
 */
export function deriveWorkflowHealth(
  counts: CollectionWorkflowCounts | undefined | null,
): WorkflowHealth {
  if (!counts) {
    return WorkflowHealth.NoData;
  }
  if (counts.failedVisible > 0) {
    return WorkflowHealth.Failed;
  }
  if (counts.failedInvisible > 0) {
    return WorkflowHealth.SideEffectsFailed;
  }
  if (counts.active > 0) {
    return WorkflowHealth.Active;
  }
  return WorkflowHealth.Healthy;
}

/**
 * Whether a failed request means "the engine is not reachable here".
 *
 * The problem type is the primary signal. A bad gateway, an unavailable upstream or a gateway
 * timeout says the same thing on its own, so those status codes count even when no problem type
 * came with them.
 */
export function isEngineUnavailableError(error: unknown): boolean {
  if (!isAxiosError(error)) {
    return false;
  }
  const problemType = (error.response?.data as { type?: unknown } | undefined)?.type;
  if (typeof problemType === 'string' && ENGINE_UNAVAILABLE_PROBLEM_TYPES.includes(problemType)) {
    return true;
  }
  return ENGINE_UNAVAILABLE_STATUS_CODES.includes(error.response?.status ?? 0);
}

/**
 * The engine's collection key is the bare instance GUID. The admin instance list already exposes it
 * that way (Storage's Studio endpoint strips the `{partyId}/` prefix), but this also accepts the
 * prefixed form so the join survives either shape. Anything that is not a GUID yields `undefined`
 * and is never sent to the engine as a key.
 */
export function extractInstanceGuid(instanceId: string | undefined): string | undefined {
  if (!instanceId) {
    return undefined;
  }
  const lastSegment = instanceId.slice(instanceId.lastIndexOf('/') + 1);
  return GUID_PATTERN.test(lastSegment) ? lastSegment : undefined;
}

const GUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/** One annotate request's worth of health: the keys asked for, and what came back. */
export type WorkflowHealthChunk = {
  keys: string[];
  /** True while this request is still in flight. Its keys are reported as pending, not as data. */
  isPending?: boolean;
  data?: WorkflowCollectionListResponse | null;
  error?: unknown;
};

export type WorkflowHealthLookup = {
  /**
   * Health per requested key, from the request that key was asked for in. A key the engine did not
   * answer for maps to `NoData`; a key whose request has not answered yet is absent.
   */
  healthByKey: Record<string, WorkflowHealth>;
  /** Keys whose own request is still in flight, so their verdict is not known yet. */
  pendingKeys: Set<string>;
};

/**
 * Folds the annotate responses for the loaded instance pages into one lookup.
 *
 * Every verdict is scoped to the request its key was asked for in, so one failed request never
 * erases what the others answered: only its own keys degrade. A key the engine returned no
 * collection for is unmatched — no data. A request that failed reports its keys as `Unavailable`
 * when the engine is not reachable here, and as `Unknown` otherwise: a failed request cannot claim
 * the engine holds nothing. Health enrichment must never turn into an error state for the instance
 * list it decorates, so no failure is propagated as one. Keys of a request still in flight are
 * reported as pending rather than pre-filled with a verdict, which would flash something false.
 */
export function mergeWorkflowHealth(chunks: WorkflowHealthChunk[]): WorkflowHealthLookup {
  const healthByKey: Record<string, WorkflowHealth> = {};
  const pendingKeys = new Set<string>();

  for (const chunk of chunks) {
    if (chunk.isPending) {
      for (const key of chunk.keys) {
        pendingKeys.add(key);
      }
      continue;
    }
    if (chunk.error) {
      const health = isEngineUnavailableError(chunk.error)
        ? WorkflowHealth.Unavailable
        : WorkflowHealth.Unknown;
      for (const key of chunk.keys) {
        healthByKey[key] = health;
      }
      continue;
    }
    const countsByKey = new Map(
      (chunk.data?.data ?? []).map((collection) => [collection.key, collection.workflowCounts]),
    );
    for (const key of chunk.keys) {
      healthByKey[key] = deriveWorkflowHealth(countsByKey.get(key));
    }
  }

  return { healthByKey, pendingKeys };
}
