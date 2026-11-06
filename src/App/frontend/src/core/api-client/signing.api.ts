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

export async function fetchSigneeList(partyId: string, instanceGuid: string, taskId?: string): Promise<SigneeState[]> {
  let url = `${appPath}/instances/${partyId}/${instanceGuid}/signing`;

  if (taskId) {
    url = url.concat(`?taskId=${taskId}`);
  }

  const response = await httpGet(url);
  const parsed = z.object({ signeeStates: z.array(signeeStateSchema) }).parse(response);

  return parsed.signeeStates.toSorted((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
}

const authorizedOrganizationDetailsSchema = z.object({
  organizations: z.array(
    z.object({
      orgNumber: z.string(),
      orgName: z.string().transform((name) => capitalizeName(name)),
      partyId: z.number(),
    }),
  ),
});

export type AuthorizedOrganizationDetails = z.infer<typeof authorizedOrganizationDetailsSchema>;

export async function fetchAuthorizedOrganizationDetails(
  partyId: string,
  instanceGuid: string,
): Promise<AuthorizedOrganizationDetails> {
  const url = `${appPath}/instances/${partyId}/${instanceGuid}/signing/organizations`;
  return authorizedOrganizationDetailsSchema.parse(await httpGet(url));
}
