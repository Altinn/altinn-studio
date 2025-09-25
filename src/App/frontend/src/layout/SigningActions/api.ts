import { useParams } from 'react-router-dom';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useProfile } from 'src/features/profile/ProfileProvider';
import { useBackendValidationQuery } from 'src/features/validation/backendValidation/backendValidationQuery';
import { signingQueries, useSigneeList } from 'src/layout/SigneeList/api';
import { doPerformAction } from 'src/queries/queries';
import { httpGet } from 'src/utils/network/sharedNetworking';
import { capitalizeName } from 'src/utils/stringHelper';
import { appPath } from 'src/utils/urls/appUrlHelper';

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
  const { refetch, data } = useBackendValidationQuery(
    {
      select: (data) => data?.some((validation) => validation.code === MissingSignaturesErrorCode),
    },
    false,
  );

  return { refetchValidations: refetch, hasMissingSignatures: !!data };
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
  const { instanceOwnerPartyId, instanceGuid } = useParams();
  const selectedLanguage = useCurrentLanguage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (onBehalfOf: string | null) => {
      if (instanceOwnerPartyId && instanceGuid) {
        return doPerformAction(
          instanceOwnerPartyId,
          instanceGuid,
          { action: 'sign', ...(onBehalfOf ? { onBehalfOf } : {}) },
          selectedLanguage,
          queryClient,
        );
      }
    },
    onSuccess: () => {
      // Refetch all queries related to signing to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: signingQueries.all });
    },
  });
}
