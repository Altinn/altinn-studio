import { useParams } from 'react-router';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { useBackendValidationQuery } from 'src/core/queries/backendValidation';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useProfile } from 'src/features/profile/ProfileProvider';
import { signingQueries, useSigneeList } from 'src/layout/SigneeList/api';
import { httpGet, httpPost } from 'src/utils/network/sharedNetworking';
import { capitalizeName } from 'src/utils/stringHelper';
import { appPath } from 'src/utils/urls/appUrlHelper';

const SIGNATURE_POLL_INTERVAL_MS = 2000;
const SIGNATURE_POLL_ATTEMPTS = 30;

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

const authorizedOrganizationDetailsQuery = (partyId: string, instanceGuid: string) => ({
  queryKey: ['authorizedOrganizationDetails', partyId, instanceGuid],
  queryFn: async () => {
    const url = `${appPath}/instances/${partyId}/${instanceGuid}/signing/organizations`;
    const response = await httpGet(url);
    return authorizedOrganizationDetailsSchema.parse(response);
  },
});

export function useAuthorizedOrganizationDetails(partyId: string | undefined, instanceGuid: string | undefined) {
  return useQuery(authorizedOrganizationDetailsQuery(partyId!, instanceGuid!));
}

export const MissingSignaturesErrorCode = 'MissingSignatures' as const;
export function useSignaturesValidation() {
  const { refetch, validations } = useBackendValidationQuery(false);

  return {
    refetchValidations: refetch,
    hasMissingSignatures: !!validations?.some((validation) => validation.code === MissingSignaturesErrorCode),
  };
}

/**
 * Finds all signees in the signee list that the user can sign on behalf of.
 * This includes the user itself and any organizations the user is authorized to sign for.
 */
export function useUserSigneeParties() {
  const { instanceOwnerPartyId, instanceGuid, taskId } = useParams();
  const { data: signeeList } = useSigneeList(instanceOwnerPartyId, instanceGuid, taskId);
  const { data: authorizedOrganizationDetails } = useAuthorizedOrganizationDetails(
    instanceOwnerPartyId!,
    instanceGuid!,
  );

  const currentUserPartyId = useProfile()?.partyId;

  if (!signeeList || !currentUserPartyId) {
    return [];
  }

  // Get all party IDs the user can sign on behalf of (user + authorized organizations)
  const authorizedPartyIds = [currentUserPartyId];

  // Add organization party IDs if available
  if (authorizedOrganizationDetails?.organizations) {
    authorizedOrganizationDetails.organizations.forEach((org) => {
      authorizedPartyIds.push(org.partyId);
    });
  }

  // Find all signees that match the authorized party IDs
  return signeeList.filter((signee) => authorizedPartyIds.includes(signee.partyId));
}

export function useSigningMutation() {
  const { instanceOwnerPartyId, instanceGuid, taskId } = useParams();
  const selectedLanguage = useCurrentLanguage();
  const queryClient = useQueryClient();
  const currentUserPartyId = useProfile()?.partyId;
  const { data: authorizedOrganizationDetails } = useAuthorizedOrganizationDetails(instanceOwnerPartyId, instanceGuid);

  return useMutation({
    mutationFn: async (onBehalfOf: string | null) => {
      if (!instanceOwnerPartyId || !instanceGuid) {
        throw new Error('Missing instance ID. Cannot sign.');
      }
      const signeePartyId = onBehalfOf
        ? authorizedOrganizationDetails?.organizations.find((org) => org.orgNumber === onBehalfOf)?.partyId
        : currentUserPartyId;

      await httpPost(
        `${appPath}/instances/${instanceOwnerPartyId}/${instanceGuid}/signing/sign?language=${selectedLanguage}`,
        onBehalfOf ? { onBehalfOf } : undefined,
      );

      for (let attempt = 0; attempt < SIGNATURE_POLL_ATTEMPTS; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, SIGNATURE_POLL_INTERVAL_MS));
        const signeeList = await queryClient.fetchQuery({
          ...signingQueries.signeeList(instanceOwnerPartyId, instanceGuid, taskId),
          staleTime: 0,
        });
        if (signeeList.some((signee) => signee.partyId === signeePartyId && signee.hasSigned)) {
          return;
        }
      }

      throw new Error('The signature was accepted but is not visible yet');
    },
    onSuccess: () => {
      // Refetch all queries related to signing to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: signingQueries.all });
    },
  });
}
