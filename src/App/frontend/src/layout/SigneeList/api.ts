import { queryOptions, skipToken, useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { httpGet } from 'src/utils/network/sharedNetworking';
import { capitalizeName } from 'src/utils/stringHelper';
import { appPath } from 'src/utils/urls/appUrlHelper';

export enum NotificationStatus {
  NotSent = 'NotSent',
  Sent = 'Sent',
  Failed = 'Failed',
}

// Known reasons a delegation can permanently fail. Only present when `delegationSuccessful` is false.
const DELEGATION_FAILURE_CODES = ['InvalidParty', 'Rejected', 'Unknown'] as const;
export type DelegationFailure = (typeof DELEGATION_FAILURE_CODES)[number];

// Older backends do not send this field, and a newer backend may send a code this frontend does not
// know yet. Absent, null and unrecognized values are all treated the same as "no code".
function toDelegationFailure(value: string | null | undefined): DelegationFailure | undefined {
  return DELEGATION_FAILURE_CODES.includes(value as DelegationFailure) ? (value as DelegationFailure) : undefined;
}

// Known reasons a notification can fail. Only present when `notificationStatus` is 'Failed'.
const NOTIFICATION_FAILURE_CODES = ['Configuration', 'ServiceOwnerUnavailable', 'Rejected', 'Unknown'] as const;
export type NotificationFailure = (typeof NOTIFICATION_FAILURE_CODES)[number];

// Older backends do not send this field, and a newer backend may send a code this frontend does not
// know yet. Absent, null and unrecognized values are all treated the same as "no code".
function toNotificationFailure(value: string | null | undefined): NotificationFailure | undefined {
  return NOTIFICATION_FAILURE_CODES.includes(value as NotificationFailure) ? (value as NotificationFailure) : undefined;
}

const signeeStateSchema = z
  .object({
    name: z
      .string()
      .nullish()
      .transform((name) => (name ? capitalizeName(name) : null)),
    organization: z
      .string()
      .nullish()
      .transform((organization) => (organization ? capitalizeName(organization) : null)),
    signedTime: z.string().datetime().nullable(),
    delegationSuccessful: z.boolean(),
    delegationFailure: z.string().nullish().transform(toDelegationFailure),
    notificationStatus: z.nativeEnum(NotificationStatus),
    notificationFailure: z.string().nullish().transform(toNotificationFailure),
    partyId: z.number(),
  })
  .refine(({ name, organization }) => name || organization, 'Either name or organization must be present.')
  .transform((it) => ({ ...it, hasSigned: !!it.signedTime }));

export type SigneeState = z.infer<typeof signeeStateSchema>;

export const signingQueries = {
  all: ['signing'] as const,
  signeeList: (partyId: string | undefined, instanceGuid: string | undefined, taskId: string | undefined) =>
    queryOptions({
      queryKey: [...signingQueries.all, 'signeeList', partyId, instanceGuid, taskId],
      queryFn: partyId && instanceGuid ? () => fetchSigneeList(partyId, instanceGuid, taskId) : skipToken,
      refetchInterval: 1000 * 10, // 10 seconds
      refetchOnMount: 'always',
    }),
};

export async function fetchSigneeList(partyId: string, instanceGuid: string, taskId?: string): Promise<SigneeState[]> {
  let url = `${appPath}/instances/${partyId}/${instanceGuid}/signing`;

  if (taskId) {
    url = url.concat(`?taskId=${taskId}`);
  }

  const response = await httpGet(url);
  const parsed = z.object({ signeeStates: z.array(signeeStateSchema) }).parse(response);

  return parsed.signeeStates.toSorted((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
}

export function useSigneeList(
  partyId: string | undefined,
  instanceGuid: string | undefined,
  taskId: string | undefined,
) {
  return useQuery(signingQueries.signeeList(partyId, instanceGuid, taskId));
}
