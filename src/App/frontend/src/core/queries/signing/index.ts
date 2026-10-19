import { useCallback } from 'react';
import { useParams } from 'react-router';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { doPerformAction } from 'src/core/api-client/app.api';
import { useBackendValidationQuery } from 'src/core/queries/backendValidation';
import { mutationResult } from 'src/core/queries/mutationResult';
import { useSigneeList } from 'src/core/queries/signeeList';
import { signingQueryKeys } from 'src/core/queries/signeeList/signing.queries';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useProfile } from 'src/features/profile/ProfileProvider';
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
  const { data, error, isLoading, isFetching } = useQuery(authorizedOrganizationDetailsQuery(partyId!, instanceGuid!));
  return { data, error, isLoading, isFetching };
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
  const { instanceOwnerPartyId, instanceGuid } = useParams();
  const selectedLanguage = useCurrentLanguage();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (onBehalfOf: string | null) => {
      if (instanceOwnerPartyId && instanceGuid) {
        return doPerformAction(
          instanceOwnerPartyId,
          instanceGuid,
          { action: 'sign', ...(onBehalfOf ? { onBehalfOf } : {}) },
          selectedLanguage,
        );
      }
    },
    onSuccess: () => {
      // Refetch all queries related to signing to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: signingQueryKeys.all });
    },
  });
  const { mutate } = mutation;
  const sign = useCallback(
    (onBehalfOf: string | null, onSigned?: () => void) => mutate(onBehalfOf, { onSuccess: onSigned }),
    [mutate],
  );
  return { ...mutationResult(mutation), mutate: sign };
}
