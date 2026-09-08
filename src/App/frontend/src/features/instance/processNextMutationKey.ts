import type { IActionType } from 'src/types/shared';

/**
 * Mutation key shared by every process/next mutation: a plain submit uses the bare key and an
 * action (confirm, sign, ...) appends it, so filtering on the bare key matches them all. Kept in its
 * own module because both the mutation hooks and InstanceProvider (which polls the instance while
 * one of these mutations is in flight) need it, and the hooks import the provider.
 */
export function getProcessNextMutationKey(action?: IActionType) {
  if (!action) {
    return ['processNext'] as const;
  }
  return ['processNext', action] as const;
}
