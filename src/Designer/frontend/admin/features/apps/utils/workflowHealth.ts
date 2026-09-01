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

export function isEngineUnavailableError(error: unknown): boolean {
  if (!isAxiosError(error)) {
    return false;
  }
  const problemType = (error.response?.data as { type?: unknown } | undefined)?.type;
  return typeof problemType === 'string' && ENGINE_UNAVAILABLE_PROBLEM_TYPES.includes(problemType);
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
  /** True while this request is still in flight. Its keys stay absent from the lookup. */
  isPending?: boolean;
  data?: WorkflowCollectionListResponse | null;
  error?: unknown;
};

export type WorkflowHealthLookup = {
  /** True when any request failed because the engine is not reachable in this environment. */
  isUnavailable: boolean;
  /**
   * Health per requested key. A key the engine did not answer for maps to `NoData`; a key whose
   * request has not answered yet is absent, so the caller can tell "not known yet" from "no data".
   */
  healthByKey: Record<string, WorkflowHealth>;
};

/**
 * Folds the annotate responses for the loaded instance pages into one lookup.
 *
 * A key the engine did not return a collection for is unmatched — no data. A request that failed
 * for any other reason degrades its keys to no data as well: health enrichment must never turn into
 * an error state for the instance list it decorates. Keys of a request still in flight are left out
 * entirely rather than pre-filled with no data, which would flash a false verdict.
 */
export function mergeWorkflowHealth(chunks: WorkflowHealthChunk[]): WorkflowHealthLookup {
  const healthByKey: Record<string, WorkflowHealth> = {};

  for (const chunk of chunks) {
    if (chunk.isPending) {
      continue;
    }
    const countsByKey = new Map(
      (chunk.data?.data ?? []).map((collection) => [collection.key, collection.workflowCounts]),
    );
    for (const key of chunk.keys) {
      healthByKey[key] = chunk.error
        ? WorkflowHealth.NoData
        : deriveWorkflowHealth(countsByKey.get(key));
    }
  }

  return {
    isUnavailable: chunks.some((chunk) => isEngineUnavailableError(chunk.error)),
    healthByKey,
  };
}
