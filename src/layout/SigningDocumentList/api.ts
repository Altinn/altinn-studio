import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import type { UseQueryResult } from '@tanstack/react-query';

import { DataTypeReference } from 'src/utils/attachmentsUtils';
import { httpGet } from 'src/utils/network/sharedNetworking';
import { appPath } from 'src/utils/urls/appUrlHelper';
import { makeUrlRelativeIfSameDomain } from 'src/utils/urls/urlHelper';

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

export function useDocumentList(
  instanceOwnerPartyId: string | undefined,
  instanceGuid: string | undefined,
): UseQueryResult<SigningDocument[]> {
  return useQuery({
    queryKey: ['signingDocumentList', instanceOwnerPartyId, instanceGuid],
    queryFn: async () => {
      const url = `${appPath}/instances/${instanceOwnerPartyId}/${instanceGuid}/signing/data-elements`;

      const response = await httpGet(url);

      return z
        .object({ dataElements: z.array(signingDocumentSchema) })
        .parse(response)
        .dataElements.toSorted((a, b) => (a.filename ?? '').localeCompare(b.filename ?? ''));
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    refetchOnMount: 'always',
  });
}
