import { z } from 'zod';

import { DataTypeReference } from 'src/utils/attachmentsUtils';
import { httpGet } from 'src/utils/network/sharedNetworking';
import { capitalizeName } from 'src/utils/stringHelper';
import { appPath } from 'src/utils/urls/appUrlHelper';
import { makeUrlRelativeIfSameDomain } from 'src/utils/urls/urlHelper';

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

async function fetchSigneeList(partyId: string, instanceGuid: string, taskId?: string): Promise<SigneeState[]> {
  let url = `${appPath}/instances/${partyId}/${instanceGuid}/signing`;

  if (taskId) {
    url = url.concat(`?taskId=${taskId}`);
  }

  const response = await httpGet(url);
  const parsed = z.object({ signeeStates: z.array(signeeStateSchema) }).parse(response);

  return parsed.signeeStates.toSorted((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
}

const signingDocumentSchema = z
  .object({
    id: z.string(),
    dataType: z.string(),
    contentType: z.string(),
    filename: z.string().nullish(),
    size: z.number(),
    tags: z.array(z.string()),
    selfLinks: z.object({
      apps: z.string(),
    }),
  })
  .transform((it) => ({
    dataType: it.dataType,
    filename: it.filename ?? it.dataType,
    attachmentTypes:
      it.dataType === DataTypeReference.RefDataAsPdf ? ['signing_document_list.attachment_type_form'] : it.tags,
    url: makeUrlRelativeIfSameDomain(it.selfLinks.apps),
    size: it.size,
  }));

export type SigningDocument = z.infer<typeof signingDocumentSchema>;

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

async function fetchSigningDocuments(
  instanceOwnerPartyId: string | undefined,
  instanceGuid: string | undefined,
): Promise<SigningDocument[]> {
  const url = `${appPath}/instances/${instanceOwnerPartyId}/${instanceGuid}/signing/data-elements`;
  const response = await httpGet(url);
  return z.object({ dataElements: z.array(signingDocumentSchema) }).parse(response).dataElements;
}

async function fetchAuthorizedOrganizationDetails(
  partyId: string,
  instanceGuid: string,
): Promise<AuthorizedOrganizationDetails> {
  const url = `${appPath}/instances/${partyId}/${instanceGuid}/signing/organizations`;
  return authorizedOrganizationDetailsSchema.parse(await httpGet(url));
}

export const signingApi = { fetchSigneeList, fetchSigningDocuments, fetchAuthorizedOrganizationDetails };
export type SigningApi = typeof signingApi;
