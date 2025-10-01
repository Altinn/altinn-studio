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
    notificationStatus: z.nativeEnum(NotificationStatus),
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
      queryFn: partyId && instanceGuid && taskId ? () => fetchSigneeList(partyId, instanceGuid) : skipToken,
      refetchInterval: 1000 * 60, // 1 minute
      refetchOnMount: 'always',
    }),
};

export async function fetchSigneeList(partyId: string, instanceGuid: string): Promise<SigneeState[]> {
  const url = `${appPath}/instances/${partyId}/${instanceGuid}/signing`;

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
